const { app, BrowserWindow, dialog, ipcMain, screen } = require('electron');
const fs = require('fs');
const path = require('path');
const { startAudioServer, stopAudioServer } = require('../server.cjs');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.setName('Lumina');

let mainWindow = null;
let miniPlayerWindow = null;
let audioEnginePort = null;
let latestPlaybackState = {
  track: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0
};

function sendPlaybackStateToMiniPlayer() {
  if (!miniPlayerWindow || miniPlayerWindow.isDestroyed()) return;
  miniPlayerWindow.webContents.send('playback-state:update', latestPlaybackState);
}

function writeStartupLog(message, error) {
  const details = [
    `[${new Date().toISOString()}] ${message}`,
    error?.stack || error?.message || String(error || '')
  ].filter(Boolean).join('\n');

  try {
    fs.mkdirSync(app.getPath('userData'), { recursive: true });
    fs.appendFileSync(path.join(app.getPath('userData'), 'startup-error.log'), `${details}\n\n`);
  } catch (logError) {
    console.error('Could not write startup diagnostics:', logError.message);
  }
  console.error(details);
}

function showStartupError(message, error) {
  writeStartupLog(message, error);
  dialog.showErrorBox(
    'Lumina could not start',
    `${message}\n\nLumina does not require Node.js. Restart the app, then reinstall it if the problem continues.\n\nDiagnostics were saved to:\n${path.join(app.getPath('userData'), 'startup-error.log')}`
  );
}

function createWindow(backendPort = audioEnginePort) {
  const win = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'Lumina',
    icon: path.join(__dirname, '../public/lumina-logo.png'),
    backgroundColor: '#0a0b0e',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  mainWindow = win;

  const isDev = process.env.NODE_ENV === 'development';
  const query = `backendPort=${encodeURIComponent(backendPort)}`;
  if (isDev) {
    win.loadURL(`http://localhost:5173/?${query}`);
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'), {
      query: { backendPort: String(backendPort) }
    });
  }

  win.webContents.on('did-fail-load', (_event, code, description) => {
    writeStartupLog(`The Lumina interface failed to load (${code}: ${description}).`);
  });

  win.on('closed', () => {
    mainWindow = null;
    if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
      miniPlayerWindow.destroy();
      miniPlayerWindow = null;
    }
  });

  return win;
}

function createMiniPlayerWindow() {
  if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
    miniPlayerWindow.showInactive();
    sendPlaybackStateToMiniPlayer();
    return miniPlayerWindow;
  }

  const width = 430;
  const height = 88;
  const { workArea } = screen.getPrimaryDisplay();
  miniPlayerWindow = new BrowserWindow({
    width,
    height,
    x: Math.round(workArea.x + (workArea.width - width) / 2),
    y: workArea.y + 14,
    minWidth: width,
    minHeight: height,
    maxWidth: width,
    maxHeight: height,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: true,
    title: 'Lumina Mini Player',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  miniPlayerWindow.setAlwaysOnTop(true, 'floating');
  miniPlayerWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  miniPlayerWindow.loadFile(path.join(__dirname, 'mini-player.html'));
  miniPlayerWindow.once('ready-to-show', () => {
    miniPlayerWindow.showInactive();
    sendPlaybackStateToMiniPlayer();
  });
  miniPlayerWindow.webContents.on('did-finish-load', sendPlaybackStateToMiniPlayer);
  miniPlayerWindow.on('closed', () => {
    miniPlayerWindow = null;
  });

  return miniPlayerWindow;
}

ipcMain.on('mini-player:open', (event) => {
  if (!mainWindow || event.sender.id !== mainWindow.webContents.id) return;
  createMiniPlayerWindow();
});

ipcMain.on('mini-player:hide', (event) => {
  if (!miniPlayerWindow || event.sender.id !== miniPlayerWindow.webContents.id) return;
  miniPlayerWindow.hide();
});

ipcMain.on('main-window:show', (event) => {
  if (!miniPlayerWindow || event.sender.id !== miniPlayerWindow.webContents.id || !mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});

ipcMain.on('mini-player:command', (event, command) => {
  if (!miniPlayerWindow || event.sender.id !== miniPlayerWindow.webContents.id || !mainWindow) return;
  if (!['previous', 'toggle', 'next'].includes(command)) return;
  mainWindow.webContents.send('mini-player:command', command);
});

ipcMain.on('playback-state:update', (event, state) => {
  if (!mainWindow || event.sender.id !== mainWindow.webContents.id || !state) return;
  latestPlaybackState = {
    track: state.track && {
      id: String(state.track.id || ''),
      title: String(state.track.title || ''),
      artist: String(state.track.artist || ''),
      cover: String(state.track.cover || '')
    },
    isPlaying: Boolean(state.isPlaying),
    currentTime: Math.max(0, Number(state.currentTime) || 0),
    duration: Math.max(0, Number(state.duration) || 0)
  };
  sendPlaybackStateToMiniPlayer();
});

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });
}

app.whenReady().then(async () => {
  if (!hasSingleInstanceLock) return;

  try {
    app.setAppUserModelId('com.x1nq.lumina');

    if (app.isPackaged) {
      const bundledRuntimePath = path.join(
        process.resourcesPath,
        'bin',
        process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
      );
      if (!fs.existsSync(bundledRuntimePath)) {
        throw new Error(
          `The bundled audio helper is missing. Windows Security or another antivirus may have quarantined it. Reinstall Lumina and allow the file if prompted. Missing file: ${bundledRuntimePath}`
        );
      }
      process.env.LUMINA_YTDLP_PATH = bundledRuntimePath;
    }

    const audioServer = await startAudioServer(0, '127.0.0.1', {
      cacheDirectory: path.join(app.getPath('userData'), 'audio-cache')
    });
    const address = audioServer.address();
    audioEnginePort = typeof address === 'object' && address ? address.port : null;
    if (!audioEnginePort) throw new Error('The local audio engine did not provide a usable port.');
    createWindow(audioEnginePort);
  } catch (error) {
    showStartupError(`The local audio engine failed to start: ${error.message}`, error);
    app.quit();
    return;
  }

  app.on('activate', () => {
    if (!mainWindow) createWindow(audioEnginePort);
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
