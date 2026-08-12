import { app, BrowserWindow, ipcMain, globalShortcut, desktopCapturer, screen, clipboard, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let snipWindow: BrowserWindow | null = null;
let isClickThrough = false;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createMainWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  // Position at top-right or right edge comfortably
  const windowWidth = 460;
  const windowHeight = 720;
  const x = screenWidth - windowWidth - 24;
  const y = 36;

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    minWidth: 340,
    minHeight: 180,
    x: x,
    y: y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: true,
    skipTaskbar: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  // Enable Screenshare Protection (Invisible in Zoom, Google Meet, Teams, OBS, Discord)
  mainWindow.setContentProtection(true);

  // Keep on top of full screen apps
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Window events
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerGlobalShortcuts() {
  // Toggle overlay visibility (Alt + Space or Ctrl + Shift + Space)
  globalShortcut.register('Alt+Space', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Boss Key / Panic Hide (Ctrl + Shift + H)
  globalShortcut.register('CommandOrControl+Shift+H', () => {
    if (mainWindow && mainWindow.isVisible()) {
      mainWindow.hide();
    }
  });

  // Screen Snip & Solve (Ctrl + Shift + S)
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      mainWindow.webContents.send('trigger-snip-capture');
    }
  });

  // Fullscreen Instant Snap & Solve (Ctrl + Shift + F)
  globalShortcut.register('CommandOrControl+Shift+F', () => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      mainWindow.webContents.send('trigger-fullscreen-capture');
    }
  });

  // Toggle Live Audio Ear (Ctrl + Shift + A)
  globalShortcut.register('CommandOrControl+Shift+A', () => {
    if (mainWindow) {
      mainWindow.webContents.send('trigger-audio-toggle');
    }
  });

  // Toggle Click-Through HUD (Ctrl + Shift + T)
  globalShortcut.register('CommandOrControl+Shift+T', () => {
    if (!mainWindow) return;
    isClickThrough = !isClickThrough;
    mainWindow.setIgnoreMouseEvents(isClickThrough, { forward: true });
    mainWindow.webContents.send('click-through-changed', isClickThrough);
  });
}

function setupIpcHandlers() {
  // Mouse click-through events
  ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.setIgnoreMouseEvents(ignore, { forward: true, ...options });
    }
  });

  // Content Protection (Anti-Screenshare)
  ipcMain.handle('set-content-protection', (event, enable) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.setContentProtection(enable);
      return true;
    }
    return false;
  });

  ipcMain.handle('get-content-protection-status', (event) => {
    return true; // Window has setContentProtection enabled by default
  });

  // Window Controls
  ipcMain.on('window-minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });

  ipcMain.on('window-hide', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.hide();
  });

  ipcMain.on('window-show', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.show();
  });

  ipcMain.on('window-close', () => {
    app.quit();
  });

  ipcMain.on('set-always-on-top', (event, flag) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.setAlwaysOnTop(flag, 'screen-saver', 1);
  });

  ipcMain.on('resize-window', (event, width, height) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.setSize(Math.round(width), Math.round(height), true);
    }
  });

  // Clipboard
  ipcMain.on('copy-to-clipboard', (_event, text) => {
    clipboard.writeText(text);
  });

  // Open External Link in default browser
  ipcMain.on('open-external', (_event, url) => {
    shell.openExternal(url);
  });

  // Capture Entire Screen / Sources
  ipcMain.handle('capture-screen-sources', async () => {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: Math.round(width * primaryDisplay.scaleFactor),
        height: Math.round(height * primaryDisplay.scaleFactor),
      },
    });

    if (sources.length > 0) {
      return {
        id: sources[0].id,
        name: sources[0].name,
        dataUrl: sources[0].thumbnail.toDataURL(),
        width: width * primaryDisplay.scaleFactor,
        height: height * primaryDisplay.scaleFactor,
      };
    }
    return null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  createMainWindow();
  registerGlobalShortcuts();
  setupIpcHandlers();

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

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
