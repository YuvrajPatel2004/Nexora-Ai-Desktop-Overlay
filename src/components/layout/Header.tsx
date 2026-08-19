import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Settings, 
  Minus, 
  X, 
  Sliders, 
  MousePointer, 
  EyeOff, 
  Sparkles, 
  Mic, 
  Crop, 
  Tv, 
  BookOpen,
  FileCode,
  Radio
} from 'lucide-react';
import { AppSettings, OverlayMode } from '../../types';

interface HeaderProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onOpenSettings: () => void;
  onOpenCheatSheet: () => void;
  onOpenKnowledgeBase?: () => void;
  onOpenCompanion?: () => void;
  onTogglePillMode: () => void;
  isListening?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onUpdateSettings,
  onOpenSettings,
  onOpenCheatSheet,
  onOpenKnowledgeBase,
  onOpenCompanion,
  onTogglePillMode,
  isListening
}) => {
  const [showOpacitySlider, setShowOpacitySlider] = useState(false);

  const handleMinimize = () => {
    if ((window as any).electronAPI?.minimize) {
      (window as any).electronAPI.minimize();
    } else {
      onTogglePillMode();
    }
  };

  const handleBossHide = () => {
    if ((window as any).electronAPI?.hide) {
      (window as any).electronAPI.hide();
    } else {
      onTogglePillMode();
    }
  };

  const handleClose = () => {
    if ((window as any).electronAPI?.close) {
      (window as any).electronAPI.close();
    }
  };

  const handleToggleClickThrough = () => {
    const nextVal = !settings.clickThroughEnabled;
    onUpdateSettings({ clickThroughEnabled: nextVal });
    if ((window as any).electronAPI?.setIgnoreMouseEvents) {
      (window as any).electronAPI.setIgnoreMouseEvents(nextVal, { forward: true });
    }
  };

  const modes: { id: OverlayMode; label: string; icon: React.ReactNode }[] = [
    { id: 'copilot', label: 'Copilot', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'solver', label: 'Snip & Solve', icon: <Crop className="w-3.5 h-3.5" /> },
    { id: 'interview-ear', label: 'Interview Ear', icon: <Mic className="w-3.5 h-3.5" /> },
    { id: 'teleprompter', label: 'Teleprompter', icon: <Tv className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="flex flex-col bg-black border-b border-white/10 select-none relative z-30 font-sans">
      {/* Top Window Bar with Drag Handle */}
      <div className="flex items-center justify-between px-3 py-2 app-drag-region">
        {/* Logo & Stealth Status */}
        <div className="flex items-center gap-2 app-no-drag">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-xs font-black tracking-wider uppercase font-mono">NEXORA</span>
          </div>

          {/* Anti-Screenshare Status Pill */}
          <div 
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-900 border border-white/10 text-zinc-300 text-[10px] font-medium cursor-help"
            title="Screenshare Protected: Window is invisible to Zoom, Google Meet, Teams, Discord & OBS screen capture"
          >
            <ShieldCheck className="w-3 h-3 text-white" />
            <span className="hidden sm:inline">Stealth Safe</span>
          </div>

          {/* Live Audio Indicator */}
          {isListening && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <span>Ear Active</span>
            </div>
          )}
        </div>

        {/* Quick Stealth & Window Controls */}
        <div className="flex items-center gap-1 app-no-drag">
          {/* Opacity Control */}
          <div className="relative">
            <button
              onClick={() => setShowOpacitySlider(!showOpacitySlider)}
              className={`p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors text-xs flex items-center gap-0.5 ${showOpacitySlider ? 'bg-white/15 text-white' : ''}`}
              title="Adjust Transparency"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono">{Math.round(settings.opacity * 100)}%</span>
            </button>

            {showOpacitySlider && (
              <div className="absolute right-0 top-8 bg-zinc-950 border border-white/20 p-2.5 rounded-lg shadow-2xl backdrop-blur-xl z-50 w-36 flex flex-col gap-1.5">
                <div className="flex justify-between text-[10px] text-zinc-400">
                  <span>Ghost</span>
                  <span className="font-mono text-white font-bold">{Math.round(settings.opacity * 100)}%</span>
                  <span>Solid</span>
                </div>
                <input
                  type="range"
                  min="0.25"
                  max="1.0"
                  step="0.05"
                  value={settings.opacity}
                  onChange={(e) => onUpdateSettings({ opacity: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
                />
              </div>
            )}
          </div>

          {/* Click-Through HUD Mode */}
          <button
            onClick={handleToggleClickThrough}
            className={`p-1.5 rounded-md transition-colors text-xs ${settings.clickThroughEnabled ? 'bg-white text-black border border-white font-bold' : 'hover:bg-white/10 text-zinc-400 hover:text-white'}`}
            title={settings.clickThroughEnabled ? "Click-Through Active (Pass clicks through)" : "Enable Click-Through HUD"}
          >
            <MousePointer className="w-3.5 h-3.5" />
          </button>

          {/* Boss Key Panic Hide */}
          <button
            onClick={handleBossHide}
            className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            title="Panic Boss Hide (Ctrl+Shift+H / Alt+Space)"
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>

          {/* Resume & Personal Knowledge Base RAG */}
          <button
            onClick={onOpenKnowledgeBase}
            className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors relative"
            title="Personal Resume & Knowledge Base RAG"
          >
            <FileCode className="w-3.5 h-3.5" />
          </button>

          {/* Second-Screen Mobile Companion */}
          <button
            onClick={onOpenCompanion}
            className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            title="Second-Screen Mobile Companion (QR Sync)"
          >
            <Radio className="w-3.5 h-3.5" />
          </button>

          {/* Cheat Sheet & DSA Patterns */}
          <button
            onClick={onOpenCheatSheet}
            className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            title="Interview Cheat Sheets & DSA Patterns"
          >
            <BookOpen className="w-3.5 h-3.5" />
          </button>

          {/* Settings Modal */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            title="Settings & API Keys"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-3.5 bg-white/15 mx-0.5" />

          {/* Minimize / Pill Mode */}
          <button
            onClick={handleMinimize}
            className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            title="Minimize to Pill"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {/* Close */}
          <button
            onClick={handleClose}
            className="p-1.5 rounded-md hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors"
            title="Close Nexora"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex items-center gap-1 px-2.5 pb-2 pt-0.5 overflow-x-auto no-scrollbar app-no-drag">
        {modes.map((m) => {
          const isActive = settings.mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onUpdateSettings({ mode: m.id })}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap ${
                isActive
                  ? 'bg-white text-black font-bold shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-white/10 border border-transparent'
              }`}
            >
              {m.icon}
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
