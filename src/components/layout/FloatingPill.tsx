import React from 'react';
import { Crop, Mic, Maximize2, ShieldCheck, Copy } from 'lucide-react';
import { AppSettings } from '../../types';

interface FloatingPillProps {
  settings: AppSettings;
  isListening: boolean;
  latestAnswerPreview?: string;
  onExpand: () => void;
  onTriggerSnip: () => void;
  onToggleAudio: () => void;
}

export const FloatingPill: React.FC<FloatingPillProps> = ({
  settings,
  isListening,
  latestAnswerPreview,
  onExpand,
  onTriggerSnip,
  onToggleAudio,
}) => {
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (latestAnswerPreview) {
      if ((window as any).electronAPI?.copyToClipboard) {
        (window as any).electronAPI.copyToClipboard(latestAnswerPreview);
      } else {
        navigator.clipboard.writeText(latestAnswerPreview);
      }
    }
  };

  return (
    <div 
      className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel border border-cyan-500/30 shadow-2xl backdrop-blur-2xl cursor-pointer hover:border-cyan-400 transition-all select-none app-drag-region"
      onClick={onExpand}
      style={{ opacity: settings.opacity }}
    >
      {/* Brand & Stealth Dot */}
      <div className="flex items-center gap-1.5 app-no-drag">
        <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-rose-500 animate-ping' : 'bg-cyan-400'}`} />
        <span className="text-[11px] font-black tracking-wider text-cyan-300 font-mono">NEXORA</span>
      </div>

      <span title="Protected from Screenshare">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
      </span>

      {/* Latest answer snippet if any */}
      {latestAnswerPreview && (
        <div className="max-w-[140px] truncate text-[11px] text-slate-300 font-mono bg-black/40 px-2 py-0.5 rounded border border-white/10">
          {latestAnswerPreview}
        </div>
      )}

      {/* Action shortcuts */}
      <div className="flex items-center gap-1 app-no-drag">
        <button
          onClick={(e) => { e.stopPropagation(); onTriggerSnip(); }}
          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-cyan-300 transition-colors"
          title="Snip Screen (Ctrl+Shift+S)"
        >
          <Crop className="w-3 h-3" />
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onToggleAudio(); }}
          className={`p-1 rounded transition-colors ${isListening ? 'bg-rose-500/30 text-rose-300' : 'hover:bg-white/10 text-slate-400 hover:text-white'}`}
          title="Toggle Interview Ear (Ctrl+Shift+A)"
        >
          <Mic className="w-3 h-3" />
        </button>

        {latestAnswerPreview && (
          <button
            onClick={handleCopy}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-emerald-300 transition-colors"
            title="Copy Solution"
          >
            <Copy className="w-3 h-3" />
          </button>
        )}

        <button
          onClick={onExpand}
          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          title="Expand Overlay"
        >
          <Maximize2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
