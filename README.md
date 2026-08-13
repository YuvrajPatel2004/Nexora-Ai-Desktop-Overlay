# Nexora AI - Undetectable Desktop AI Overlay & Live Interview Copilot 🛡️⚡

[![Release](https://img.shields.io/badge/Release-v1.2.0-cyan?style=for-the-badge&logo=github)](https://github.com/YuvrajPatel2004/Nexora-Ai-Desktop-Overlay/releases)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-emerald?style=for-the-badge)](https://github.com/YuvrajPatel2004/Nexora-Ai-Desktop-Overlay/releases)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![BYOK](https://img.shields.io/badge/BYOK-Gemini%20%7C%20OpenAI%20%7C%20Claude%20%7C%20Groq%20%7C%20DeepSeek%20%7C%20Ollama-purple?style=for-the-badge)](https://github.com/YuvrajPatel2004/Nexora-Ai-Desktop-Overlay)

An ultra-stealth, production-grade desktop AI overlay assistant (inspired by Cluely, Interview Coder, and Ghost AI). Designed to float seamlessly over any IDE, meeting, browser, or coding assessment, capture screen and audio context in real-time, and **remain 100% invisible during screen shares** (Zoom, Google Meet, Microsoft Teams, Discord, and OBS Studio).

Featuring **Bring Your Own Key (BYOK)** with 100% local client execution — **zero third-party middleman servers**.

---

## 📦 Downloads (Pre-built Binaries)

Download the latest version from the [**GitHub Releases Page**](https://github.com/YuvrajPatel2004/Nexora-Ai-Desktop-Overlay/releases):

| Operating System | Download Link | Package Format |
|---|---|---|
| **🪟 Windows 10 / 11** | [**Download Windows Installer**](https://github.com/YuvrajPatel2004/Nexora-Ai-Desktop-Overlay/releases/latest) | `.exe` (NSIS Installer) & Portable |
| **🍎 macOS (Apple Silicon & Intel)** | [**Download macOS DMG**](https://github.com/YuvrajPatel2004/Nexora-Ai-Desktop-Overlay/releases/latest) | `.dmg` (Universal Binary) & `.zip` |
| **🐧 Linux (Fedora, Ubuntu, Debian, Arch)** | [**Download Linux AppImage**](https://github.com/YuvrajPatel2004/Nexora-Ai-Desktop-Overlay/releases/latest) | `.AppImage` (Executable), `.deb`, `.rpm` |

---

## 🌟 Key Features

### 1. 🛡️ Screenshare Invisibility (Hardware DRM Level)
- Uses native `WDA_EXCLUDEFROMCAPTURE` (`0x11`) on Windows and `NSWindowSharingNone` on macOS.
- **Eliminates the black rectangle** during screen sharing. Video meeting participants see straight through Nexora to whatever IDE or browser window is behind it.
- On Linux (Wayland / X11), sharing a specific window (e.g. VS Code or Chrome) keeps Nexora completely hidden.

### 2. 📱 Second-Screen Phone / iPad Companion (QR Code Sync)
- **Local Wi-Fi Pairing**: Click the **Radio icon (📱)** in the header to open an encrypted SVG QR Code.
- **Stealth Mobile HUD**: Scan the QR code with your phone or tablet on the same Wi-Fi to open an AMOLED stealth web HUD mirroring live DSA code solutions, speech transcripts, and remote controls (**Boss Panic Hide**, **Remote Screen Snip**).

### 3. 📄 Personal Resume & Knowledge Base RAG Engine
- **First-Person AI Persona**: Upload your `.txt` or `.md` resume, past project metrics, system architecture diagrams, and STAR behavioral stories.
- **Local BM25 / TF-IDF Retrieval**: When you answer questions, the AI automatically retrieves your real career history and cites your **actual past companies, scale numbers (QPS, users), and architecture**.
- Includes an interactive **RAG Query Simulator** to test question retrieval.

### 4. 🎙️ Live Interview Ear (Lossless 16kHz PCM WAV Audio Engine)
- **Dual-Capture Mixer**: Simultaneously captures your physical microphone **AND** the interviewer's voice playing through your **headphones, earbuds, or speakers** across Windows (WASAPI Loopback), macOS (CoreAudio), and Linux (PipeWire / PulseAudio).
- **In-Engine WAV Encoder**: Replaces unstable browser WebM chunks with clean 16kHz PCM WAV audio for flawless transcription with Google Gemini 2.0 Flash, Groq Whisper (`whisper-large-v3`), and OpenAI Whisper (`whisper-1`).
- **Hallucination Shield**: Automatically suppresses silent phantom hallucinations (`"Thank you."`, `"Thanks for watching."`).

### 5. 📺 HUD Teleprompter with Eye-Contact Horizon Guide
- **Webcam Reading Horizon Line**: Position the teleprompter directly under your webcam to maintain natural eye contact while reading answers.
- **Integrated Live Ear**: Transcribed interview questions auto-stream their AI answer directly into the auto-scroller with adjustable speed controls (`0.5x`, `1.0x`, `1.5x`, `2.0x`).
- **1-Click Interview Presets**: Instant scripts for **Candidate Intro**, **STAR Outage Incident Response**, and **System Design Blueprints**.

### 6. 📸 Interactive Crosshair Screen Snipper & Visual Solver
- Crop any problem on screen with **<kbd>F10</kbd>** or **<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd>**.
- Specialized tabs for **LeetCode / DSA** (Optimal code + Big-O Time/Space Complexity), **System Design**, **Code Debugger**, and **Exam / MCQ Solver**.

### 7. 📖 DSA Patterns & Behavioral Cheat Sheets
- Built-in slide-out drawer (<kbd>Book icon 📖</kbd>) with pre-built cheat sheets for **Sliding Window**, **Monotonic Stack**, **Topological Sort**, **Union-Find**, **Rate Limiters**, **Distributed Caching**, and **STAR Behavioral Stories**.

### 8. 🕶️ Silent Background Service & Zero Taskbar / Dock Footprint
- Runs quietly as a background helper without appearing in the **Windows Taskbar**, **macOS Dock**, or **Linux window list** (`skipTaskbar` + `LSUIElement`).
- Summon or hide instantly using global shortcuts (`Alt+Space`, `Ctrl+Shift+Space`, `Alt+N`, `F9`) or via the Phone Companion app.
- Full monitor snipping (`F10` / `Ctrl+Shift+S`) freezes and covers your entire desktop display so you can crop any problem anywhere.
- Direct clipboard solver (`Ctrl+Shift+V` / `Alt+P` / `F6`) automatically ingests copied images or text snippets.

---

## ⌨️ Global Hotkeys

| Action | Primary Shortcut | Fail-Safe Alternatives |
|---|---|---|
| **📸 Snip Full Monitor & Solve** | <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> | <kbd>F10</kbd>, <kbd>Alt</kbd> + <kbd>S</kbd>, <kbd>Alt</kbd> + <kbd>C</kbd> |
| **📋 Paste Clipboard & Solve** | <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>V</kbd> | <kbd>F6</kbd>, <kbd>Alt</kbd> + <kbd>P</kbd> |
| **👁️ Toggle Overlay (Show/Hide)** | <kbd>Alt</kbd> + <kbd>Space</kbd> | <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Space</kbd>, <kbd>F9</kbd>, <kbd>Alt</kbd> + <kbd>N</kbd>, <kbd>Alt</kbd> + <kbd>`</kbd> |
| **🎙️ Toggle Interview Ear (Voice)** | <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd> | <kbd>F8</kbd>, <kbd>Alt</kbd> + <kbd>A</kbd> |
| **⚡ Instant Fullscreen Snap** | <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>F</kbd> | <kbd>F11</kbd>, <kbd>Alt</kbd> + <kbd>F</kbd>, <kbd>Alt</kbd> + <kbd>V</kbd> |
| **🕶️ Panic Boss Hide** | <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>H</kbd> | <kbd>Alt</kbd> + <kbd>H</kbd>, <kbd>F12</kbd>, <kbd>Alt</kbd> + <kbd>Q</kbd> |
| **🖱️ Toggle Click-Through HUD** | <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>T</kbd> | <kbd>Alt</kbd> + <kbd>T</kbd>, <kbd>F7</kbd> |
| **📋 Copy Latest Solution** | <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>C</kbd> | Click "Copy Answer" on message |

---

## ⚡ 60-Second Developer Quickstart

### 1. Clone & Run Locally
```bash
# Clone repository
git clone git@github.com:YuvrajPatel2004/Nexora-Ai-Desktop-Overlay.git
cd Nexora-Ai-Desktop-Overlay

# Install dependencies
npm install

# Start Electron overlay in development mode
npm run dev:electron
```

### 2. Enter Your API Key (BYOK)
1. Click the **Gear icon (⚙️)** in the top bar.
2. Select your provider:
   - **Google Gemini** (Gemini 2.0 Flash / 1.5 Flash — Free & Multimodal)
   - **OpenAI** (GPT-4o, o3-mini, o1)
   - **Anthropic Claude** (Claude 3.7 Sonnet, Claude 3.5)
   - **Groq** (Llama 3.3 70B & Whisper Large v3 — Ultra Fast)
   - **DeepSeek** (V3 & R1)
   - **Local Ollama** (100% Offline & Private)
3. Enter your key, click **Test Key**, and start using Nexora!

---

## 🚀 Cross-Platform Build Guide

### 🪟 Windows (10 / 11)
```powershell
npm install
npm run dev:electron

# Build standalone installer:
npm run build:electron
```

### 🍎 macOS (Apple Silicon & Intel)
```bash
npm install
npm run dev:electron

# Build standalone .dmg:
npm run build:electron
```

### 🐧 Linux (Fedora, Ubuntu, Debian, Arch)
```bash
npm install
npm run dev:electron

# Build AppImage:
npm run build:appimage

# Build native Fedora .rpm:
npm run build:rpm
```

---

## 🔒 Privacy & Security

- **100% Client-Side**: All API requests are made directly from your machine to the AI provider endpoint using your own API key.
- **Zero Middleman Servers**: No telemetry, no intermediate proxies, and no data collection.
- **Local Document Storage**: All uploaded resumes and STAR stories in the RAG engine are stored exclusively in your local machine's encrypted application storage.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
