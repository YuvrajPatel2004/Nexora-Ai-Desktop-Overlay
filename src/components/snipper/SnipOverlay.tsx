import React, { useState, useEffect } from 'react';
import { X, Crop, Sparkles } from 'lucide-react';
import { ScreenAnalyzer } from '../../services/vision/screenAnalyzer';
import { SnipRegion } from '../../types';

interface SnipOverlayProps {
  onCaptureComplete: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

export const SnipOverlay: React.FC<SnipOverlayProps> = ({
  onCaptureComplete,
  onCancel,
}) => {
  const [screenSource, setScreenSource] = useState<{
    dataUrl: string;
    width: number;
    height: number;
  } | null>(null);

  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    captureDesktop();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const captureDesktop = async () => {
    setLoading(true);
    setError(null);
    try {
      if ((window as any).electronAPI?.captureScreenSources) {
        const source = await (window as any).electronAPI.captureScreenSources();
        if (source) {
          setScreenSource(source);
          setLoading(false);
          return;
        }
      }

      // Fallback: Use HTML5 Screen Capture API if running in browser / dev mode
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');

      // Stop tracks
      stream.getTracks().forEach(t => t.stop());

      setScreenSource({
        dataUrl,
        width: canvas.width,
        height: canvas.height
      });
      setLoading(false);
    } catch (err: any) {
      console.error('Failed to capture desktop screen:', err);
      setError('Could not capture screen. Please check screen recording permissions.');
      setLoading(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsSelecting(true);
    setStartPos({ x: e.clientX, y: e.clientY });
    setCurrentPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting) return;
    setCurrentPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = async () => {
    if (!isSelecting || !startPos || !currentPos || !screenSource) {
      setIsSelecting(false);
      return;
    }
    setIsSelecting(false);

    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);

    if (width < 20 || height < 20) {
      // Too small, ignore
      return;
    }

    const region: SnipRegion = { x, y, width, height };

    try {
      const cropped = await ScreenAnalyzer.cropImage(
        screenSource.dataUrl,
        region,
        window.innerWidth,
        window.innerHeight
      );
      onCaptureComplete(cropped);
    } catch (e) {
      console.error('Error cropping image:', e);
      onCancel();
    }
  };

  const getSelectionBox = () => {
    if (!startPos || !currentPos) return null;
    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);

    return { x, y, width, height };
  };

  const box = getSelectionBox();

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-cyan-400 gap-3">
        <Sparkles className="w-8 h-8 animate-spin-slow" />
        <span className="text-sm font-semibold tracking-wide">Freezing Desktop Frame for Snip...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center text-rose-400 gap-3 p-6 text-center">
        <span className="text-sm font-semibold">{error}</span>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 cursor-crosshair select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{
        backgroundImage: screenSource ? `url(${screenSource.dataUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Darkened overlay mask */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px]" />

      {/* Crosshair selection rectangle */}
      {box && box.width > 0 && (
        <div
          className="absolute border-2 border-cyan-400 bg-cyan-400/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
          style={{
            left: `${box.x}px`,
            top: `${box.y}px`,
            width: `${box.width}px`,
            height: `${box.height}px`,
          }}
        >
          {/* Dimension tag */}
          <div className="absolute -top-7 left-0 bg-cyan-500 text-slate-950 text-[10px] font-bold font-mono px-2 py-0.5 rounded shadow">
            {Math.round(box.width)} × {Math.round(box.height)} px
          </div>
        </div>
      )}

      {/* Floating Instructions Bar at Top */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 rounded-full glass-panel border border-cyan-500/40 text-xs shadow-2xl backdrop-blur-xl pointer-events-auto">
        <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
          <Crop className="w-3.5 h-3.5" />
          <span>Click & Drag to Snip Region</span>
        </div>
        <span className="text-slate-500">|</span>
        <span className="text-slate-400 text-[11px]">Press <strong className="text-slate-200">ESC</strong> to Cancel</span>
        <button
          onClick={onCancel}
          className="p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
