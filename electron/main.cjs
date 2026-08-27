const { app, BrowserWindow, dialog, shell, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { pathToFileURL } = require('url');
const {
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
} = require('./db.cjs');

// Keep the original profile when productName changes to FIGR.
const profileArgument = process.argv.find(arg => arg.startsWith('--figr-profile-dir='));
const profileDirectory = profileArgument?.slice('--figr-profile-dir='.length);
if (profileDirectory && !path.isAbsolute(profileDirectory)) throw new Error('Profil musí mít absolutní cestu.');
const stableProfile = profileDirectory || path.join(app.getPath('appData'), 'vite_react_shadcn_ts');
fs.mkdirSync(stableProfile, { recursive: true });
app.setPath('userData', stableProfile);
if (profileDirectory) app.setPath('documents', profileDirectory);
const DEV_SERVER_URL = !app.isPackaged ? process.env.VITE_DEV_SERVER_URL : undefined;
const APP_FILE_URL = pathToFileURL(path.join(__dirname, '..', 'dist', 'index.html')).href;
let restoring = false;
const allowedImportFolders = new Set();
const trustedUrl = url => {
  try {
    const parsed = new URL(url);
    return DEV_SERVER_URL ? parsed.origin === new URL(DEV_SERVER_URL).origin : parsed.href.split('#')[0] === APP_FILE_URL;
  } catch { return false; }
};
const handle = (channel, callback) => ipcMain.handle(channel, (event, ...args) => {
  if (event.senderFrame !== event.sender.mainFrame || !trustedUrl(event.senderFrame.url)) throw new Error('Nepovolený zdroj požadavku.');
  if (restoring) throw new Error('Probíhá obnova dat.');
  return callback(event, ...args);
});
const openExternal = url => {
  try {
    if (['https:', 'http:', 'mailto:'].includes(new URL(url).protocol)) void shell.openExternal(url);
  } catch { /* Invalid external URLs are never executed. */ }
};
const attachmentPath = input => {
  if (typeof input !== 'string') throw new Error('Neplatná cesta přílohy.');
  const resolved = path.resolve(input);
  const parent = fs.realpathSync(getAttachmentDir());
  const info = fs.lstatSync(resolved);
  if (!info.isFile() || info.isSymbolicLink() || path.dirname(fs.realpathSync(resolved)) !== parent) throw new Error('Příloha je mimo datovou složku.');
  return resolved;
};
const validateKeys = keys => {
  if (!Array.isArray(keys) || keys.length > 1000 || !keys.every(key => typeof key === 'string' && key.length < 500)) throw new Error('Neplatné klíče úložiště.');
  return keys;
};
const validateEntries = entries => {
  if (!entries || typeof entries !== 'object' || Array.isArray(entries) || !Object.values(entries).every(value => typeof value === 'string')) throw new Error('Neplatná data úložiště.');
  validateKeys(Object.keys(entries));
  return entries;
};
const ALLOWED_IMPORT_EXTENSIONS = new Set(['.csv', '.xlsx', '.xls']);
const MAX_IMPORT_FILE_SIZE = 20 * 1024 * 1024;
const allowedImportFiles = new Set();

function listInvestmentImportFiles(folderPath) {
  if (!folderPath || !allowedImportFolders.has(folderPath) || !fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory() || fs.lstatSync(folderPath).isSymbolicLink()) {
    throw new Error('Sledovaná složka neexistuje.');
  }

  return fs.readdirSync(folderPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && ALLOWED_IMPORT_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => {
      const fullPath = path.join(folderPath, entry.name);
      const stats = fs.statSync(fullPath);
      if (!fs.lstatSync(fullPath).isSymbolicLink() && stats.size <= MAX_IMPORT_FILE_SIZE) allowedImportFiles.add(fullPath);
      return {
        fileName: entry.name,
        fullPath,
        modifiedAt: stats.mtime.toISOString(),
        size: stats.size,
        fingerprint: `${fullPath}:${stats.size}:${stats.mtimeMs}`,
      };
    })
    .filter((entry) => entry.size <= MAX_IMPORT_FILE_SIZE)
    .sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt));
}

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
  if (buffer.byteLength > 20 * 1024 * 1024) throw new Error('Příloha je příliš velká.');
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
    icon: path.join(__dirname, '..', 'dist', 'logos', 'favicon.ico'),
    backgroundColor: '#151c26',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!trustedUrl(url)) { event.preventDefault(); openExternal(url); }
  });
  mainWindow.webContents.on('will-attach-webview', event => event.preventDefault());

  mainWindow.once('ready-to-show', () => {
    if (!profileDirectory || !process.argv.includes('--figr-background')) mainWindow.show();
  });

  if (DEV_SERVER_URL) {
    mainWindow.loadURL(DEV_SERVER_URL);
    return;
  }

  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
app.on('second-instance', () => {
  const window = BrowserWindow.getAllWindows()[0];
  if (window) { if (window.isMinimized()) window.restore(); window.focus(); }
});

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  initDb();
  try { createAutomaticBackupIfNeeded(); } catch (error) { dialog.showErrorBox('Automatická záloha selhala', String(error.message)); }
  const backupTimer = setInterval(() => { try { createAutomaticBackupIfNeeded(); } catch (error) { console.error('Automatic backup failed:', error.message); } }, 60 * 60 * 1000);
  backupTimer.unref();

  handle('storage:getMany', async (_event, keys) => getMany(validateKeys(keys)));
  handle('storage:getManyWithMeta', async (_event, keys) => getManyWithMeta(validateKeys(keys)));
  handle('storage:setMany', async (_event, entries) => setMany(validateEntries(entries)));
  handle('storage:getDbPath', async () => getDbPath());
  handle('backup:list', async () => listBackups());
  handle('backup:create', async () => createBackup('manual'));
  handle('backup:getPaths', async () => ({
    dbPath: getDbPath(),
    backupDir: getBackupDir(),
  }));
  handle('backup:openFolder', async () => shell.openPath(getBackupDir()));
  handle('backup:restore', async (_event, fileName) => {
    const answer = dialog.showMessageBoxSync({ type: 'warning', buttons: ['Zrušit', 'Obnovit zálohu'], defaultId: 0, cancelId: 0, message: 'Obnovit vybranou zálohu?', detail: 'Nejdříve se uloží bezpečnostní kopie současných dat. Aplikace se restartuje.' });
    if (answer !== 1) return { relaunching: false };
    restoring = true;
    try { restoreBackup(fileName); } catch (error) { restoring = false; throw error; }
    closeDb();
    app.relaunch();
    setTimeout(() => app.exit(0), 100);
    return { relaunching: true };
  });
  handle('attachments:saveMany', async (_event, files) => files.map(saveAttachment));
  handle('attachments:open', async (_event, storagePath) => {
    const safePath = attachmentPath(storagePath);
    if (!['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.txt', '.csv', '.xlsx', '.docx'].includes(path.extname(safePath).toLowerCase())) { shell.showItemInFolder(safePath); return ''; }
    return shell.openPath(safePath);
  });
  handle('attachments:remove', async (_event, storagePath) => {
    const safePath = attachmentPath(storagePath);
    const result = await dialog.showMessageBox({ type: 'warning', buttons: ['Zrušit', 'Přesunout do koše'], defaultId: 0, cancelId: 0, message: 'Odstranit přílohu?', detail: path.basename(safePath) });
    if (result.response !== 1) return false;
    await shell.trashItem(safePath);
    return true;
  });
  handle('imports:selectFolder', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Vyberte složku s investičními exporty',
      properties: ['openDirectory'],
    });
    const selected = result.canceled ? null : result.filePaths[0] || null;
    if (selected) allowedImportFolders.add(fs.realpathSync(selected));
    return selected ? fs.realpathSync(selected) : null;
  });
  handle('imports:listFiles', async (_event, folderPath) => listInvestmentImportFiles(folderPath));
  handle('imports:readFile', async (_event, filePath) => {
    const resolvedPath = path.resolve(String(filePath || ''));
    if (!allowedImportFiles.has(resolvedPath)) {
      throw new Error('Soubor není součástí povolené importní složky.');
    }
    const stats = fs.statSync(resolvedPath);
    if (!stats.isFile() || fs.lstatSync(resolvedPath).isSymbolicLink() || stats.size > MAX_IMPORT_FILE_SIZE || !ALLOWED_IMPORT_EXTENSIONS.has(path.extname(resolvedPath).toLowerCase())) {
      throw new Error('Soubor nelze bezpečně importovat.');
    }
    return {
      fileName: path.basename(resolvedPath),
      dataBase64: fs.readFileSync(resolvedPath).toString('base64'),
    };
  });

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
}).catch(error => { dialog.showErrorBox('FIGR nelze spustit', String(error.message)); app.quit(); });
}

app.on('before-quit', () => closeDb());
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
