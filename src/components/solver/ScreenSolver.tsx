import React, { useState, useEffect } from 'react';
import { 
  Crop, 
  Sparkles, 
  Code2, 
  Cpu, 
  Clock, 
  Copy, 
  Check, 
  RotateCcw, 
  Maximize2,
  FileCode,
  Layers,
  Bug,
  GraduationCap,
  Image as ImageIcon
} from 'lucide-react';
import { AppSettings } from '../../types';
import { LLMClient } from '../../services/ai/llmClient';
import { ScreenAnalyzer } from '../../services/vision/screenAnalyzer';
import { MarkdownRenderer } from '../common/MarkdownRenderer';
import { CompanionBridge } from '../../services/companion/companionBridge';

interface ScreenSolverProps {
  settings: AppSettings;
  llmClient: LLMClient;
  pendingScreenshot?: string | null;
  onClearPendingScreenshot?: () => void;
  onTriggerSnip: () => void;
  onTriggerFullscreenCapture: () => void;
  onOpenSettings: () => void;
}

export const ScreenSolver: React.FC<ScreenSolverProps> = ({
  settings,
  llmClient,
  pendingScreenshot,
  onClearPendingScreenshot,
  onTriggerSnip,
  onTriggerFullscreenCapture,
  onOpenSettings,
}) => {
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [solverType, setSolverType] = useState<'dsa' | 'system-design' | 'debug' | 'exam'>('dsa');
  const [preferredLang, setPreferredLang] = useState<string>(settings.preferredLanguage || 'Python');
  const [solution, setSolution] = useState<string>('');
  const [isSolving, setIsSolving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (pendingScreenshot) {
      setActiveImage(pendingScreenshot);
      onClearPendingScreenshot?.();
      if (settings.autoSolveSnips) {
        handleSolve(pendingScreenshot, solverType, preferredLang);
      }
    }
  }, [pendingScreenshot]);

  // Paste handler for images directly in Solver mode
  const handlePasteImage = async () => {
    try {
      const electron = (window as any).electronAPI;
      if (electron?.readClipboardContent) {
        const data = await electron.readClipboardContent();
        if (data?.type === 'image') {
          setActiveImage(data.content);
          if (settings.autoSolveSnips) {
            handleSolve(data.content, solverType, preferredLang);
          }
          return;
        }
      }
      // Web fallback — try reading clipboard items
      if (navigator.clipboard && (navigator.clipboard as any).read) {
        const items = await (navigator.clipboard as any).read();
        for (const item of items) {
          for (const type of item.types) {
            if (type.startsWith('image/')) {
              const blob = await item.getType(type);
              const reader = new FileReader();
              reader.onload = (e) => {
                if (typeof e.target?.result === 'string') {
                  setActiveImage(e.target.result);
                }
              };
              reader.readAsDataURL(blob);
              return;
            }
          }
        }
      }
    } catch (err) {
      console.warn('[Solver] Clipboard paste error:', err);
    }
  };

  const handleSolve = async (
    imageToUse?: string | null,
    type: 'dsa' | 'system-design' | 'debug' | 'exam' = solverType,
    lang: string = preferredLang
  ) => {
    const img = imageToUse !== undefined ? imageToUse : activeImage;
    if (!img) {
      onTriggerSnip();
      return;
    }

    const currentKey = settings.apiKeys[settings.selectedProvider];
    if (settings.selectedProvider !== 'ollama' && !currentKey?.trim()) {
      onOpenSettings();
      return;
    }

    setIsSolving(true);
    setSolution('');

    let prompt = '';
    if (type === 'dsa') {
      prompt = ScreenAnalyzer.buildCodingPrompt(lang);
    } else if (type === 'system-design') {
      prompt = ScreenAnalyzer.buildSystemDesignPrompt();
    } else if (type === 'debug') {
      prompt = ScreenAnalyzer.buildDebuggerPrompt(lang);
    } else if (type === 'exam') {
      prompt = ScreenAnalyzer.buildExamPrompt();
    }

    try {
      let accumulated = '';
      await llmClient.generate({
        prompt,
        screenshot: img,
        onChunk: (chunk) => {
          accumulated += chunk;
          setSolution(accumulated);
          CompanionBridge.broadcastSolution(accumulated);
        },
      });
      CompanionBridge.broadcastSolution(accumulated);
    } catch (err: any) {
      const errorMsg = `⚠️ **Solver Error:** ${err.message || 'Failed to solve screenshot'}`;
      setSolution(errorMsg);
      CompanionBridge.broadcastSolution(errorMsg);
    } finally {
      setIsSolving(false);
    }
  };

  const handleCopy = () => {
    if ((window as any).electronAPI?.copyToClipboard) {
      (window as any).electronAPI.copyToClipboard(solution);
    } else {
      navigator.clipboard.writeText(solution);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      {/* Action Strip: Mode Picker & Controls */}
      <div className="p-2.5 bg-black/40 border-b border-white/5 space-y-2">
        <div className="flex items-center justify-between gap-1">
          {/* Solver Category Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: 'dsa', label: 'DSA / LeetCode', icon: <Code2 className="w-3 h-3" /> },
              { id: 'system-design', label: 'System Design', icon: <Layers className="w-3 h-3" /> },
              { id: 'debug', label: 'Debug Error', icon: <Bug className="w-3 h-3" /> },
              { id: 'exam', label: 'Exam / MCQ', icon: <GraduationCap className="w-3 h-3" /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setSolverType(tab.id as any);
                  if (activeImage) handleSolve(activeImage, tab.id as any, preferredLang);
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
                  solverType === tab.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Language Selector for Code */}
          <select
            value={preferredLang}
            onChange={(e) => {
              setPreferredLang(e.target.value);
              if (activeImage) handleSolve(activeImage, solverType, e.target.value);
            }}
            className="bg-slate-900 border border-white/10 text-cyan-300 text-[11px] rounded px-1.5 py-0.5 focus:outline-none"
          >
            {['Python', 'TypeScript', 'Java', 'C++', 'Go', 'Rust', 'JavaScript', 'SQL'].map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>

        {/* Snip Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTriggerSnip}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-semibold text-xs transition-all shadow-neon-cyan"
          >
            <Crop className="w-3.5 h-3.5" />
            <span>Snip Region (Ctrl+Shift+S)</span>
          </button>

          <button
            onClick={onTriggerFullscreenCapture}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs transition-colors"
            title="Instant Fullscreen Snap (Ctrl+Shift+F)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handlePasteImage}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs transition-colors flex items-center gap-1"
            title="Paste Image from Clipboard (Ctrl+V / Ctrl+Shift+V)"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span className="text-[10px]">Paste</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Active Screenshot Thumbnail if present */}
        {activeImage ? (
          <div className="relative rounded-lg overflow-hidden border border-white/15 bg-black/40 group max-h-40">
            <img src={activeImage} alt="Captured Snip" className="w-full h-auto object-contain" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                onClick={() => handleSolve(activeImage, solverType, preferredLang)}
                disabled={isSolving}
                className="px-2.5 py-1 rounded bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1 hover:bg-cyan-400 transition-all"
              >
                <Sparkles className="w-3 h-3" />
                <span>Re-Solve</span>
              </button>
              <button
                onClick={() => setActiveImage(null)}
                className="px-2.5 py-1 rounded bg-rose-500/80 text-white font-bold text-xs hover:bg-rose-500 transition-all"
              >
                Clear
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 border border-dashed border-white/15 rounded-xl text-center space-y-2">
            <div className="p-3 rounded-full bg-cyan-500/10 text-cyan-400">
              <Crop className="w-6 h-6" />
            </div>
            <p className="text-xs text-slate-300 font-medium">No Screen Snip Active</p>
            <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
              Press <code className="text-cyan-300">Ctrl+Shift+S</code> to snip any code, LeetCode problem, or diagram on your desktop.
            </p>
          </div>
        )}

        {/* Generated Solution Box */}
        {(solution || isSolving) && (
          <div className="glass-panel rounded-xl p-3.5 space-y-2 border border-white/10 relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span className="text-xs font-bold text-slate-200">
                  {isSolving ? 'Analyzing & Synthesizing Optimal Solution...' : 'Optimal Solution & Analysis'}
                </span>
              </div>

              {solution && !isSolving && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-emerald-400 text-xs transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-medium">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy All</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <MarkdownRenderer content={solution || 'Generating solution code...'} isStreaming={isSolving} />
          </div>
        )}
      </div>
    </div>
  );
};
