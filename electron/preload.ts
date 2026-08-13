import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  // Window management
  minimize: () => void;
  hide: () => void;
  show: () => void;
  close: () => void;
  resizeWindow: (width: number, height: number) => void;
  setAlwaysOnTop: (flag: boolean) => void;
  setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => void;
  enterFullscreenSnip: () => Promise<{ x: number; y: number; width: number; height: number } | null>;
  exitFullscreenSnip: () => Promise<void>;
  setSkipTaskbar: (skip: boolean) => void;
  
  // Stealth / Screen Share Protection
  setContentProtection: (enable: boolean) => Promise<boolean>;
  getContentProtectionStatus: () => Promise<boolean>;
  
  // Screen Capture
  captureScreenSources: () => Promise<{
    id: string;
    name: string;
    dataUrl: string;
    width: number;
    height: number;
  } | null>;
  
  // Clipboard & External
  copyToClipboard: (text: string) => void;
  readClipboardContent: () => Promise<{ type: 'image' | 'text'; content: string } | null>;
  openExternal: (url: string) => void;
  
  // Second-Screen Phone Companion
  getCompanionInfo: () => Promise<{
    isRunning: boolean;
    port: number;
    localIp: string;
    fullUrl: string;
    connectedCount: number;
  }>;
  broadcastToCompanion: (type: string, data: any) => void;
  onCompanionAction: (callback: (action: string, payload?: any) => void) => () => void;

  // Audio routing
  linkSystemAudioOutput: () => Promise<boolean>;

  // Event listeners
  onTriggerSnip: (callback: () => void) => () => void;
  onTriggerFullscreenCapture: (callback: () => void) => () => void;
  onTriggerAudioToggle: (callback: () => void) => () => void;
  onTriggerClipboardContent: (callback: (data: { type: 'image' | 'text'; content: string }) => void) => () => void;
  onClickThroughChanged: (callback: (isClickThrough: boolean) => void) => () => void;
}

const api: ElectronAPI = {
  minimize: () => ipcRenderer.send('window-minimize'),
  hide: () => ipcRenderer.send('window-hide'),
  show: () => ipcRenderer.send('window-show'),
  close: () => ipcRenderer.send('window-close'),
  resizeWindow: (width, height) => ipcRenderer.send('resize-window', width, height),
  setAlwaysOnTop: (flag) => ipcRenderer.send('set-always-on-top', flag),
  setIgnoreMouseEvents: (ignore, options) => ipcRenderer.send('set-ignore-mouse-events', ignore, options),
  enterFullscreenSnip: () => ipcRenderer.invoke('enter-fullscreen-snip'),
  exitFullscreenSnip: () => ipcRenderer.invoke('exit-fullscreen-snip'),
  setSkipTaskbar: (skip) => ipcRenderer.send('set-skip-taskbar', skip),
  
  setContentProtection: (enable) => ipcRenderer.invoke('set-content-protection', enable),
  getContentProtectionStatus: () => ipcRenderer.invoke('get-content-protection-status'),
  
  captureScreenSources: () => ipcRenderer.invoke('capture-screen-sources'),
  
  copyToClipboard: (text) => ipcRenderer.send('copy-to-clipboard', text),
  readClipboardContent: () => ipcRenderer.invoke('read-clipboard-content'),
  openExternal: (url) => ipcRenderer.send('open-external', url),

  getCompanionInfo: () => ipcRenderer.invoke('get-companion-info'),
  broadcastToCompanion: (type, data) => ipcRenderer.send('broadcast-to-companion', type, data),
  onCompanionAction: (callback) => {
    const subscription = (_: any, action: string, payload: any) => callback(action, payload);
    ipcRenderer.on('companion-action-received', subscription);
    return () => {
      ipcRenderer.removeListener('companion-action-received', subscription);
    };
  },
  
  linkSystemAudioOutput: () => ipcRenderer.invoke('link-system-audio-output'),
  
  onTriggerSnip: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('trigger-snip-capture', subscription);
    return () => {
      ipcRenderer.removeListener('trigger-snip-capture', subscription);
    };
  },
  onTriggerFullscreenCapture: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('trigger-fullscreen-capture', subscription);
    return () => {
      ipcRenderer.removeListener('trigger-fullscreen-capture', subscription);
    };
  },
  onTriggerAudioToggle: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('trigger-audio-toggle', subscription);
    return () => {
      ipcRenderer.removeListener('trigger-audio-toggle', subscription);
    };
  },
  onTriggerClipboardContent: (callback) => {
    const subscription = (_: any, data: { type: 'image' | 'text'; content: string }) => callback(data);
    ipcRenderer.on('trigger-clipboard-content', subscription);
    return () => {
      ipcRenderer.removeListener('trigger-clipboard-content', subscription);
    };
  },
  onClickThroughChanged: (callback) => {
    const subscription = (_: any, val: boolean) => callback(val);
    ipcRenderer.on('click-through-changed', subscription);
    return () => {
      ipcRenderer.removeListener('click-through-changed', subscription);
    };
  }
};

contextBridge.exposeInMainWorld('electronAPI', api);
