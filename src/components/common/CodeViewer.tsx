import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeViewerProps {
  code: string;
  language?: string;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({ code, language = 'text' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if ((window as any).electronAPI?.copyToClipboard) {
      (window as any).electronAPI.copyToClipboard(code);
    } else {
      navigator.clipboard.writeText(code);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-white/10 bg-slate-950/80 shadow-lg">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-white/10 text-xs text-slate-400">
        <span className="font-mono text-cyan-400 font-medium lowercase">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors text-xs"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-3 overflow-x-auto font-mono text-xs leading-relaxed text-slate-200 selection:bg-cyan-500/30">
        <pre><code>{code}</code></pre>
      </div>
    </div>
  );
};
