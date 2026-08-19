import React, { useState, useEffect, useRef } from 'react';
import { 
  Copy, 
  Check, 
  Trash2, 
  Play, 
  Pause, 
  Maximize2, 
  Sparkles, 
  Mic, 
  MicOff, 
  RotateCcw, 
  Send, 
  Clock, 
  FileCode,
  Sliders,
  Crop
} from 'lucide-react';
import { AppSettings } from '../../types';
import { LLMClient } from '../../services/ai/llmClient';
import { speechService } from '../../services/audio/speechService';
import { CompanionBridge } from '../../services/companion/companionBridge';

interface TeleprompterViewProps {
  settings: AppSettings;
  llmClient: LLMClient;
  onOpenSettings: () => void;
  onExpandView: () => void;
}

const PRESET_SCRIPTS: { [key: string]: { title: string; script: string } } = {
  intro: {
    title: 'Self Introduction',
    script: `I am a Senior Software Engineer specializing in scalable backend distributed systems, event-driven architectures, and high-performance APIs.

In my recent roles, I have spearheaded microservice migrations with Kafka and Kubernetes, cutting P99 latency by over 65% across millions of daily active requests.

I prioritize clean architecture, high database concurrency, zero-downtime deployments, and pragmatic engineering execution.`
  },
  star: {
    title: 'STAR Story (Outage)',
    script: `SITUATION:
During a flash sale, our primary checkout service experienced a sudden 10x traffic spike, exhausting database connection pools.

TASK:
As the lead engineer on-call, I needed to mitigate the cascade immediately without dropping customer transactions.

ACTION:
1. Enabled emergency rate-limiting on non-critical endpoints via Envoy proxy.
2. Scaled read-replica connection pools and buffered state changes asynchronously via Kafka.
3. Deployed a hotfix adding exponential backoff and jitter to cache retries.

RESULT:
The system stabilized within 7 minutes with zero data corruption and 99.98% successful checkouts.`
  },
  systemDesign: {
    title: 'System Design Pitch',
    script: `SYSTEM DESIGN ARCHITECTURE BLUEPRINT:

1. API GATEWAY & INGRESS:
- Distributed rate-limiting via Redis token bucket.
- TLS termination and request validation at the edge.

2. SERVICE & CACHING TIER:
- Horizontally scaled stateless worker nodes.
- In-memory Redis cache for top 20% hot keys with LRU eviction.

3. DATA & STORAGE LAYER:
- Sharded PostgreSQL primary-replica setup for ACID transactions.
- Partitioned Kafka topics for async write-behind operations.

4. OBSERVABILITY:
- Distributed tracing with OpenTelemetry and Prometheus alert thresholds.`
  },
  behavioral: {
    title: 'Handling Disagreements',
    script: `APPROACH TO ENGINEERING DISAGREEMENTS:

1. Focus strictly on data and product trade-offs rather than subjective opinions.
2. Prototype small proof-of-concepts (POCs) or benchmark load tests to gather empirical metrics.
3. Align on the shared objective: customer latency, maintainability, and delivery timeline.
4. Agree on a testable path forward, commit fully as a unified team, and conduct a post-launch review.`
  }
};

export const TeleprompterView: React.FC<TeleprompterViewProps> = ({
  settings,
  llmClient,
  onOpenSettings,
  onExpandView,
}) => {
  const [prompterText, setPrompterText] = useState<string>(PRESET_SCRIPTS.intro.script);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isMirrored, setIsMirrored] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState<number>(1);
  const [fontSize, setFontSize] = useState<number>(18);
  const [copied, setCopied] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [aiTopicInput, setAiTopicInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  // Calculate speaking statistics
  const wordCount = prompterText.trim().split(/\s+/).filter(Boolean).length;
  const estimatedMinutes = Math.max(1, Math.round(wordCount / 130)); // ~130 WPM normal speaking rate

  // Auto-scroll loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    let lastTime = performance.now();

    const step = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (scrollContainerRef.current) {
        const pixelsPerSecond = 28 * scrollSpeed;
        scrollContainerRef.current.scrollTop += pixelsPerSecond * delta;

        const isAtBottom = 
          scrollContainerRef.current.scrollHeight - scrollContainerRef.current.scrollTop <= 
          scrollContainerRef.current.clientHeight + 4;

        if (isAtBottom) {
          setIsPlaying(false);
          return;
        }
      }

      animationRef.current = requestAnimationFrame(step);
    };

    animationRef.current = requestAnimationFrame(step);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, scrollSpeed]);

  // Global spacebar toggle for teleprompter scrolling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isEditing && (e.target as HTMLElement)?.tagName !== 'INPUT' && (e.target as HTMLElement)?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing]);

  const handleGenerateScript = async (topic?: string) => {
    const promptSubject = (topic || aiTopicInput).trim();
    if (!promptSubject) return;

    const currentKey = settings.apiKeys[settings.selectedProvider];
    if (settings.selectedProvider !== 'ollama' && !currentKey?.trim()) {
      onOpenSettings();
      return;
    }

    setIsGenerating(true);
    setStatusMsg('Generating teleprompter script...');
    handleResetTop();

    try {
      let accumulated = '';
      const prompt = `Write a clean, spoken teleprompter script for the following interview question/topic: "${promptSubject}". Format into crisp, natural speaking paragraphs with clear line breaks. Do not include markdown headers or meta commentary—only the spoken words formatted for teleprompter delivery.`;

      await llmClient.generate({
        prompt,
        onChunk: (chunk) => {
          accumulated += chunk;
          setPrompterText(accumulated);
          CompanionBridge.broadcastSolution(accumulated);
        }
      });

      CompanionBridge.broadcastSolution(accumulated);
      setAiTopicInput('');
      setStatusMsg('');
      setIsPlaying(true); // Automatically start scrolling
    } catch (err: any) {
      setStatusMsg(`Generation error: ${err.message || err}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      speechService.stop();
      setIsListening(false);
      setAudioLevel(0);
      setStatusMsg('');
    } else {
      setStatusMsg('Listening to interviewer...');
      speechService.start({
        onInterimText: (text) => {
          setStatusMsg(text);
          if (text) CompanionBridge.broadcastTranscript(text);
        },
        onFinalText: (text) => {
          setStatusMsg('');
          if (!text.trim()) return;

          CompanionBridge.broadcastTranscript(text);
          handleGenerateScript(text.trim());
        },
        onError: (err) => {
          setStatusMsg(`Audio: ${err}`);
        },
        onStateChange: (state) => {
          setIsListening(state);
        },
        onAudioLevel: (lvl) => {
          setAudioLevel(lvl);
        }
      });
      setIsListening(true);
    }
  };

  const handleCopy = () => {
    if ((window as any).electronAPI?.copyToClipboard) {
      (window as any).electronAPI.copyToClipboard(prompterText);
    } else {
      navigator.clipboard.writeText(prompterText);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col h-full bg-black text-white overflow-hidden select-none relative font-sans">
      {/* 1. Quick AI Prompt & Audio Control Strip */}
      <div className="p-2.5 bg-zinc-950 border-b border-white/10 space-y-2">
        <div className="flex items-center gap-2">
          {/* AI Generator Input */}
          <div className="flex-1 flex items-center bg-zinc-900 border border-white/10 rounded-lg px-2 py-1 focus-within:border-white transition-all">
            <Sparkles className="w-3.5 h-3.5 text-zinc-400 mr-1.5 shrink-0" />
            <input
              type="text"
              value={aiTopicInput}
              onChange={(e) => setAiTopicInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleGenerateScript(); }}
              placeholder="Ask AI to generate speech (e.g. Tell me about yourself, CAP Theorem)..."
              className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
            />
            <button
              onClick={() => handleGenerateScript()}
              disabled={isGenerating || !aiTopicInput.trim()}
              className="px-2 py-0.5 rounded bg-white text-black hover:bg-zinc-200 text-[11px] font-bold disabled:opacity-30 transition-all flex items-center gap-1 shrink-0"
            >
              <Send className="w-2.5 h-2.5" />
              <span>Generate</span>
            </button>
          </div>

          {/* Live Voice Ear Button */}
          <button
            onClick={toggleListening}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isListening
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-white/10'
            }`}
            title="Listen to question via mic/earbuds and auto-generate prompter response"
          >
            {isListening ? <Mic className="w-3.5 h-3.5 text-rose-400" /> : <MicOff className="w-3.5 h-3.5 text-zinc-400" />}
            <span>{isListening ? `${audioLevel}%` : 'Live Ear'}</span>
          </button>
        </div>

        {/* Preset Quick Chips */}
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-zinc-500 text-[10px] font-mono">Presets:</span>
            {Object.entries(PRESET_SCRIPTS).map(([key, item]) => (
              <button
                key={key}
                onClick={() => { setPrompterText(item.script); handleResetTop(); }}
                className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 text-[10px] whitespace-nowrap transition-colors"
              >
                {item.title}
              </button>
            ))}
          </div>

          {statusMsg && (
            <span className="text-[10px] text-zinc-400 italic truncate max-w-[180px]">
              {statusMsg}
            </span>
          )}
        </div>
      </div>

      {/* 2. Prompter Toolbar (Speed, Mode, Font, Play/Pause) */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-950/90 border-b border-white/10 text-xs">
        {/* Play/Pause & Reset */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all ${
              isPlaying
                ? 'bg-white text-black border-white shadow-lg'
                : 'bg-zinc-900 hover:bg-zinc-800 text-white border-white/20'
            }`}
            title="Toggle Scroll (Spacebar)"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 text-black" /> : <Play className="w-3.5 h-3.5 text-white fill-white" />}
            <span>{isPlaying ? 'Pause (Space)' : 'Start Scroll'}</span>
          </button>

          <button
            onClick={handleResetTop}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white"
            title="Reset to Top"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Speed & Mode Controls */}
        <div className="flex items-center gap-2">
          {/* Speed Selector */}
          <div className="flex items-center bg-zinc-900 border border-white/10 rounded-lg p-0.5 text-[10px]">
            {[0.5, 0.75, 1, 1.5, 2].map((spd) => (
              <button
                key={spd}
                onClick={() => setScrollSpeed(spd)}
                className={`px-1.5 py-0.5 rounded font-mono font-semibold transition-colors ${
                  scrollSpeed === spd ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Edit / Read Mode */}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-2 py-1 rounded-lg border text-[11px] font-medium transition-colors ${
              isEditing ? 'bg-white text-black border-white font-bold' : 'bg-zinc-900 text-zinc-300 border-white/10 hover:text-white'
            }`}
            title={isEditing ? 'Switch to Read View' : 'Edit Script Text'}
          >
            {isEditing ? 'Read View' : 'Edit'}
          </button>

          {/* Mirror Flip Mode */}
          <button
            onClick={() => setIsMirrored(!isMirrored)}
            className={`px-2 py-1 rounded-lg border text-[11px] font-medium transition-colors ${
              isMirrored ? 'bg-white text-black border-white font-bold' : 'bg-zinc-900 text-zinc-300 border-white/10 hover:text-white'
            }`}
            title="Mirror / Invert Text (for Glass Prompters)"
          >
            Mirror
          </button>

          {/* Copy Script */}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white transition-colors"
            title="Copy Full Script"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Expand View */}
          <button
            onClick={onExpandView}
            className="p-1.5 rounded-lg bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white transition-colors"
            title="Expand to Full Copilot View"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Eye Horizon Reading Line Marker */}
      <div className="absolute top-[38%] left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none z-10 flex items-center justify-end px-4">
        <span className="text-[8px] font-mono text-zinc-400 uppercase tracking-widest bg-black/60 px-1 rounded">
          Eye Line
        </span>
      </div>

      {/* 4. Teleprompter Scrolling Content Area */}
      <div 
        ref={scrollContainerRef}
        className={`flex-1 overflow-y-auto p-6 leading-relaxed select-text transition-all ${
          isMirrored ? 'scale-x-[-1]' : ''
        }`}
        style={{ fontSize: `${fontSize}px` }}
      >
        {isEditing ? (
          <textarea
            value={prompterText}
            onChange={(e) => setPrompterText(e.target.value)}
            placeholder="Type or paste your speech text here..."
            className="w-full h-full min-h-[360px] bg-transparent resize-none border-none outline-none text-white placeholder-zinc-600 font-sans leading-relaxed"
            style={{ fontSize: `${fontSize}px` }}
          />
        ) : (
          <div 
            className="text-zinc-100 font-sans leading-relaxed whitespace-pre-wrap pb-40 space-y-4"
            style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}
          >
            {prompterText.split('\n\n').map((paragraph, idx) => (
              <p key={idx} className="transition-opacity hover:opacity-100">
                {paragraph}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* 5. Teleprompter Footer Stats Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-950 border-t border-white/10 text-[11px] text-zinc-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <FileCode className="w-3 h-3 text-zinc-500" />
            <strong className="text-zinc-200">{wordCount}</strong> words
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-zinc-500" />
            ~<strong className="text-zinc-200">{estimatedMinutes}</strong> min speech
          </span>
        </div>

        {/* Font Size Adjuster */}
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500 text-[10px]">Font:</span>
          <button 
            onClick={() => setFontSize(Math.max(14, fontSize - 2))} 
            className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-white font-bold"
          >
            -
          </button>
          <span className="font-mono text-zinc-200 w-8 text-center">{fontSize}px</span>
          <button 
            onClick={() => setFontSize(Math.min(36, fontSize + 2))} 
            className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-white font-bold"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};
