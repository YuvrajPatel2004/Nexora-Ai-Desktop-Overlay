import { BrowserWindow } from 'electron';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

/**
 * Windows Display Affinity constants
 * WDA_NONE = 0x00: Normal window (captured in screen share)
 * WDA_MONITOR = 0x01: Protected DRM window (renders as BLACK BOX in screen share)
 * WDA_EXCLUDEFROMCAPTURE = 0x11 (17): Completely excluded from capture (TRANSPARENT / INVISIBLE, NO BLACK BOX)
 */
export const WDA_NONE = 0x00000000;
export const WDA_MONITOR = 0x00000001;
export const WDA_EXCLUDEFROMCAPTURE = 0x00000011;

export function applyStealthAffinity(win: BrowserWindow | null, enable: boolean = true): boolean {
  if (!win || win.isDestroyed()) return false;

  try {
    // 1. Standard Electron Content Protection
    win.setContentProtection(enable);
  } catch (err) {
    console.warn('[StealthProtection] Electron setContentProtection warning:', err);
  }

  // 2. Hardware-level Win32 WDA_EXCLUDEFROMCAPTURE (prevents the black box on Windows 10/11)
  if (process.platform === 'win32') {
    try {
      const koffi = require('koffi');
      const user32 = koffi.load('user32.dll');
      const SetWindowDisplayAffinity = user32.func('int __stdcall SetWindowDisplayAffinity(void *hWnd, uint32_t dwAffinity)');

      const hwnd = win.getNativeWindowHandle();
      const affinity = enable ? WDA_EXCLUDEFROMCAPTURE : WDA_NONE;
      
      const success = SetWindowDisplayAffinity(hwnd, affinity);
      console.log(`[StealthProtection] SetWindowDisplayAffinity (WDA_EXCLUDEFROMCAPTURE: 0x${affinity.toString(16)}) -> status: ${success}`);
      return success !== 0;
    } catch (err) {
      console.warn('[StealthProtection] Failed to invoke native Win32 SetWindowDisplayAffinity:', err);
    }
  }

  return true;
}
