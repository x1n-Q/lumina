const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { startAudioServer, stopAudioServer } = require('../server.cjs');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.setName('Lumina');

function createWindow() {
  const win = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'Lumina',
    backgroundColor: '#0a0b0e',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(async () => {
  try {
    await startAudioServer(undefined, undefined, {
      cacheDirectory: path.join(app.getPath('userData'), 'audio-cache')
    });
    createWindow();
  } catch (error) {
    dialog.showErrorBox(
      'Lumina could not start',
      `The local audio engine failed to start:\n\n${error.message}`
    );
    app.quit();
    return;
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  stopAudioServer().catch((error) => {
    console.error('Audio engine shutdown error:', error.message);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
