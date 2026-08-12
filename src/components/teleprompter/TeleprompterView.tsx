import React, { useState, useEffect, useRef } from 'react';
import { 
  Tv, 
  Copy, 
  Check, 
  Trash2, 
  Play, 
  Pause, 
  ShieldCheck
} from 'lucide-react';
import { AppSettings } from '../../types';
import { LLMClient } from '../../services/ai/llmClient';

interface TeleprompterViewProps {
  settings: AppSettings;
  llmClient: LLMClient;
  onOpenSettings: () => void;
  onExpandView: () => void;
}

export const TeleprompterView: React.FC<TeleprompterViewProps> = ({
  settings: _settings,
  llmClient: _llmClient,
  onOpenSettings: _onOpenSettings,
  onExpandView: _onExpandView,
}) => {
  const [prompterText, setPrompterText] = useState<string>(
    'Teleprompter Mode Active. Spoken interview hints and code snippets will stream line-by-line here with transparent HUD overlay.'
  );
  const [isPaused, setIsPaused] = useState(false);
  const [fontSize, setFontSize] = useState<number>(14);
  const [copied, setCopied] = useState(false);
  const textEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPaused) {
      textEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [prompterText, isPaused]);

  const handleCopy = () => {
    if ((window as any).electronAPI?.copyToClipboard) {
      (window as any).electronAPI.copyToClipboard(prompterText);
    } else {
      navigator.clipboard.writeText(prompterText);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/70 backdrop-blur-md overflow-hidden select-none">
      {/* Teleprompter Top Mini-Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-black/40 border-b border-white/10 text-xs app-drag-region">
        <div className="flex items-center gap-1.5 app-no-drag">
          <Tv className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-mono text-cyan-300 text-xs font-bold">HUD PROMPTER</span>
          <span title="Hidden from screenshare">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </span>
        </div>

        <div className="flex items-center gap-1 app-no-drag">
          {/* Font size adjustment */}
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-slate-300">
            <span>Size:</span>
            <button
              onClick={() => setFontSize(Math.max(10, fontSize - 1))}
              className="hover:text-cyan-400 px-1 font-bold"
            >
              -
            </button>
            <span className="font-mono text-cyan-300">{fontSize}px</span>
            <button
              onClick={() => setFontSize(Math.min(24, fontSize + 1))}
              className="hover:text-cyan-400 px-1 font-bold"
            >
              +
            </button>
          </div>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
            title={isPaused ? "Resume Auto-scroll" : "Pause Auto-scroll"}
          >
            {isPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3 text-slate-300" />}
          </button>

          <button
            onClick={handleCopy}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-emerald-400"
            title="Copy Text"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>

          <button
            onClick={() => setPrompterText('')}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-rose-400"
            title="Clear Prompter"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Transparent Teleprompter Stream */}
      <div 
        className="flex-1 overflow-y-auto p-4 leading-relaxed font-sans text-slate-100 selection:bg-cyan-500/30"
        style={{ fontSize: `${fontSize}px` }}
      >
        <div className="space-y-3 whitespace-pre-wrap">
          {prompterText}
        </div>
        <div ref={textEndRef} />
      </div>
    </div>
  );
};
