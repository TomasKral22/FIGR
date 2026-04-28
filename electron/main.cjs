const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
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

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1480,
    height: 960,
    minWidth: 1200,
    minHeight: 760,
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
