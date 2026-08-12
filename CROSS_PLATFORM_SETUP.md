# Nexora AI - Cross-Platform OS Guide & Anti-Screenshare Details

This document explains how to set up, run, package, and use **Nexora AI Desktop Overlay** on **Windows**, **macOS**, and **Linux**, as well as how the anti-screenshare protection operates on each OS.

---

## 🖥️ OS Compatibility & Anti-Screenshare Table

| Feature | Windows 10/11 | macOS (Sonoma/Sequoia/Ventura) | Linux (X11 / Wayland) |
|---|---|---|---|
| **Zoom Invisibility** | ✅ 100% Invisible | ✅ 100% Invisible | ✅ Invisible |
| **Google Meet Invisibility** | ✅ 100% Invisible | ✅ 100% Invisible | ✅ Invisible |
| **Teams / Discord Invisibility**| ✅ 100% Invisible | ✅ 100% Invisible | ✅ Invisible |
| **OBS Studio / Streamlabs** | ✅ Excluded from Display Capture | ✅ Excluded from Window/Display Capture | ✅ Excluded |
| **Global Hotkeys** | ✅ Alt+Space, Ctrl+Shift+S, etc. | ✅ Cmd+Shift+Space, Cmd+Shift+S, etc. | ✅ Super/Ctrl+Shift+S |
| **Live Audio Ear** | ✅ System Loopback & Mic | ✅ CoreAudio & Mic | ✅ PulseAudio / PipeWire & Mic |
| **Screen Snipping Tool** | ✅ DesktopCapturer & Direct Crop | ✅ DesktopCapturer & Direct Crop | ✅ DesktopCapturer / Portal |

---

## 🪟 1. Windows Setup (Windows 10 / 11)

### Prerequisites
- Node.js (v18 or v20+ recommended)
- Git

### Running in Dev Mode
```powershell
# In PowerShell / Command Prompt / Terminal
cd "Nexora-Ai Desktop Overlay"
npm install
npm run dev:electron
```

### Packaging Windows Installer (`.exe` & Portable)
```powershell
npm run build:electron
```
The output files will be created in the `release/` folder:
- `release/Nexora AI Overlay Setup 1.0.0.exe` (NSIS Installer)
- `release/Nexora AI Overlay 1.0.0.exe` (Standalone portable single `.exe` file you can put on a USB stick or run without installation)

### How Anti-Screenshare Works on Windows:
On Windows, Electron's `win.setContentProtection(true)` calls the Win32 API:
```c
SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE);
```
This tells the Windows Desktop Window Manager (DWM) compositor to omit this window surface when any application (Zoom, Teams, OBS, Discord) captures the desktop frame.

---

## 🍎 2. macOS Setup (Apple Silicon M1/M2/M3/M4 & Intel)

### Prerequisites
- Node.js (v18+)
- Xcode Command Line Tools (`xcode-select --install`)

### Running in Dev Mode
```bash
cd "Nexora-Ai Desktop Overlay"
npm install
npm run dev:electron
```

### Packaging macOS App (`.dmg` & `.app`)
```bash
npm run build:electron
```
The output file will be in `release/`:
- `release/Nexora AI Overlay-1.0.0.dmg`
- `release/mac-arm64/Nexora AI Overlay.app`

### System Permissions Required on macOS:
1. **Screen Recording:** Open `System Settings > Privacy & Security > Screen Recording` and toggle ON for Nexora AI (needed for screen snipping).
2. **Microphone:** Open `System Settings > Privacy & Security > Microphone` and allow access (needed for Live Interview Ear).

### How Anti-Screenshare Works on macOS:
Electron sets the window's sharing type:
```objc
[window setSharingType:NSWindowSharingNone];
```
This hardware flag instructs Apple's WindowServer and ScreenCaptureKit to exclude the overlay from all screen shares and video recordings.

---

## 🐧 3. Linux Setup (Ubuntu, Debian, Fedora, Arch)

### Prerequisites
- Node.js (v18+)
- `libnotify-bin` (optional for native notifications)

### Running in Dev Mode
```bash
cd "Nexora-Ai Desktop Overlay"
npm install
npm run dev:electron
```

#### If using Wayland compositor:
```bash
npm run dev:electron -- --enable-features=UseOzonePlatform --ozone-platform=wayland
```

### Packaging Linux Binaries (`.AppImage` & `.deb`)
```bash
npm run build:electron
```
The output packages will be in `release/`:
- `release/Nexora AI Overlay-1.0.0.AppImage` (Executable on any Linux distro)
- `release/nexora-ai-overlay_1.0.0_amd64.deb` (Debian/Ubuntu package)

---

## ⚡ Quick Hotkey Reference

- **Alt + Space** / **Ctrl + Shift + Space**: Toggle Overlay Show / Hide
- **Ctrl + Shift + S**: Snip Screen Region & Solve
- **Ctrl + Shift + F**: Fullscreen Instant Screenshot & Solve
- **Ctrl + Shift + A**: Toggle Live Audio Interview Ear
- **Ctrl + Shift + H**: Panic Boss Hide
- **Ctrl + Shift + T**: Toggle Click-Through HUD Pass-Through
- **Ctrl + Shift + C**: Copy Latest Solution Code to Clipboard
