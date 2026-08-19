import { app, BrowserWindow, ipcMain, globalShortcut, desktopCapturer, screen, clipboard, shell, session } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { applyStealthAffinity, temporarilyDisableProtection } from './stealthProtection.js';
import { CompanionServer } from './companionServer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Flags for cross-platform system audio loopback & screen capture (Windows, macOS, Linux)
app.commandLine.appendSwitch('enable-features', 'WebRTCPipeWireCapturer,PulseaudioLoopbackForCast');
app.commandLine.appendSwitch('enable-webrtc-pipewire-capturer');
app.commandLine.appendSwitch('enable-usermedia-screen-capturing');
app.commandLine.appendSwitch('allow-http-screen-capture');
app.commandLine.appendSwitch('auto-select-desktop-capture-source', 'Entire screen');

let mainWindow: BrowserWindow | null = null;
let isClickThrough = false;
let companionServer: CompanionServer | null = null;

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
    skipTaskbar: true, // Invisible on Windows Taskbar and Linux panel
    type: process.platform === 'linux' ? 'toolbar' : undefined,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  // Enable Hardware-Level Screenshare Protection (WDA_EXCLUDEFROMCAPTURE: 0x11 on Windows)
  // This eliminates the black rectangle and makes the overlay completely see-through/invisible to Zoom/Meet!
  applyStealthAffinity(mainWindow, true);

mainWindow.once('ready-to-show', () => {
  if (mainWindow) {
    applyStealthAffinity(mainWindow, true);
    // Don't show the window on startup.
    // It can still be opened with your global hotkey.
  }
});

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

function showOverlay() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
  mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  applyStealthAffinity(mainWindow, true);
}

function toggleOverlay() {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    showOverlay();
  }
}

function handleClipboardUpload() {
  if (!mainWindow) return;
  try {
    const image = clipboard.readImage();
    if (!image.isEmpty()) {
      const dataUrl = image.toDataURL();
      showOverlay();
      mainWindow.webContents.send('trigger-clipboard-content', {
        type: 'image',
        content: dataUrl
      });
      return;
    }
    const text = clipboard.readText();
    if (text && text.trim().length > 0) {
      showOverlay();
      mainWindow.webContents.send('trigger-clipboard-content', {
        type: 'text',
        content: text.trim()
      });
      return;
    }
  } catch (err) {
    console.warn('[Clipboard] Error reading clipboard for shortcut:', err);
  }
}

function safeRegisterShortcut(keys: string[], action: () => void, name: string) {
  let registeredCount = 0;
  for (const key of keys) {
    try {
      // If already registered, unregister first to avoid conflicts
      if (globalShortcut.isRegistered(key)) {
        globalShortcut.unregister(key);
      }
      const res = globalShortcut.register(key, action);
      if (res) {
        registeredCount++;
        console.log(`[Hotkeys] Registered '${name}': ${key}`);
      } else {
        console.warn(`[Hotkeys] Key '${key}' for '${name}' in use by OS/app, trying fallbacks...`);
      }
    } catch (e) {
      console.warn(`[Hotkeys] Error registering key '${key}':`, e);
    }
  }
  return registeredCount > 0;
}

function registerGlobalShortcuts() {
  globalShortcut.unregisterAll();

  // 1. Toggle overlay visibility (Multiple fallbacks: Ctrl+Shift+Space, Alt+Space, Alt+N, F9, Alt+`, Ctrl+Alt+N, Alt+\)
  safeRegisterShortcut([
    'CommandOrControl+Shift+Space',
    'Alt+Space',
    'Alt+N',
    'F9',
    'Alt+`',
    'CommandOrControl+Alt+N',
    'Alt+\\'
  ], () => {
    toggleOverlay();
  }, 'Toggle Overlay');

  // 2. Boss Key / Panic Hide (Ctrl+Shift+H, Alt+H, Alt+Q, F12)
  safeRegisterShortcut([
    'CommandOrControl+Shift+H',
    'Alt+H',
    'CommandOrControl+Alt+H',
    'Alt+Q',
    'F12'
  ], () => {
    if (mainWindow && mainWindow.isVisible()) {
      mainWindow.hide();
    }
  }, 'Panic Boss Hide');

  // 3. Screen Snip & Solve (Ctrl+Shift+S, Alt+S, F10, Alt+C)
  safeRegisterShortcut([
    'CommandOrControl+Shift+S',
    'Alt+S',
    'F10',
    'CommandOrControl+Alt+S',
    'Alt+C'
  ], () => {
    showOverlay();
    mainWindow?.webContents.send('trigger-snip-capture');
  }, 'Snip & Solve');

  // 4. Fullscreen Instant Snap & Solve (Ctrl+Shift+F, Alt+F, F11, Alt+V)
  safeRegisterShortcut([
    'CommandOrControl+Shift+F',
    'Alt+F',
    'F11',
    'CommandOrControl+Alt+F',
    'Alt+V'
  ], () => {
    showOverlay();
    mainWindow?.webContents.send('trigger-fullscreen-capture');
  }, 'Fullscreen Snap');

  // 5. Toggle Live Audio Ear (Ctrl+Shift+A, Alt+A, F8)
  safeRegisterShortcut([
    'CommandOrControl+Shift+A',
    'Alt+A',
    'F8',
    'CommandOrControl+Alt+A'
  ], () => {
    if (mainWindow) {
      mainWindow.webContents.send('trigger-audio-toggle');
    }
  }, 'Toggle Audio Ear');

  // 6. Toggle Click-Through HUD (Ctrl+Shift+T, Alt+T, F7)
  safeRegisterShortcut([
    'CommandOrControl+Shift+T',
    'Alt+T',
    'F7',
    'CommandOrControl+Alt+T'
  ], () => {
    if (!mainWindow) return;
    isClickThrough = !isClickThrough;
    mainWindow.setIgnoreMouseEvents(isClickThrough, { forward: true });
    mainWindow.webContents.send('click-through-changed', isClickThrough);
  }, 'Toggle Click-Through');

  // 7. Clipboard Direct Upload / Paste & Solve (Ctrl+Shift+V, Alt+P, F6)
  safeRegisterShortcut([
    'CommandOrControl+Shift+V',
    'Alt+P',
    'F6',
    'CommandOrControl+Alt+V'
  ], () => {
    handleClipboardUpload();
  }, 'Clipboard Upload & Solve');
}

function setupIpcHandlers() {
  // Mouse click-through events
  ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.setIgnoreMouseEvents(ignore, { forward: true, ...options });
    }
  });

  // Read Clipboard Content (Image or Text)
  ipcMain.handle('read-clipboard-content', () => {
    try {
      const image = clipboard.readImage();
      if (!image.isEmpty()) {
        return { type: 'image', content: image.toDataURL() };
      }
      const text = clipboard.readText();
      if (text && text.trim().length > 0) {
        return { type: 'text', content: text.trim() };
      }
    } catch (e) {
      console.warn('[Clipboard] Read error:', e);
    }
    return null;
  });

  // Dynamic Skip Taskbar & Dock concealment
  ipcMain.on('set-skip-taskbar', (event, skip: boolean) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.setSkipTaskbar(skip);
    }
    if (process.platform === 'darwin') {
      if (skip) {
        app.dock?.hide();
      } else {
        app.dock?.show();
      }
    }
  });

  // Fullscreen Snipper bounds management
  let savedWindowBounds: { x: number; y: number; width: number; height: number } | null = null;

  ipcMain.handle('enter-fullscreen-snip', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return null;
    const currentBounds = win.getBounds();
    savedWindowBounds = currentBounds;

    const currentDisplay = screen.getDisplayMatching(currentBounds);
    win.setBounds(currentDisplay.bounds);
    win.setAlwaysOnTop(true, 'screen-saver', 1);
    win.focus();
    return currentDisplay.bounds;
  });

  ipcMain.handle('exit-fullscreen-snip', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    if (savedWindowBounds) {
      win.setBounds(savedWindowBounds);
      savedWindowBounds = null;
    } else {
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: screenWidth } = primaryDisplay.workAreaSize;
      win.setBounds({
        x: screenWidth - 460 - 24,
        y: 36,
        width: 460,
        height: 720,
      });
    }
    win.setAlwaysOnTop(true, 'screen-saver', 1);
    win.focus();
  });

  // Content Protection (Anti-Screenshare) with WDA_EXCLUDEFROMCAPTURE support
  ipcMain.handle('set-content-protection', (event, enable) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      return applyStealthAffinity(win, enable);
    }
    return false;
  });

  ipcMain.handle('get-content-protection-status', (_event) => {
    return true; // Window has WDA_EXCLUDEFROMCAPTURE enabled by default
  });

  // Window Controls - Minimize hides gracefully to background service
  ipcMain.on('window-minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.hide();
  });

  ipcMain.on('window-hide', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.hide();
  });

  ipcMain.on('window-show', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.show();
      applyStealthAffinity(win, true);
    }
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
    // Temporarily disable content protection so our own window doesn't
    // interfere with the screen capture (prevents blank/black captures)
    const reEnableProtection = temporarilyDisableProtection(mainWindow);
    
    // Temporarily hide window from capture by setting opacity to 0
    const wasVisible = mainWindow?.isVisible() ?? true;
    if (mainWindow && wasVisible) {
      mainWindow.setOpacity(0);
    }

    try {
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.size;
      const scale = primaryDisplay.scaleFactor || 1;

      // Small delay to let the OS compositor update after opacity change
      await new Promise(resolve => setTimeout(resolve, 80));

      const captureWithSize = async (w: number, h: number) => {
        const sources = await desktopCapturer.getSources({
          types: ['screen'],
          thumbnailSize: { width: w, height: h },
        });

        const screenSource = sources.find(s => s.id.startsWith('screen:')) || sources[0];
        if (screenSource) {
          const dataUrl = screenSource.thumbnail.toDataURL();
          // Verify the thumbnail isn't empty (> ~100 bytes base64 header)
          if (dataUrl && dataUrl.length > 200) {
            return {
              id: screenSource.id,
              name: screenSource.name,
              dataUrl,
              width: w,
              height: h,
            };
          }
        }
        return null;
      };

      // Attempt 1: Full resolution with scale
      let result = await captureWithSize(
        Math.round(width * scale),
        Math.round(height * scale)
      );

      // Attempt 2: Try without scale factor if first attempt returned empty
      if (!result) {
        console.warn('[ScreenCapture] First attempt returned empty, retrying without scale...');
        result = await captureWithSize(width, height);
      }

      // Attempt 3: Try with windows included
      if (!result) {
        console.warn('[ScreenCapture] Second attempt failed, trying with window sources...');
        const sources = await desktopCapturer.getSources({
          types: ['screen', 'window'],
          thumbnailSize: { width: width, height: height },
        });
        const anySource = sources.find(s => {
          const url = s.thumbnail.toDataURL();
          return url && url.length > 200;
        });
        if (anySource) {
          result = {
            id: anySource.id,
            name: anySource.name,
            dataUrl: anySource.thumbnail.toDataURL(),
            width,
            height,
          };
        }
      }

      return result;
    } catch (err) {
      console.warn('[ScreenCapture] Electron capture error:', err);
      return null;
    } finally {
      // Restore window opacity
      if (mainWindow && wasVisible) {
        mainWindow.setOpacity(1);
      }
      // Re-enable protection after capture
      reEnableProtection();
    }
  });

  // Feature B: Second-Screen Mobile Companion IPC
  ipcMain.handle('get-companion-info', () => {
    if (companionServer) {
      return companionServer.getInfo();
    }
    return {
      isRunning: false,
      port: 4123,
      localIp: '127.0.0.1',
      fullUrl: 'http://127.0.0.1:4123',
      connectedCount: 0
    };
  });

  // Cross-platform System Audio Loopback IPC
  ipcMain.handle('link-system-audio-output', async () => {
    if (process.platform === 'linux') {
      try {
        const { exec } = await import('child_process');
        exec('pw-link -o', (err, stdout) => {
          if (err || !stdout) return;
          const monitors = stdout.split('\n').filter(l => l.includes(':monitor_'));
          exec('pw-link -i', (err2, stdout2) => {
            if (err2 || !stdout2) return;
            const chromiumInputs = stdout2.split('\n').filter(l => 
              l.toLowerCase().includes('chromium:input_') || 
              l.toLowerCase().includes('nexora:input_') ||
              l.toLowerCase().includes('electron:input_')
            );
            for (const mon of monitors) {
              for (const inp of chromiumInputs) {
                if (
                  (mon.includes('_FL') && inp.includes('_FL')) || 
                  (mon.includes('_FR') && inp.includes('_FR')) || 
                  (mon.includes('_MONO') && inp.includes('_MONO')) ||
                  (!mon.includes('_') && !inp.includes('_'))
                ) {
                  exec(`pw-link "${mon.trim()}" "${inp.trim()}"`, () => {});
                }
              }
            }
          });
        });
        return true;
      } catch (e) {
        console.warn('System audio link warning:', e);
      }
    }
    return true;
  });
}

// App lifecycle
app.whenReady().then(async () => {
  // Hide macOS Dock icon & set accessory activation policy for zero dock footprint
  if (process.platform === 'darwin') {
    app.dock?.hide();
    try {
      if ((app as any).setActivationPolicy) {
        (app as any).setActivationPolicy('accessory');
      }
    } catch (e) {
      console.warn('[MacOS] Could not set activation policy:', e);
    }
  }

  // Setup Cross-Platform Screen & Audio Loopback handler for Windows, macOS, and Linux
  session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
    desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
      callback({ video: sources[0], audio: 'loopback' });
    }).catch(() => {
      callback({ video: undefined, audio: 'loopback' });
    });
  });

  createMainWindow();
  registerGlobalShortcuts();
  setupIpcHandlers();

  // Start Second-Screen Mobile Companion Server
  try {
    companionServer = new CompanionServer(4123);
    companionServer.setOnAction((action, payload) => {
      if (action === 'panic-hide') {
        if (mainWindow?.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow?.show();
        }
      } else if (action === 'snip') {
        mainWindow?.show();
        mainWindow?.webContents.send('trigger-snip-capture');
      } else if (action === 'audio-toggle') {
        mainWindow?.webContents.send('trigger-audio-toggle');
      }
      mainWindow?.webContents.send('companion-action-received', action, payload);
    });
    await companionServer.start();
  } catch (err) {
    console.warn('[CompanionServer] Failed to start companion server:', err);
  }

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
  companionServer?.stop();
});

