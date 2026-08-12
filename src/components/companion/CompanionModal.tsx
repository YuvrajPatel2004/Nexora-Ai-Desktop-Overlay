import React, { useState, useEffect } from 'react';
import { 
  X, 
  Radio, 
  Globe, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  Sparkles, 
  Tv, 
  Layers
} from 'lucide-react';
import { CompanionServerInfo } from '../../types';
import { CompanionBridge } from '../../services/companion/companionBridge';
import { QRCodeGenerator } from '../../utils/qrCode';

interface CompanionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CompanionModal: React.FC<CompanionModalProps> = ({ isOpen, onClose }) => {
  const [info, setInfo] = useState<CompanionServerInfo>({
    isRunning: false,
    port: 4123,
    localIp: '127.0.0.1',
    fullUrl: 'http://127.0.0.1:4123',
    connectedCount: 0
  });
  const [copied, setCopied] = useState(false);
  const [qrSvg, setQrSvg] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadInfo();
      const interval = setInterval(loadInfo, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const loadInfo = async () => {
    const data = await CompanionBridge.getInfo();
    setInfo(data);
    const svg = QRCodeGenerator.generateSVG(data.fullUrl, 220);
    setQrSvg(svg);
  };

  if (!isOpen) return null;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(info.fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in select-none">
      <div className="relative w-full max-w-lg bg-slate-950/95 border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">Second-Screen Mobile Companion</h2>
                {info.connectedCount > 0 ? (
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                    ● {info.connectedCount} Connected
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded-full bg-slate-800 text-slate-400 border border-white/10">
                    Waiting for Scan
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Scan with your phone or iPad on the same Wi-Fi to mirror solutions invisibly.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col items-center gap-5">
          
          {/* QR Code Canvas Box */}
          <div className="relative p-3 rounded-2xl bg-slate-900 border border-cyan-500/30 shadow-glass-glow flex items-center justify-center">
            {qrSvg ? (
              <div 
                dangerouslySetInnerHTML={{ __html: qrSvg }} 
                className="w-[200px] h-[200px] flex items-center justify-center"
              />
            ) : (
              <div className="w-[200px] h-[200px] flex items-center justify-center text-slate-500 text-xs">
                Generating QR...
              </div>
            )}

            {/* Glowing Corner Accents */}
            <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-cyan-400 rounded-tl" />
            <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-cyan-400 rounded-tr" />
            <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-cyan-400 rounded-bl" />
            <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-cyan-400 rounded-br" />
          </div>

          {/* Wi-Fi Direct URL Bar */}
          <div className="w-full flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5 font-medium">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                Local Wi-Fi Network URL:
              </span>
              <span className="font-mono text-[10px] text-slate-500">Port {info.port}</span>
            </div>

            <div className="flex items-center gap-2 bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2">
              <span className="flex-1 font-mono text-xs text-cyan-300 truncate select-all">
                {info.fullUrl}
              </span>

              <button
                onClick={handleCopyUrl}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-xs font-semibold"
                title="Copy Link to Clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={() => (window as any).electronAPI?.openExternal?.(info.fullUrl) || window.open(info.fullUrl, '_blank')}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                title="Open in Browser Tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Stealth Feature Highlights */}
          <div className="w-full grid grid-cols-2 gap-2.5 pt-1">
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-[11px]">
                <div className="font-bold text-white">100% Undetectable</div>
                <div className="text-slate-400">Bypasses full-screen proctoring & lockdown browsers.</div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-start gap-2">
              <Radio className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div className="text-[11px]">
                <div className="font-bold text-white">Live Zero-Delay Sync</div>
                <div className="text-slate-400">Streams answers, snips, and transcripts in sub-100ms.</div>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/10 bg-slate-900/60 text-xs text-slate-400">
          <div className="flex items-center gap-2 text-[11px]">
            <Tv className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ensure Phone & PC are on same Wi-Fi</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
