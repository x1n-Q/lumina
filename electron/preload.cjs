const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel, callback) {
  if (typeof callback !== 'function') return () => {};
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('luminaDesktop', {
  openMiniPlayer: () => ipcRenderer.send('mini-player:open'),
  hideMiniPlayer: () => ipcRenderer.send('mini-player:hide'),
  showMainWindow: () => ipcRenderer.send('main-window:show'),
  sendMiniPlayerCommand: (command) => ipcRenderer.send('mini-player:command', command),
  sendPlaybackState: (state) => ipcRenderer.send('playback-state:update', state),
  onMiniPlayerCommand: (callback) => subscribe('mini-player:command', callback),
  onPlaybackState: (callback) => subscribe('playback-state:update', callback)
});
