const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { pathToFileURL } = require('url');
const {
  createAutomaticBackupIfNeeded,
  createBackup,
  getBackupDir,
  getDbPath,
  getMany,
  initDb,
  listBackups,
  restoreBackup,
  setMany,
} = require('./db.cjs');

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

function getAttachmentDir() {
  const attachmentsDir = path.join(app.getPath('userData'), 'attachments');
  if (!fs.existsSync(attachmentsDir)) {
    fs.mkdirSync(attachmentsDir, { recursive: true });
  }
  return attachmentsDir;
}

function sanitizeFileName(fileName) {
  return String(fileName || 'priloha')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function saveAttachment(file) {
  const matches = String(file.dataUrl || '').match(/^data:(.+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Neplatný obsah přílohy.');
  }

  const [, mimeType, base64Payload] = matches;
  const buffer = Buffer.from(base64Payload, 'base64');
  const extension = path.extname(file.fileName || '') || `.${String(mimeType).split('/')[1] || 'bin'}`;
  const safeFileName = sanitizeFileName(path.basename(file.fileName || `priloha${extension}`));
  const finalName = `${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;
  const storagePath = path.join(getAttachmentDir(), finalName);

  fs.writeFileSync(storagePath, buffer);

  return {
    id: crypto.randomUUID(),
    fileName: safeFileName,
    mimeType,
    size: buffer.byteLength,
    storagePath,
    previewUrl: pathToFileURL(storagePath).href,
    createdAt: new Date().toISOString(),
    ocrStatus: 'idle',
  };
}

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1480,
    height: 960,
    minWidth: 1200,
    minHeight: 760,
    icon: path.join(__dirname, '..', 'public', 'logos', 'favicon.ico'),
    backgroundColor: '#151c26',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (DEV_SERVER_URL) {
    mainWindow.loadURL(DEV_SERVER_URL);
    return;
  }

  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(() => {
  initDb();
  createAutomaticBackupIfNeeded();

  ipcMain.handle('storage:getMany', async (_event, keys) => getMany(keys));
  ipcMain.handle('storage:setMany', async (_event, entries) => setMany(entries));
  ipcMain.handle('storage:getDbPath', async () => getDbPath());
  ipcMain.handle('backup:list', async () => listBackups());
  ipcMain.handle('backup:create', async () => createBackup('manual'));
  ipcMain.handle('backup:getPaths', async () => ({
    dbPath: getDbPath(),
    backupDir: getBackupDir(),
  }));
  ipcMain.handle('backup:openFolder', async () => shell.openPath(getBackupDir()));
  ipcMain.handle('backup:restore', async (_event, fileName) => {
    restoreBackup(fileName);
    app.relaunch();
    setTimeout(() => app.exit(0), 300);
    return { relaunching: true };
  });
  ipcMain.handle('attachments:saveMany', async (_event, files) => files.map(saveAttachment));
  ipcMain.handle('attachments:open', async (_event, storagePath) => shell.openPath(storagePath));
  ipcMain.handle('attachments:remove', async (_event, storagePath) => {
    if (storagePath && fs.existsSync(storagePath)) {
      fs.unlinkSync(storagePath);
    }
    return true;
  });

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
