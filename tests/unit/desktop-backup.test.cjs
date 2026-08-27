const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createDatabaseStore } = require('../../electron/db.cjs');

function store() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'figr-backup-test-'));
  return createDatabaseStore({ userDataPath: path.join(root, 'data'), backupDir: path.join(root, 'backups') });
}
test('SQLite backup restores data atomically, preserving a pre-restore copy', () => {
  const db = store();
  try {
    db.setMany({ finance_transactions: '[1]' });
    const backup = db.createBackup();
    db.setMany({ finance_transactions: '[1,2]', extra: 'new' });
    const result = db.restoreBackup(backup.fileName);
    assert.equal(db.getMany(['finance_transactions']).finance_transactions, '[1]');
    assert.equal(db.getMany(['extra']).extra, null);
    assert.ok(result.safetyBackup.fileName.startsWith('pre-restore-'));
    db.restoreBackup(result.safetyBackup.fileName);
    assert.equal(db.getMany(['finance_transactions']).finance_transactions, '[1,2]');
  } finally { db.closeDb(); }
});
test('invalid backup and path traversal do not alter the live database', () => {
  const db = store();
  try {
    db.setMany({ data: 'safe' });
    fs.writeFileSync(path.join(db.getBackupDir(), 'corrupt.sqlite'), 'not a database');
    assert.throws(() => db.restoreBackup('corrupt.sqlite'));
    assert.throws(() => db.restoreBackup('../corrupt.sqlite'));
    assert.equal(db.getMany(['data']).data, 'safe');
  } finally { db.closeDb(); }
});
test('restored cloud cache requires review, and rapid backups have unique filenames', () => {
  const db = store();
  try {
    const key = 'cloud-user:test:__figr_sync_journal_v2';
    db.setMany({ [key]: JSON.stringify({ version: 2, entries: { data: { value: '[1]', base: { value: '[1]', updatedAt: 'v1' }, pending: false } }, recoveries: [] }) });
    const first = db.createBackup(); const second = db.createBackup();
    assert.notEqual(first.fileName, second.fileName);
    db.restoreBackup(first.fileName);
    const entry = JSON.parse(db.getMany([key])[key]).entries.data;
    assert.equal(entry.pending, true); assert.equal(entry.localConflict, true); assert.equal(entry.base, null);
  } finally { db.closeDb(); }
});
