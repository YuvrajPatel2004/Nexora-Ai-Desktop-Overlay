import React, { useState, useEffect, useMemo } from 'react';
import { 
  getStoredSettings, 
  saveSettings 
} from './services/storage/settingsStore';
import { LLMClient } from './services/ai/llmClient';
import { speechService } from './services/audio/speechService';
import { AppSettings, OverlayMode, OverlayViewStyle } from './types';

// Components
import { Header } from './components/layout/Header';
import { FloatingPill } from './components/layout/FloatingPill';
import { CopilotChat } from './components/copilot/CopilotChat';
import { InterviewEar } from './components/interview/InterviewEar';
import { ScreenSolver } from './components/solver/ScreenSolver';
import { TeleprompterView } from './components/teleprompter/TeleprompterView';
import { SnipOverlay } from './components/snipper/SnipOverlay';
import { SettingsModal } from './components/settings/SettingsModal';
import { CheatSheetDrawer } from './components/cheatsheet/CheatSheetDrawer';
import { KnowledgeBaseModal } from './components/knowledge/KnowledgeBaseModal';
import { CompanionModal } from './components/companion/CompanionModal';
import { CompanionBridge } from './services/companion/companionBridge';

export function App() {
  const [settings, setSettings] = useState<AppSettings>(() => getStoredSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState(false);
  const [isKnowledgeBaseOpen, setIsKnowledgeBaseOpen] = useState(false);
  const [isCompanionOpen, setIsCompanionOpen] = useState(false);
  const [isSnipOverlayActive, setIsSnipOverlayActive] = useState(false);
  const [snipInitialSource, setSnipInitialSource] = useState<{ dataUrl: string; width: number; height: number } | null>(null);
  const [pendingScreenshot, setPendingScreenshot] = useState<string | null>(null);
  const [pendingClipboardText, setPendingClipboardText] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [latestAnswerPreview, setLatestAnswerPreview] = useState<string | undefined>();

  const llmClient = useMemo(() => new LLMClient(settings), []);

  // Update LLM client and window stealth flags whenever settings update
  useEffect(() => {
    llmClient.updateSettings(settings);
    saveSettings(settings);

    // Sync taskbar & dock concealment
    if ((window as any).electronAPI?.setSkipTaskbar && typeof settings.hideFromTaskbar === 'boolean') {
      (window as any).electronAPI.setSkipTaskbar(settings.hideFromTaskbar);
    }

    // Update document theme class
    const root = document.documentElement;
    root.classList.remove(
      'theme-obsidian', 
      'theme-matrix-emerald', 
      'theme-rose-gold', 
      'theme-midnight-blue'
    );
    if (settings.theme && settings.theme !== 'cyber-stealth') {
      root.classList.add(`theme-${settings.theme}`);
    }
  }, [settings, llmClient]);

  // IPC Event Listeners from Electron Main Process
  useEffect(() => {
    const electron = (window as any).electronAPI;
    if (!electron) return;

    const cleanupSnip = electron.onTriggerSnip?.(() => {
      triggerSnip();
    });

    const cleanupFullscreen = electron.onTriggerFullscreenCapture?.(() => {
      triggerFullscreenCapture();
    });

    const cleanupAudio = electron.onTriggerAudioToggle?.(() => {
      toggleAudioEar();
    });

    const cleanupClipboard = electron.onTriggerClipboardContent?.((data: { type: 'image' | 'text'; content: string }) => {
      if (data.type === 'image') {
        setPendingScreenshot(data.content);
        setSettings(prev => ({ ...prev, mode: 'copilot', viewStyle: 'expanded' }));
      } else if (data.type === 'text') {
        setPendingClipboardText(data.content);
        setSettings(prev => ({ ...prev, mode: 'copilot', viewStyle: 'expanded' }));
      }
    });

    const cleanupClickThrough = electron.onClickThroughChanged?.((val: boolean) => {
      setSettings(prev => ({ ...prev, clickThroughEnabled: val }));
    });

    const cleanupCompanion = CompanionBridge.addActionListener((action) => {
      if (action === 'snip') {
        triggerSnip();
      } else if (action === 'audio-toggle') {
        toggleAudioEar();
      } else if (action === 'preset-coding') {
        handleUpdateSettings({ promptPreset: 'coding' });
      } else if (action === 'preset-star') {
        handleUpdateSettings({ promptPreset: 'interview-star' });
      }
    });

    return () => {
      cleanupSnip?.();
      cleanupFullscreen?.();
      cleanupAudio?.();
      cleanupClipboard?.();
      cleanupClickThrough?.();
      cleanupCompanion();
    };
  }, []);

  // Global window paste handler — works in ALL modes (Copilot, Solver, Interview, etc.)
  // Intercepts Ctrl+V image pastes and routes them to the active mode
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              if (typeof event.target?.result === 'string') {
                setPendingScreenshot(event.target.result);
                // Expand the view if in compact/pill mode
                setSettings(prev => ({
                  ...prev,
                  viewStyle: 'expanded'
                }));
              }
            };
            reader.readAsDataURL(file);
            e.preventDefault();
            return;
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

  const handleDirectClipboardUpload = async () => {
    try {
      const electron = (window as any).electronAPI;
      if (electron?.readClipboardContent) {
        const data = await electron.readClipboardContent();
        if (data?.type === 'image') {
          setPendingScreenshot(data.content);
          setSettings(prev => ({ ...prev, mode: 'copilot', viewStyle: 'expanded' }));
          return;
        } else if (data?.type === 'text') {
          setPendingClipboardText(data.content);
          setSettings(prev => ({ ...prev, mode: 'copilot', viewStyle: 'expanded' }));
          return;
        }
      }
      const text = await navigator.clipboard.readText();
      if (text?.trim()) {
        setPendingClipboardText(text.trim());
        setSettings(prev => ({ ...prev, mode: 'copilot', viewStyle: 'expanded' }));
      }
    } catch (err) {
      console.warn('Clipboard read error:', err);
    }
  };

  // Global Keyboard listener for window & overlay events with fail-safe multi-keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Snip & Solve (F10, Ctrl+Shift+S, Alt+S, Alt+C)
      if (
        e.key === 'F10' ||
        (e.altKey && (e.code === 'KeyS' || e.code === 'KeyC')) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.code === 'KeyS' || e.code === 'KeyC'))
      ) {
        e.preventDefault();
        triggerSnip();
      }
      // 2. Fullscreen Snap (F11, Ctrl+Shift+F, Alt+F, Alt+V)
      else if (
        e.key === 'F11' ||
        (e.altKey && (e.code === 'KeyF' || e.code === 'KeyV')) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.code === 'KeyF' || e.code === 'KeyV'))
      ) {
        e.preventDefault();
        triggerFullscreenCapture();
      }
      // 3. Audio Ear (F8, Ctrl+Shift+A, Alt+A)
      else if (
        e.key === 'F8' ||
        (e.altKey && e.code === 'KeyA') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyA')
      ) {
        e.preventDefault();
        toggleAudioEar();
      }
      // 4. Toggle Overlay / Pill (F9, Alt+Space, Alt+N, Ctrl+Shift+Space, Alt+`)
      else if (
        e.key === 'F9' ||
        (e.altKey && (e.code === 'KeyN' || e.code === 'Space' || e.code === 'Backquote')) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'Space')
      ) {
        e.preventDefault();
        setSettings(prev => ({
          ...prev,
          viewStyle: prev.viewStyle === 'compact-pill' ? 'expanded' : 'compact-pill'
        }));
      }
      // 5. Panic Boss Hide (F12, Ctrl+Shift+H, Alt+H, Alt+Q, Escape)
      else if (
        e.key === 'F12' ||
        (e.altKey && (e.code === 'KeyH' || e.code === 'KeyQ')) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyH')
      ) {
        e.preventDefault();
        if ((window as any).electronAPI?.hide) {
          (window as any).electronAPI.hide();
        } else {
          setSettings(prev => ({
            ...prev,
            viewStyle: prev.viewStyle === 'compact-pill' ? 'expanded' : 'compact-pill'
          }));
        }
      }
      // 6. Toggle Click-Through (F7, Ctrl+Shift+T, Alt+T)
      else if (
        e.key === 'F7' ||
        (e.altKey && e.code === 'KeyT') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyT')
      ) {
        e.preventDefault();
        const next = !settings.clickThroughEnabled;
        setSettings(prev => ({ ...prev, clickThroughEnabled: next }));
        if ((window as any).electronAPI?.setIgnoreMouseEvents) {
          (window as any).electronAPI.setIgnoreMouseEvents(next, { forward: true });
        }
      }
      // 7. Clipboard Direct Paste & Solve (F6, Alt+P, Ctrl+Shift+V)
      else if (
        e.key === 'F6' ||
        (e.altKey && e.code === 'KeyP') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.code === 'KeyV' || e.code === 'KeyP'))
      ) {
        e.preventDefault();
        handleDirectClipboardUpload();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings.clickThroughEnabled]);

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const triggerSnip = async () => {
    try {
      // 1. Pre-capture desktop before expanding to fullscreen
      let initialSource: any = null;
      if ((window as any).electronAPI?.captureScreenSources) {
        initialSource = await (window as any).electronAPI.captureScreenSources();
      }
      // 2. Expand window to fullscreen bounds
      if ((window as any).electronAPI?.enterFullscreenSnip) {
        await (window as any).electronAPI.enterFullscreenSnip();
      }
      setSnipInitialSource(initialSource);
    } catch (err) {
      console.warn('Enter fullscreen snip error:', err);
    }
    setIsSnipOverlayActive(true);
  };

  const triggerFullscreenCapture = async () => {
    try {
      if ((window as any).electronAPI?.captureScreenSources) {
        const source = await (window as any).electronAPI.captureScreenSources();
        if (source?.dataUrl) {
          setPendingScreenshot(source.dataUrl);
          setSettings(prev => ({ ...prev, mode: 'solver', viewStyle: 'expanded' }));
          return;
        }
      }
      triggerSnip();
    } catch (e) {
      console.error(e);
      triggerSnip();
    }
  };

  const toggleAudioEar = () => {
    const nextState = speechService.toggle({
      onInterimText: () => {},
      onFinalText: () => {},
      onError: (err) => console.error(err),
      onStateChange: (state) => setIsListening(state),
    });
    setIsListening(nextState);
  };

  const handleCaptureComplete = async (croppedDataUrl: string) => {
    try {
      if ((window as any).electronAPI?.exitFullscreenSnip) {
        await (window as any).electronAPI.exitFullscreenSnip();
      }
    } catch (err) {
      console.warn('Exit fullscreen snip error:', err);
    }
    setIsSnipOverlayActive(false);
    setSnipInitialSource(null);
    setPendingScreenshot(croppedDataUrl);
    // Switch to solver mode or copilot mode
    setSettings(prev => ({
      ...prev,
      mode: 'solver',
      viewStyle: 'expanded'
    }));
  };

  const handleCancelSnip = async () => {
    try {
      if ((window as any).electronAPI?.exitFullscreenSnip) {
        await (window as any).electronAPI.exitFullscreenSnip();
      }
    } catch (err) {
      console.warn('Exit fullscreen snip error:', err);
    }
    setIsSnipOverlayActive(false);
    setSnipInitialSource(null);
  };

  return (
    <div 
      className="relative w-screen h-screen overflow-hidden flex flex-col justify-start items-stretch"
      style={{
        opacity: settings.opacity,
        fontSize: settings.fontSize === 'xs' ? '11px' : settings.fontSize === 'base' ? '15px' : '13px'
      }}
    >
      {/* Fullscreen Snip Selector Canvas Overlay */}
      {isSnipOverlayActive && (
        <SnipOverlay
          initialScreenSource={snipInitialSource}
          onCaptureComplete={handleCaptureComplete}
          onCancel={handleCancelSnip}
        />
      )}

      {/* COMPACT PILL HUD MODE */}
      {settings.viewStyle === 'compact-pill' ? (
        <div className="p-2 flex justify-end">
          <FloatingPill
            settings={settings}
            isListening={isListening}
            latestAnswerPreview={latestAnswerPreview}
            onExpand={() => handleUpdateSettings({ viewStyle: 'expanded' })}
            onTriggerSnip={triggerSnip}
            onToggleAudio={toggleAudioEar}
          />
        </div>
      ) : settings.mode === 'teleprompter' ? (
        /* TELEPROMPTER VIEW */
        <div className="flex-1 flex flex-col glass-panel rounded-2xl m-2 overflow-hidden border border-white/10 shadow-2xl">
          <Header
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenCheatSheet={() => setIsCheatSheetOpen(true)}
            onOpenKnowledgeBase={() => setIsKnowledgeBaseOpen(true)}
            onOpenCompanion={() => setIsCompanionOpen(true)}
            onTogglePillMode={() => handleUpdateSettings({ viewStyle: 'compact-pill' })}
            isListening={isListening}
          />
          <TeleprompterView
            settings={settings}
            llmClient={llmClient}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onExpandView={() => handleUpdateSettings({ mode: 'copilot' })}
          />
        </div>
      ) : (
        /* EXPANDED FULL COPILOT PANEL */
        <div className="flex-1 flex flex-col glass-panel rounded-2xl m-2 overflow-hidden border border-white/10 shadow-glass-glow">
          <Header
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenCheatSheet={() => setIsCheatSheetOpen(true)}
            onOpenKnowledgeBase={() => setIsKnowledgeBaseOpen(true)}
            onOpenCompanion={() => setIsCompanionOpen(true)}
            onTogglePillMode={() => handleUpdateSettings({ viewStyle: 'compact-pill' })}
            isListening={isListening}
          />

          <main className="flex-1 flex flex-col overflow-hidden bg-slate-950/60 backdrop-blur-xl">
            {settings.mode === 'copilot' && (
              <CopilotChat
                settings={settings}
                llmClient={llmClient}
                pendingScreenshot={pendingScreenshot}
                onClearPendingScreenshot={() => setPendingScreenshot(null)}
                pendingClipboardText={pendingClipboardText}
                onClearPendingClipboardText={() => setPendingClipboardText(null)}
                onTriggerSnip={triggerSnip}
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
            )}

            {settings.mode === 'interview-ear' && (
              <InterviewEar
                settings={settings}
                llmClient={llmClient}
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
            )}

            {settings.mode === 'solver' && (
              <ScreenSolver
                settings={settings}
                llmClient={llmClient}
                pendingScreenshot={pendingScreenshot}
                onClearPendingScreenshot={() => setPendingScreenshot(null)}
                onTriggerSnip={triggerSnip}
                onTriggerFullscreenCapture={triggerFullscreenCapture}
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
            )}
          </main>
        </div>
      )}

      {/* Interview Cheat Sheet Drawer */}
      <CheatSheetDrawer
        isOpen={isCheatSheetOpen}
        onClose={() => setIsCheatSheetOpen(false)}
      />

      {/* Feature F: Personal Resume & Knowledge Base RAG Modal */}
      <KnowledgeBaseModal
        isOpen={isKnowledgeBaseOpen}
        onClose={() => setIsKnowledgeBaseOpen(false)}
      />

      {/* Feature B: Second-Screen Phone/iPad Companion Modal */}
      <CompanionModal
        isOpen={isCompanionOpen}
        onClose={() => setIsCompanionOpen(false)}
      />

      {/* BYOK Settings & Stealth Modal */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
}
export default App;
