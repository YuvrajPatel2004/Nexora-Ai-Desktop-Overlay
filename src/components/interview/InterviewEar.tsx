import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Sparkles, 
  Copy, 
  Check, 
  Trash2, 
  Volume2, 
  Bot, 
  Radio
} from 'lucide-react';
import { AppSettings, SpeechTranscript } from '../../types';
import { LLMClient } from '../../services/ai/llmClient';
import { speechService, AudioInputDevice } from '../../services/audio/speechService';
import { MarkdownRenderer } from '../common/MarkdownRenderer';
import { CompanionBridge } from '../../services/companion/companionBridge';

interface InterviewEarProps {
  settings: AppSettings;
  llmClient: LLMClient;
  onOpenSettings: () => void;
}

export const InterviewEar: React.FC<InterviewEarProps> = ({
  settings,
  llmClient,
  onOpenSettings,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [captureMode, setCaptureMode] = useState<'dual' | 'mic' | 'system'>('dual');
  const [interimText, setInterimText] = useState('');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [transcripts, setTranscripts] = useState<SpeechTranscript[]>([]);
  const [activeGeneratingId, setActiveGeneratingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Ready to listen to interview audio');
  const [audioDevices, setAudioDevices] = useState<AudioInputDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('default');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Enumerate audio devices on mount and when devices change
  useEffect(() => {
    const loadDevices = async () => {
      const devices = await speechService.getAudioDevices();
      setAudioDevices(devices);
    };
    loadDevices();

    // Re-enumerate when devices are plugged in or removed
    const handleDeviceChange = () => {
      loadDevices();
    };
    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts, interimText]);

  const handleModeChange = (mode: 'dual' | 'mic' | 'system') => {
    setCaptureMode(mode);
    speechService.setCaptureMode(mode);
    if (isListening) {
      speechService.stop();
      setTimeout(toggleListening, 150);
    }
  };

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDevice(deviceId);
    speechService.setSelectedDevice(deviceId);
    // Restart capture with the new device if currently listening
    if (isListening) {
      speechService.stop();
      setTimeout(toggleListening, 150);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      speechService.stop();
      setIsListening(false);
      setAudioLevel(0);
      setStatusMessage('Listening paused.');
    } else {
      speechService.setCaptureMode(captureMode);
      setStatusMessage('Listening to microphone & speaker audio...');
      speechService.start({
        onInterimText: (text) => {
          setInterimText(text);
          if (text) {
            CompanionBridge.broadcastTranscript(text);
          }
        },
        onFinalText: (text) => {
          setInterimText('');
          if (!text.trim()) return;

          const newId = `tr-${Date.now()}`;
          const newTranscript: SpeechTranscript = {
            id: newId,
            text,
            timestamp: Date.now(),
            isFinal: true,
          };

          setTranscripts(prev => [...prev, newTranscript]);
          CompanionBridge.broadcastTranscript(text);

          // If auto-suggest is enabled and it looks like a question or key discussion point
          if (settings.autoSuggestAudio && isLikelyQuestion(text)) {
            generateAnswerForTranscript(newId, text);
          }
        },
        onError: (err) => {
          setStatusMessage(`Audio warning: ${err}`);
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

  const isLikelyQuestion = (text: string): boolean => {
    const lower = text.toLowerCase();
    const questionWords = [
      'what', 'why', 'how', 'when', 'where', 'who', 'which', 
      'can you', 'could you', 'explain', 'describe', 'tell me about', 
      'design', 'implement', 'time complexity', 'space complexity', 
      'difference between', 'have you used', 'walk me through'
    ];
    return lower.includes('?') || questionWords.some(w => lower.startsWith(w) || lower.includes(` ${w} `));
  };

  const generateAnswerForTranscript = async (id: string, text: string) => {
    const currentKey = settings.apiKeys[settings.selectedProvider];
    if (settings.selectedProvider !== 'ollama' && !currentKey?.trim()) {
      onOpenSettings();
      return;
    }

    setActiveGeneratingId(id);
    setTranscripts(prev =>
      prev.map(t => t.id === id ? { ...t, isGenerating: true, aiResponse: '' } : t)
    );

    try {
      let accumulated = '';
      const prompt = `The interviewer just asked:\n"${text}"\n\nProvide the optimal, crisp, professional response bullet points (or STAR method if behavioral, or algorithm approach if technical). Keep it concise for verbal delivery.`;

      await llmClient.generate({
        prompt,
        onChunk: (chunk) => {
          accumulated += chunk;
          setTranscripts(prev =>
            prev.map(t => t.id === id ? { ...t, aiResponse: accumulated } : t)
          );
          CompanionBridge.broadcastSolution(accumulated);
        }
      });
      CompanionBridge.broadcastSolution(accumulated);
    } catch (err: any) {
      setTranscripts(prev =>
        prev.map(t =>
          t.id === id
            ? { ...t, aiResponse: `⚠️ Error: ${err.message || 'Could not generate answer'}` }
            : t
        )
      );
    } finally {
      setTranscripts(prev =>
        prev.map(t => t.id === id ? { ...t, isGenerating: false } : t)
      );
      setActiveGeneratingId(null);
    }
  };

  const handleCopy = (id: string, text: string) => {
    if ((window as any).electronAPI?.copyToClipboard) {
      (window as any).electronAPI.copyToClipboard(text);
    } else {
      navigator.clipboard.writeText(text);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      {/* Ear Status & Control Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-black/40 border-b border-white/5 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleListening}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              isListening
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-neon-rose pulse-emerald-glow'
                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30'
            }`}
          >
            {isListening ? (
              <>
                <Mic className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span>Listening Active</span>
              </>
            ) : (
              <>
                <MicOff className="w-3.5 h-3.5" />
                <span>Start Ear (Ctrl+Shift+A)</span>
              </>
            )}
          </button>

          {/* Real Audio Waveform / VU Meter */}
          {isListening && (
            <>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/50 border border-white/10" title={`Mic Level: ${audioLevel}% (Noise baseline calibrated)`}>
                <span 
                  className="w-1 bg-cyan-400 rounded-full transition-all duration-75" 
                  style={{ height: `${Math.max(4, Math.min(18, (audioLevel / 100) * 18))}px` }} 
                />
                <span 
                  className="w-1 bg-cyan-300 rounded-full transition-all duration-75" 
                  style={{ height: `${Math.max(4, Math.min(22, (audioLevel / 80) * 22))}px` }} 
                />
                <span 
                  className="w-1 bg-cyan-400 rounded-full transition-all duration-75" 
                  style={{ height: `${Math.max(4, Math.min(18, (audioLevel / 100) * 18))}px` }} 
                />
                <span className="text-[10px] font-mono text-cyan-300 ml-1">
                  {audioLevel > 5 ? `${audioLevel}%` : 'Silent'}
                </span>
              </div>

              <button
                onClick={() => speechService.flushAndTranscribe()}
                className="px-2 py-0.5 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold flex items-center gap-1 transition-colors"
                title="Immediately transcribe what was just said without waiting for silence"
              >
                <Sparkles className="w-2.5 h-2.5" />
                <span>Transcribe Now</span>
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Audio Device Selector */}
          <div className="flex items-center gap-1">
            <Mic className="w-3 h-3 text-slate-400 shrink-0" />
            <select
              value={selectedDevice}
              onChange={(e) => handleDeviceChange(e.target.value)}
              className="bg-black/50 border border-white/10 text-slate-200 text-[10px] rounded px-1 py-0.5 focus:outline-none focus:border-cyan-400 max-w-[120px] truncate"
              title="Select audio input device (earbuds, external mic, etc.)"
            >
              <option value="default">System Default</option>
              {audioDevices
                .filter(d => d.deviceId !== 'default' && d.deviceId !== 'communications')
                .map(d => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))}
            </select>
          </div>

          {/* Audio Source Mode Switcher */}
          <div className="flex items-center gap-0.5 bg-black/40 border border-white/10 rounded-lg p-0.5 text-[10px]">
            <button
              onClick={() => handleModeChange('dual')}
              className={`px-1.5 py-0.5 rounded font-semibold transition-colors ${
                captureMode === 'dual' ? 'bg-cyan-500/30 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Dual Mix: Listens to both your Microphone AND Interviewer Earphone/Speaker audio"
            >
              Dual Mix
            </button>
            <button
              onClick={() => handleModeChange('mic')}
              className={`px-1.5 py-0.5 rounded font-semibold transition-colors ${
                captureMode === 'mic' ? 'bg-cyan-500/30 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Microphone Only"
            >
              Mic
            </button>
            <button
              onClick={() => handleModeChange('system')}
              className={`px-1.5 py-0.5 rounded font-semibold transition-colors ${
                captureMode === 'system' ? 'bg-cyan-500/30 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Earphones / System Audio Only"
            >
              Earphones
            </button>
          </div>

          <button
            onClick={() => setTranscripts([])}
            className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-rose-400 transition-colors"
            title="Clear Audio Transcripts"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Transcript & Answers Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {transcripts.length === 0 && !interimText && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400 space-y-3">
            <div className="p-4 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Radio className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-200 text-sm">Real-time Interview Ear Ready</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                Click <strong>Start Ear</strong> or press <code className="text-cyan-300">Ctrl+Shift+A</code>. Nexora will capture speaker audio from your mic, transcribe questions via Whisper, and generate answers automatically.
              </p>
            </div>
          </div>
        )}

        {transcripts.map((t) => (
          <div key={t.id} className="space-y-2 group">
            {/* Spoken Query Card */}
            <div className="flex items-start justify-between p-2.5 rounded-lg bg-slate-900/70 border border-white/10 text-xs text-slate-200">
              <div className="flex items-start gap-2">
                <Volume2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span className="font-mono">{t.text}</span>
              </div>

              {!t.aiResponse && !t.isGenerating && (
                <button
                  onClick={() => generateAnswerForTranscript(t.id, t.text)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-medium text-[11px] shrink-0 border border-cyan-500/30 transition-colors ml-2"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Answer</span>
                </button>
              )}
            </div>

            {/* AI Suggested Response Card */}
            {(t.aiResponse || t.isGenerating) && (
              <div className="pl-3 border-l-2 border-cyan-500/40 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-cyan-400 font-mono">
                  <div className="flex items-center gap-1">
                    <Bot className="w-3 h-3" />
                    <span>Suggested Response:</span>
                  </div>
                  {t.aiResponse && (
                    <button
                      onClick={() => handleCopy(t.id, t.aiResponse || '')}
                      className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1"
                      title="Copy response"
                    >
                      {copiedId === t.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="glass-panel p-3 rounded-lg text-xs">
                  <MarkdownRenderer
                    content={t.aiResponse || 'Synthesizing optimal response...'}
                    isStreaming={t.isGenerating}
                  />
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Live Interim Speech Bubble */}
        {interimText && (
          <div className="p-2 rounded-lg bg-cyan-950/40 border border-cyan-500/20 text-xs text-cyan-200/80 italic flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
            <span className="truncate">{interimText}...</span>
          </div>
        )}

        <div ref={scrollRef} />
      </div>
    </div>
  );
};
