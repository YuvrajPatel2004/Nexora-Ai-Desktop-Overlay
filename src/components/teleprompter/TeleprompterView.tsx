import React, { useState, useEffect, useRef } from 'react';
import { 
  Tv, 
  Copy, 
  Check, 
  Trash2, 
  Play, 
  Pause, 
  ShieldCheck,
  Maximize2,
  Sparkles,
  Mic,
  MicOff,
  Crop,
  Layers,
  BookOpen
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

const PRESET_SCRIPTS = {
  intro: `# 💼 Executive Candidate Introduction

"I am a Senior Software Engineer with deep experience designing and scaling distributed backend systems, event-driven architectures, and high-throughput APIs.

In my recent roles, I have led major migrations to microservices with Kafka and Kubernetes, reducing P99 latency by over 70% while supporting tens of millions of daily active users.

I focus heavily on clean system boundaries, high availability, database indexing strategies, and mentoring engineers to build resilient software."`,

  star: `# ⭐ STAR Framework: High-Scale Outage Resolution

- **Situation:** During a Black Friday flash sale, our primary checkout service experienced a sudden 10x traffic spike, causing Redis connection timeouts and DB connection pool exhaustion.
- **Task:** As lead on-call engineer, I had to stop cascading failures across downstream payment gateways without dropping orders.
- **Action:**
  1. Immediately enabled circuit breakers via Envoy proxy to shed non-critical analytical requests.
  2. Scaled read-replica connection pools and switched to a write-behind queue pattern using Kafka.
  3. Deployed a hotfix adding jitter to Redis retry backoffs.
- **Result:** Fully stabilized within 8 minutes with zero data corruption and 99.98% successful checkouts.`,

  design: `# 📐 System Design Blueprint (High Availability)

1. **API Gateway & Rate Limiting:** Token bucket algorithm with Redis cluster for per-tenant rate limits.
2. **Stateless Service Layer:** Horizontally autoscaled Go / Node.js pods managed by Kubernetes HPA.
3. **Storage Tiering:**
   - Hot data: In-memory Redis cache (LRU eviction).
   - Core relational data: PostgreSQL with primary-replica replication & read splitting.
   - Event streaming: Partitioned Kafka topics with manual consumer offset commits.
4. **Resiliency:** Idempotency keys on all state-mutating requests, exponential backoff with jitter.`
};

export const TeleprompterView: React.FC<TeleprompterViewProps> = ({
  settings,
  llmClient,
  onOpenSettings,
  onExpandView,
}) => {
  const [prompterText, setPrompterText] = useState<string>(PRESET_SCRIPTS.intro);
  const [isPlaying, setIsPlaying] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState<number>(1);
  const [fontSize, setFontSize] = useState<number>(16);
  const [copied, setCopied] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

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
        const pixelsPerSecond = 26 * scrollSpeed;
        scrollContainerRef.current.scrollTop += pixelsPerSecond * delta;

        const isAtBottom = 
          scrollContainerRef.current.scrollHeight - scrollContainerRef.current.scrollTop <= 
          scrollContainerRef.current.clientHeight + 2;

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

  const toggleListening = () => {
    if (isListening) {
      speechService.stop();
      setIsListening(false);
      setAudioLevel(0);
      setStatusMsg('');
    } else {
      setStatusMsg('Listening to speech...');
      speechService.start({
        onInterimText: (text) => {
          setStatusMsg(text);
          if (text) CompanionBridge.broadcastTranscript(text);
        },
        onFinalText: (text) => {
          setStatusMsg('');
          if (!text.trim()) return;

          CompanionBridge.broadcastTranscript(text);
          generateAnswerForPrompter(text.trim());
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

  const generateAnswerForPrompter = async (question: string) => {
    const currentKey = settings.apiKeys[settings.selectedProvider];
    if (settings.selectedProvider !== 'ollama' && !currentKey?.trim()) {
      onOpenSettings();
      return;
    }

    setPrompterText(`## 🎙️ Spoken Question:\n"${question}"\n\n### 💡 Suggested Response:\nSynthesizing concise talking points...`);
    setIsPlaying(false);
    handleResetTop();

    try {
      let accumulated = '';
      const prompt = `The interviewer asked: "${question}". Provide concise, professional, bullet-point talking points formatted for a live spoken teleprompter. Sound confident and direct.`;

      await llmClient.generate({
        prompt,
        onChunk: (chunk) => {
          accumulated += chunk;
          setPrompterText(`## 🎙️ Spoken Question:\n"${question}"\n\n### 💡 Suggested Response:\n${accumulated}`);
          CompanionBridge.broadcastSolution(accumulated);
        }
      });

      CompanionBridge.broadcastSolution(accumulated);
      setIsPlaying(true); // Automatically start smooth teleprompter scroll
    } catch (err: any) {
      setPrompterText(`⚠️ Error generating answer: ${err.message || err}`);
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
    <div className="flex flex-col h-full bg-slate-950/85 backdrop-blur-md overflow-hidden select-none relative">
      {/* Teleprompter Top Control Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-black/60 border-b border-white/10 text-xs app-drag-region">
        <div className="flex items-center gap-2 app-no-drag">
          <button
            onClick={toggleListening}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
              isListening
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30'
            }`}
            title="Listen to interview question & auto-roll answer"
          >
            {isListening ? <Mic className="w-3 h-3 text-rose-400" /> : <MicOff className="w-3 h-3" />}
            <span>{isListening ? `${audioLevel}%` : 'Live Ear'}</span>
          </button>

          {isListening && (
            <button
              onClick={() => speechService.flushAndTranscribe()}
              className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[10px] font-semibold border border-cyan-500/30"
              title="Force Transcribe Now"
            >
              Transcribe
            </button>
          )}

          {statusMsg && (
            <span className="text-[10px] text-cyan-300 italic truncate max-w-[140px]">
              {statusMsg}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 app-no-drag">
          {/* Preset Prompts */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setPrompterText(PRESET_SCRIPTS.intro); handleResetTop(); }}
              className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 hover:text-white"
              title="Load Intro Script"
            >
              Intro
            </button>
            <button
              onClick={() => { setPrompterText(PRESET_SCRIPTS.star); handleResetTop(); }}
              className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 hover:text-white"
              title="Load STAR Story"
            >
              STAR
            </button>
            <button
              onClick={() => { setPrompterText(PRESET_SCRIPTS.design); handleResetTop(); }}
              className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 hover:text-white"
              title="Load System Design Strategy"
            >
              Design
            </button>
          </div>

          {/* Speed */}
          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-slate-300">
            {[0.5, 1, 1.5, 2].map((spd) => (
              <button
                key={spd}
                onClick={() => setScrollSpeed(spd)}
                className={`px-1 rounded font-mono font-bold ${
                  scrollSpeed === spd ? 'bg-cyan-500/30 text-cyan-300' : 'text-slate-400'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Play / Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${
              isPlaying 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30'
            }`}
          >
            {isPlaying ? <Pause className="w-3 h-3 text-emerald-400" /> : <Play className="w-3 h-3" />}
            <span>{isPlaying ? 'Scrolling' : 'Scroll'}</span>
          </button>

          <button
            onClick={handleCopy}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-emerald-400"
            title="Copy Text"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onExpandView}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
            title="Expand Full Panel"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Eye Horizon Reading Marker */}
      <div className="absolute top-[35%] left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent pointer-events-none z-10 flex items-center justify-end px-3">
        <span className="text-[9px] font-mono text-cyan-400/60 uppercase tracking-widest">
          Eye Line
        </span>
      </div>

      {/* Scrollable Teleprompter Content */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-6 leading-relaxed font-sans text-slate-100 selection:bg-cyan-500/30 custom-scrollbar scroll-smooth"
        style={{ fontSize: `${fontSize}px` }}
      >
        <textarea
          value={prompterText}
          onChange={(e) => setPrompterText(e.target.value)}
          placeholder="Speak or paste your speech text here..."
          className="w-full h-full min-h-[300px] bg-transparent resize-none border-none outline-none text-slate-100 placeholder-slate-600 font-sans leading-relaxed custom-scrollbar whitespace-pre-wrap"
          style={{ fontSize: `${fontSize}px` }}
        />
      </div>

      {/* Bottom Floating Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-black/40 border-t border-white/5 text-[10px] text-slate-400">
        <div className="flex items-center gap-2">
          <span>Font:</span>
          <button onClick={() => setFontSize(Math.max(12, fontSize - 2))} className="hover:text-cyan-300 font-bold px-1">-</button>
          <span className="font-mono text-cyan-300">{fontSize}px</span>
          <button onClick={() => setFontSize(Math.min(32, fontSize + 2))} className="hover:text-cyan-300 font-bold px-1">+</button>
        </div>

        <button
          onClick={handleResetTop}
          className="text-slate-400 hover:text-cyan-300 font-medium transition-colors"
        >
          Reset to Top
        </button>
      </div>
    </div>
  );
};
