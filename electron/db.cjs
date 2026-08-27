const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

function createDatabaseStore({ userDataPath, backupDir: configuredBackupDir }) {
if (!path.isAbsolute(userDataPath) || !path.isAbsolute(configuredBackupDir)) throw new Error('Datové cesty musí být absolutní.');

let db;
const AUTO_BACKUP_KEY = 'system_last_auto_backup_at';
const MAX_AUTO_BACKUPS = 14;

function getDbPath() {
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  return path.join(userDataPath, 'finance-app.sqlite');
}

function initDb() {
  if (db) return db;

  db = new Database(getDbPath());
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_storage (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  return db;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

function getBackupDir() {
  const backupDir = configuredBackupDir;
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
}

function formatStamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function mapBackupFile(filePath) {
  const stats = fs.statSync(filePath);
  const fileName = path.basename(filePath);
  return {
    fileName,
    fullPath: filePath,
    createdAt: stats.birthtime.toISOString(),
    size: stats.size,
    kind: fileName.startsWith('auto-') ? 'auto' : 'manual',
  };
}

function listBackups() {
  const backupDir = getBackupDir();
  return fs
    .readdirSync(backupDir)
    .filter((fileName) => fileName.endsWith('.sqlite') && fs.lstatSync(path.join(backupDir, fileName)).isFile() && !fs.lstatSync(path.join(backupDir, fileName)).isSymbolicLink())
    .map((fileName) => mapBackupFile(path.join(backupDir, fileName)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function checkpointDb() {
  const database = initDb();
  database.pragma('wal_checkpoint(TRUNCATE)');
}

function createBackup(kind = 'manual') {
  if (!['auto', 'manual', 'pre-restore'].includes(kind)) throw new Error('Neplatný typ zálohy.');
  const database = initDb();
  checkpointDb();

  const backupDir = getBackupDir();
  const backupPath = path.join(backupDir, `${kind}-${formatStamp()}-${crypto.randomUUID().slice(0, 8)}.sqlite`);
  const escapedPath = backupPath.replace(/'/g, "''");

  database.exec(`VACUUM INTO '${escapedPath}'`);
  return mapBackupFile(backupPath);
}

function pruneAutoBackups() {
  const autoBackups = listBackups().filter((backup) => backup.kind === 'auto');
  autoBackups.slice(MAX_AUTO_BACKUPS).forEach((backup) => {
    if (path.dirname(backup.fullPath) === getBackupDir() && fs.lstatSync(backup.fullPath).isFile() && !fs.lstatSync(backup.fullPath).isSymbolicLink()) {
      fs.unlinkSync(backup.fullPath);
    }
  });
}

function getMany(keys) {
  const database = initDb();
  const stmt = database.prepare('SELECT key, value FROM app_storage WHERE key = ?');
  const result = {};

  for (const key of keys) {
    const row = stmt.get(key);
    result[key] = row ? row.value : null;
  }

  return result;
}

function getManyWithMeta(keys) {
  const database = initDb();
  const stmt = database.prepare('SELECT key, value, updated_at FROM app_storage WHERE key = ?');
  const result = {};

  for (const key of keys) {
    const row = stmt.get(key);
    result[key] = row
      ? { value: row.value, updatedAt: row.updated_at }
      : { value: null, updatedAt: null };
  }

  return result;
}

function setMany(entries) {
  const database = initDb();
  const stmt = database.prepare(`
    INSERT INTO app_storage (key, value, updated_at)
    VALUES (@key, @value, @updated_at)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `);
  const transaction = database.transaction((items) => {
    const updatedAt = new Date().toISOString();
    for (const [key, value] of Object.entries(items)) {
      stmt.run({ key, value, updated_at: updatedAt });
    }
  });

  transaction(entries);
  return true;
}

function createAutomaticBackupIfNeeded() {
  const database = initDb();
  const row = database
    .prepare('SELECT value FROM app_storage WHERE key = ?')
    .get(AUTO_BACKUP_KEY);

  const lastAutoBackupAt = row?.value ? new Date(row.value) : null;
  const now = new Date();
  const hoursSinceLastBackup = lastAutoBackupAt
    ? (now.getTime() - lastAutoBackupAt.getTime()) / (1000 * 60 * 60)
    : Number.POSITIVE_INFINITY;

  if (hoursSinceLastBackup < 24) {
    return null;
  }

  const backup = createBackup('auto');
  setMany({ [AUTO_BACKUP_KEY]: now.toISOString() });
  pruneAutoBackups();
  return backup;
}

function restoreBackup(fileName) {
  if (typeof fileName !== 'string' || path.basename(fileName) !== fileName || !fileName.endsWith('.sqlite')) {
    throw new Error('Neplatný název zálohy.');
  }
  const backupPath = path.join(getBackupDir(), fileName);
  const info = fs.lstatSync(backupPath);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error('Záloha musí být běžný soubor.');
  let source;
  let rows;
  try {
    source = new Database(backupPath, { readonly: true, fileMustExist: true });
    if (source.pragma('quick_check', { simple: true }) !== 'ok') throw new Error('Záloha je poškozená.');
    rows = source.prepare('SELECT key, value, updated_at FROM app_storage').all();
    if (!rows.every(row => typeof row.key === 'string' && typeof row.value === 'string' && typeof row.updated_at === 'string')) {
      throw new Error('Záloha obsahuje neplatná data.');
    }
    for (const row of rows) {
      if (row.key.endsWith(':__figr_sync_journal_v2')) {
        const journal = JSON.parse(row.value);
        if (journal?.version !== 2 || !journal.entries || !Array.isArray(journal.recoveries)) throw new Error('Neplatná synchronizační záloha.');
        for (const entry of Object.values(journal.entries)) {
          if (entry.value !== null) {
            entry.pending = true;
            entry.base = null;
            // A restored snapshot needs explicit review before replacing a different cloud copy.
            entry.localConflict = true;
            delete entry.conflict;
          }
        }
        row.value = JSON.stringify(journal);
      }
    }
  } finally { source?.close(); }

  // Both source validation and a safety snapshot must succeed before changing any live row.
  const safetyBackup = createBackup('pre-restore');
  const database = initDb();
  const insert = database.prepare('INSERT INTO app_storage (key, value, updated_at) VALUES (@key, @value, @updated_at)');
  database.transaction(() => {
    database.prepare('DELETE FROM app_storage').run();
    for (const row of rows) insert.run(row);
  })();
  return { safetyBackup };
}

return {
  closeDb,
  createAutomaticBackupIfNeeded,
  createBackup,
  getBackupDir,
  getDbPath,
  getMany,
  getManyWithMeta,
  initDb,
  listBackups,
  restoreBackup,
  setMany,
};
}

let defaultStore;
const currentStore = () => {
  if (!defaultStore) {
    const { app } = require('electron');
    defaultStore = createDatabaseStore({ userDataPath: app.getPath('userData'), backupDir: path.join(app.getPath('documents'), 'FIGR', 'Backups') });
  }
  return defaultStore;
};
module.exports = { createDatabaseStore };
for (const name of ['closeDb', 'createAutomaticBackupIfNeeded', 'createBackup', 'getBackupDir', 'getDbPath', 'getMany', 'getManyWithMeta', 'initDb', 'listBackups', 'restoreBackup', 'setMany']) {
  module.exports[name] = (...args) => currentStore()[name](...args);
}
