const { contextBridge } = require('electron');
const { ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopApp', {
  platform: process.platform,
  storage: {
    getMany: (keys) => ipcRenderer.invoke('storage:getMany', keys),
    getManyWithMeta: (keys) => ipcRenderer.invoke('storage:getManyWithMeta', keys),
    setMany: (entries) => ipcRenderer.invoke('storage:setMany', entries),
    getDbPath: () => ipcRenderer.invoke('storage:getDbPath'),
  },
  backup: {
    list: () => ipcRenderer.invoke('backup:list'),
    create: () => ipcRenderer.invoke('backup:create'),
    getPaths: () => ipcRenderer.invoke('backup:getPaths'),
    openFolder: () => ipcRenderer.invoke('backup:openFolder'),
    restore: (fileName) => ipcRenderer.invoke('backup:restore', fileName),
  },
  attachments: {
    saveMany: (files) => ipcRenderer.invoke('attachments:saveMany', files),
    open: (storagePath) => ipcRenderer.invoke('attachments:open', storagePath),
    remove: (storagePath) => ipcRenderer.invoke('attachments:remove', storagePath),
  },
  imports: {
    selectFolder: () => ipcRenderer.invoke('imports:selectFolder'),
    listFiles: (folderPath) => ipcRenderer.invoke('imports:listFiles', folderPath),
    readFile: (filePath) => ipcRenderer.invoke('imports:readFile', filePath),
  },
});
