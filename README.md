# Nexora AI - Undetectable Desktop AI Overlay & Interview Copilot 🛡️⚡

An ultra-stealth, undetectable desktop AI overlay assistant (inspired by Cluely, Interview Coder, and Ghost AI). Designed to float seamlessly over any IDE, meeting, browser, or coding assessment, capture screen & audio context in real-time, and **remain 100% invisible during screen shares** (Zoom, Google Meet, Microsoft Teams, Discord, and OBS Studio).

Featuring **Bring Your Own Key (BYOK)** support with zero middleman servers.

---

## ⚡ 60-Second Quickstart

### 1. Install & Launch
```bash
# Clone and enter directory
git clone git@github.com:YuvrajPatel2004/Nexora-Ai-Desktop-Overlay.git
cd Nexora-Ai-Desktop-Overlay

# Install dependencies
npm install

# Start the Desktop Overlay
npm run dev:electron
```

### 2. Enter Your API Key (BYOK)
1. Click the **Gear icon (⚙️)** in the top bar.
2. Choose your provider:
   - **Google Gemini** (Gemini 2.0 Flash - Recommended & Multimodal)
   - **OpenAI** (GPT-4o, o3-mini, o1)
   - **Anthropic Claude** (Claude 3.7 Sonnet, Claude 3.5)
   - **Groq** (Llama 3.3 70B - Ultra Fast)
   - **DeepSeek** (V3 & R1)
   - **Local Ollama** (100% offline & private)
3. Paste your API key, click **Test Key**, and click **Done**.

---

## ⌨️ Global Hotkeys (Single-Key & Multi-Key)

| Action | Primary Shortcut | Single-Key / Easy Alternative |
|---|---|---|
| **📸 Snip & Solve Screen** | <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> | <kbd>F10</kbd> or <kbd>Alt</kbd> + <kbd>S</kbd> |
| **👁️ Toggle Overlay (Show/Hide)** | <kbd>Alt</kbd> + <kbd>Space</kbd> | <kbd>F9</kbd> or <kbd>Alt</kbd> + <kbd>N</kbd> |
| **🎙️ Toggle Interview Ear (Voice)** | <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd> | <kbd>F8</kbd> or <kbd>Alt</kbd> + <kbd>A</kbd> |
| **⚡ Instant Fullscreen Snap** | <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>F</kbd> | <kbd>Alt</kbd> + <kbd>F</kbd> |
| **🕶️ Panic Boss Hide** | <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>H</kbd> | <kbd>Alt</kbd> + <kbd>H</kbd> |
| **🖱️ Toggle Click-Through HUD** | <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>T</kbd> | <kbd>Alt</kbd> + <kbd>T</kbd> |
| **📋 Quick Copy Latest Solution** | <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>C</kbd> | Click "Copy" on any message |

---

## 🌟 Built-in Capabilities

1. **🛡️ Screenshare Invisibility (Hardware DRM Exclusion)**:
   - Uses native `WDA_EXCLUDEFROMCAPTURE` (0x11) on Windows and `NSWindowSharingNone` on macOS.
   - Eliminates black rectangles — participants see your desktop/IDE behind Nexora.
   - On Linux, share a "Window" (VS Code / Chrome) to keep the overlay completely hidden.

2. **📸 Interactive Screen Snipper & Visual Solver**:
   - Freezes screen with crosshairs (<kbd>F10</kbd> / <kbd>Ctrl+Shift+S</kbd>) and crops any region.
   - Dedicated tabs: **DSA / LeetCode** (Optimal code + Big-O Time/Space), **System Design**, **Error Debugger**, and **Exam / MCQ Solver**.

3. **🎙️ Live Interview Ear (Real-time Audio Copilot)**:
   - Real-time continuous speech transcription of interviewer questions with auto-generated talking points and STAR-method responses.

4. **📖 Interview Cheat Sheets & DSA Pattern Finder (NEW)**:
   - Built-in slide-out drawer (<kbd>Book icon 📖</kbd>) with pre-built templates for **Sliding Window**, **Monotonic Stack**, **Topological Sort**, **Union-Find**, **Rate Limiters**, **Caching Patterns**, and **STAR behavioral conflict/failure stories**.

5. **⚡ Invisible Teleprompter & Floating Pill HUD**:
   - Ultra-transparent HUD prompter that streams live answers across your screen.
   - Compact pill mode that collapses Nexora into an edge badge.

---

## 🚀 Cross-Platform Setup & Build Guide

### 🪟 Windows (10 / 11)
```powershell
npm install
npm run dev:electron
# Build standalone .exe installer:
npm run build:electron
```

### 🍎 macOS (Apple Silicon & Intel)
```bash
npm install
npm run dev:electron
# Build .dmg package:
npm run build:electron
```
*(Enable Screen Recording in System Settings > Privacy & Security)*

### 🐧 Linux (Fedora, Ubuntu, Debian, Arch)
```bash
npm install
npm run dev:electron
# If using Wayland:
npm run dev:electron -- --enable-features=UseOzonePlatform --ozone-platform=wayland
```

---

## 💡 Future Functionality Ideas & Roadmap

Here are additional features you can explore adding:
1. **Interactive Code Sandbox / In-App Python Runner**: Execute and test code snippets with sample inputs directly inside the overlay.
2. **Auto-Clipboard AI Listener**: Auto-detects when you copy code or error traces and automatically shows the fix in the overlay.
3. **Smart Voice Synthesis (Whisper TTS)**: Discreetly reads concise answers into an earpiece / headphone channel.
4. **Session Export to PDF/Markdown**: 1-click export of the entire interview transcript, questions asked, and optimal solutions.
5. **Custom Company Personas**: Quick-select presets tailored for Google, Meta, Amazon, Microsoft, or Quant/HFT interviews.
