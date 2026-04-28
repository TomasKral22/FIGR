const { contextBridge } = require('electron');
const { ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopApp', {
  platform: process.platform,
  storage: {
    getMany: (keys) => ipcRenderer.invoke('storage:getMany', keys),
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
});
