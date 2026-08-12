# Nexora AI - Production Desktop AI Overlay Assistant 🛡️⚡

An ultra-stealth, undetectable desktop AI overlay assistant (inspired by Cluely, Interview Coder, and Ghost AI). Designed to float seamlessly over any IDE, meeting, browser, or code assessment, capture screen & audio context in real-time, and **remain 100% invisible during screen shares** (Zoom, Google Meet, Microsoft Teams, Discord, OBS Studio, and browser capture).

Featuring **Bring Your Own Key (BYOK)** support for all premier AI providers with zero middleman servers.

---

## 🌟 Key Features

### 1. 🛡️ Screenshare & Recording Invisibility (Anti-Detection)
- Utilizes OS-level DRM compositor exclusion flags (`mainWindow.setContentProtection(true)` in Electron, which maps to `WDA_EXCLUDEFROMCAPTURE` on Windows and `NSWindowSharingNone` on macOS).
- **Zoom / Google Meet / Teams / Discord / OBS:** When you share your full desktop or application window, the Nexora AI overlay is completely invisible to other participants.
- Frameless, transparent acrylic glassmorphism UI with adjustable opacity (20%–100%) and click-through HUD mode.

### 2. 🔑 Bring Your Own Key (BYOK) Multi-Provider Engine
- **Google Gemini**: Gemini 2.5 Flash, Gemini 2.0 Flash Thinking, Gemini 1.5 Pro (Multimodal vision + code).
- **OpenAI**: GPT-4o, GPT-4o-mini, o3-mini, o1 Reasoning.
- **Anthropic Claude**: Claude 3.7 Sonnet, Claude 3.5 Sonnet, Claude 3.5 Haiku.
- **Groq**: Llama 3.3 70B, DeepSeek-R1 Distill (Ultra-low latency < 300ms).
- **DeepSeek**: DeepSeek-V3, DeepSeek-R1.
- **Local Ollama**: 100% offline & private local models (`http://localhost:11434`).
- **Custom / OpenRouter**: OpenAI-compatible custom endpoints.
- *Zero telemetry, zero subscription fee locks — API keys are stored locally and sent directly to official endpoints.*

### 3. 📸 Screen Snip & Visual Problem Solver
- **Interactive Region Snip**: Select any screen coordinate (`Ctrl + Shift + S`) to analyze LeetCode problems, codebases, error stack traces, and system architecture diagrams.
- **Instant Fullscreen Snap**: One-hotkey screenshot (`Ctrl + Shift + F`).
- **Optimal DSA Algorithms**: Generates clean production code in your preferred language (Python, TypeScript, Java, C++, Go, Rust) with Big-O Time and Space Complexity analysis.

### 4. 🎙️ Live Interview Ear (Real-time Audio Copilot)
- Real-time continuous speech recognition capturing interviewer audio and microphone input.
- Automatically identifies spoken questions and formulates concise, professional talking points and STAR-method behavioral responses.
- One-click copy formatted solution to clipboard.

### 5. ⚡ Stealth Teleprompter & Floating Pill HUD
- **Full Copilot Panel**: Rich markdown chat with syntax highlighting, tabs, and model switcher.
- **Compact Pill HUD**: Discreet floating pill on your screen edge with live listening status.
- **Invisible Teleprompter Mode**: Minimal transparent HUD that streams answers line-by-line over your screen.
- **Click-Through Mode**: Pass mouse clicks directly to the underlying IDE/browser.

---

## ⌨️ Global Hotkeys

| Hotkey | Action |
|---|---|
| `Alt + Space` / `Ctrl + Shift + Space` | Toggle Show / Hide Nexora Overlay |
| `Ctrl + Shift + S` | Interactive Screen Region Snip & Solve |
| `Ctrl + Shift + F` | Instant Fullscreen Snap & Solve |
| `Ctrl + Shift + A` | Toggle Real-time Audio Interview Ear |
| `Ctrl + Shift + H` | Panic / Emergency Stealth Hide |
| `Ctrl + Shift + T` | Toggle Click-Through HUD Mode |
| `Ctrl + Shift + C` | Quick Copy Latest Solution to Clipboard |

---

## 🚀 Cross-Platform Running & Building Guide

### 🪟 Windows (Windows 10 / Windows 11)

#### Running in Development:
```powershell
# In PowerShell or Command Prompt
npm install
npm run dev:electron
```

#### Building Windows Executable (.exe & Portable):
```powershell
npm run build:electron
```
The output installers will be in `release/`:
- `release/Nexora AI Overlay Setup.exe` (Full NSIS Installer)
- `release/Nexora AI Overlay Portable.exe` (Single standalone portable executable)

#### How Anti-Screenshare works on Windows:
Electron sets `SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE)`. When sharing screen in Zoom, Teams, Google Meet, or Discord, Windows DWM excludes the window from the video encoder.

---

### 🍎 macOS (Apple Silicon M1/M2/M3/M4 & Intel)

#### Running in Development:
```bash
npm install
npm run dev:electron
```

#### Building macOS App & DMG (.dmg):
```bash
npm run build:electron
```
The output `.dmg` installer will be generated in `release/Nexora AI Overlay-1.0.0.dmg`.

#### Permissions on macOS:
1. **Screen Recording Permission**: When prompted, allow Nexora in `System Settings -> Privacy & Security -> Screen Recording`.
2. **Microphone Permission**: Allow microphone access for the Interview Ear feature.

#### How Anti-Screenshare works on macOS:
Electron sets `NSWindowSharingNone`. The macOS WindowServer omits the overlay from ScreenCaptureKit, Zoom, and QuickTime screen recording.

---

### 🐧 Linux (Ubuntu, Debian, Fedora, Arch)

#### Running in Development:
```bash
npm install
npm run dev:electron
```

#### If using Wayland:
If your desktop environment uses Wayland, launch with:
```bash
npm run dev:electron -- --enable-features=UseOzonePlatform --ozone-platform=wayland
```

#### Building Linux Packages (AppImage & .deb):
```bash
npm run build:electron
```
The output will be in `release/`:
- `release/Nexora AI Overlay-1.0.0.AppImage` (Run on any Linux distribution)
- `release/nexora-ai-overlay_1.0.0_amd64.deb` (Debian/Ubuntu package)

---

## 🔧 Troubleshooting

### Port 5173 Already in Use
If you get `Error: Port 5173 is already in use`, kill any stale process:
- **Windows (PowerShell):**
  ```powershell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess | Stop-Process
  ```
- **macOS / Linux:**
  ```bash
  fuser -k 5173/tcp || kill $(lsof -t -i:5173)
  ```

---

## 🔒 Security & Privacy Guarantee

- **100% Client-Side:** No middleman servers or proxies. All requests are sent directly to official OpenAI, Google Gemini, Anthropic, Groq, or your local Ollama instance.
- **Local Storage:** Keys and prompt histories are saved locally on your device in your user profile.
- **Hardware-Level Screenshare Protection:** Powered by native OS compositor DRM display affinity.
