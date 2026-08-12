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
  const [pendingScreenshot, setPendingScreenshot] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [latestAnswerPreview, setLatestAnswerPreview] = useState<string | undefined>();

  const llmClient = useMemo(() => new LLMClient(settings), []);

  // Update LLM client whenever settings update
  useEffect(() => {
    llmClient.updateSettings(settings);
    saveSettings(settings);

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
      cleanupClickThrough?.();
      cleanupCompanion();
    };
  }, []);

  // Global Keyboard listener for window events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Snip & Solve (F10 or Ctrl+Shift+S or Alt+S)
      if (e.key === 'F10' || ((e.ctrlKey || e.metaKey || e.altKey) && (e.code === 'KeyS' || e.key === 's' || e.key === 'S') && (e.shiftKey || e.altKey))) {
        e.preventDefault();
        triggerSnip();
      }
      // Audio Ear (F8 or Ctrl+Shift+A or Alt+A)
      else if (e.key === 'F8' || ((e.ctrlKey || e.metaKey || e.altKey) && (e.code === 'KeyA' || e.key === 'a' || e.key === 'A') && (e.shiftKey || e.altKey))) {
        e.preventDefault();
        toggleAudioEar();
      }
      // Toggle Overlay / Pill (F9 or Alt+Space or Alt+N)
      else if (e.key === 'F9' || (e.altKey && (e.code === 'KeyN' || e.key === 'n' || e.code === 'Space' || e.key === ' '))) {
        e.preventDefault();
        setSettings(prev => ({
          ...prev,
          viewStyle: prev.viewStyle === 'compact-pill' ? 'expanded' : 'compact-pill'
        }));
      }
      // Panic hide (Ctrl+Shift+H or Alt+H)
      else if ((e.ctrlKey || e.metaKey || e.altKey) && (e.code === 'KeyH' || e.key === 'h' || e.key === 'H')) {
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const triggerSnip = () => {
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

  const handleCaptureComplete = (croppedDataUrl: string) => {
    setIsSnipOverlayActive(false);
    setPendingScreenshot(croppedDataUrl);
    // Switch to solver mode or copilot mode
    setSettings(prev => ({
      ...prev,
      mode: 'solver',
      viewStyle: 'expanded'
    }));
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
          onCaptureComplete={handleCaptureComplete}
          onCancel={() => setIsSnipOverlayActive(false)}
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
