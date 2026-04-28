const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let db;
const AUTO_BACKUP_KEY = 'system_last_auto_backup_at';
const MAX_AUTO_BACKUPS = 14;

function getDbPath() {
  const userDataPath = app.getPath('userData');
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
  const backupDir = path.join(app.getPath('documents'), 'FIGR', 'Backups');
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
    .filter((fileName) => fileName.endsWith('.sqlite'))
    .map((fileName) => mapBackupFile(path.join(backupDir, fileName)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function checkpointDb() {
  const database = initDb();
  database.pragma('wal_checkpoint(TRUNCATE)');
}

function createBackup(kind = 'manual') {
  const database = initDb();
  checkpointDb();

  const backupDir = getBackupDir();
  const backupPath = path.join(backupDir, `${kind}-${formatStamp()}.sqlite`);
  const escapedPath = backupPath.replace(/'/g, "''");

  database.exec(`VACUUM INTO '${escapedPath}'`);
  return mapBackupFile(backupPath);
}

function pruneAutoBackups() {
  const autoBackups = listBackups().filter((backup) => backup.kind === 'auto');
  autoBackups.slice(MAX_AUTO_BACKUPS).forEach((backup) => {
    if (fs.existsSync(backup.fullPath)) {
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
  const backupPath = path.join(getBackupDir(), path.basename(fileName));
  if (!fs.existsSync(backupPath)) {
    throw new Error('Zaloha nebyla nalezena.');
  }

  closeDb();

  const dbPath = getDbPath();
  const walPath = `${dbPath}-wal`;
  const shmPath = `${dbPath}-shm`;

  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

  fs.copyFileSync(backupPath, dbPath);
  initDb();
  return true;
}

module.exports = {
  closeDb,
  createAutomaticBackupIfNeeded,
  createBackup,
  getBackupDir,
  getDbPath,
  getMany,
  initDb,
  listBackups,
  restoreBackup,
  setMany,
};
