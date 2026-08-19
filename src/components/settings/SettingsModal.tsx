import React, { useState, useEffect } from 'react';
import { 
  X, 
  Key, 
  ShieldCheck, 
  Cpu, 
  Sliders, 
  Keyboard, 
  Palette, 
  Sparkles, 
  Check, 
  ExternalLink,
  Lock,
  Globe,
  Terminal,
  EyeOff,
  Mic,
  Volume2
} from 'lucide-react';
import { AppSettings, LLMProvider, AppTheme, SystemPromptPreset } from '../../types';
import { AVAILABLE_MODELS } from '../../services/storage/settingsStore';
import { speechService, AudioInputDevice } from '../../services/audio/speechService';

interface SettingsModalProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'byok' | 'stealth' | 'prompts' | 'hotkeys' | 'appearance'>('byok');
  const [testStatus, setTestStatus] = useState<{ [key: string]: 'testing' | 'success' | 'error' | null }>({});
  const [savedBadge, setSavedBadge] = useState(false);
  const [audioDevices, setAudioDevices] = useState<AudioInputDevice[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('default');

  useEffect(() => {
    const loadDevices = async () => {
      const devices = await speechService.getAudioDevices();
      setAudioDevices(devices);
    };
    loadDevices();
    navigator.mediaDevices?.addEventListener('devicechange', loadDevices);
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', loadDevices);
    };
  }, []);

  const handleApiKeyChange = (provider: LLMProvider, keyVal: string) => {
    onUpdateSettings({
      apiKeys: {
        ...settings.apiKeys,
        [provider]: keyVal,
      }
    });
    showSaveNotification();
  };

  const showSaveNotification = () => {
    setSavedBadge(true);
    setTimeout(() => setSavedBadge(false), 1800);
  };

  const handleTestKey = async (provider: LLMProvider) => {
    setTestStatus(prev => ({ ...prev, [provider]: 'testing' }));
    try {
      const apiKey = settings.apiKeys[provider];
      if (provider !== 'ollama' && !apiKey?.trim()) {
        throw new Error('API key is empty');
      }

      if (provider === 'gemini') {
        let res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'ping' }] }] }),
        });
        if (!res.ok) {
          res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: 'ping' }] }] }),
          });
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } else if (provider === 'openai') {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } else if (provider === 'groq') {
        const res = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } else if (provider === 'ollama') {
        const endpoint = (settings.ollamaEndpoint || 'http://localhost:11434').replace(/\/$/, '');
        const res = await fetch(`${endpoint}/api/tags`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }

      setTestStatus(prev => ({ ...prev, [provider]: 'success' }));
    } catch (e: any) {
      console.error(e);
      setTestStatus(prev => ({ ...prev, [provider]: 'error' }));
    }
  };

  const themes: { id: AppTheme; name: string; color: string }[] = [
    { id: 'cyber-stealth', name: 'Monochrome Dark (Default)', color: 'bg-white' },
    { id: 'obsidian', name: 'Obsidian Pure Black', color: 'bg-zinc-800' },
    { id: 'matrix-emerald', name: 'Matrix Emerald', color: 'bg-emerald-500' },
    { id: 'rose-gold', name: 'Rose Gold', color: 'bg-rose-500' },
    { id: 'midnight-blue', name: 'Midnight Minimal', color: 'bg-zinc-600' },
  ];

  const presets: { id: SystemPromptPreset; name: string; desc: string }[] = [
    { id: 'coding', name: 'Competitive Coding & DSA', desc: 'Optimal time/space complexity, production code, edge cases' },
    { id: 'system-design', name: 'System Design Architect', desc: 'QPS, bottlenecks, DB partitioning, scaling strategies' },
    { id: 'interview-star', name: 'STAR Behavioral Coach', desc: 'Situation, Task, Action, Result structured talking points' },
    { id: 'live-troubleshooter', name: 'Live Error Debugger', desc: 'Instant 1-sentence root causes & code diffs' },
    { id: 'exam-solver', name: 'Exam & MCQ Solver', desc: 'Direct answers first with step-by-step mathematical logic' },
    { id: 'concise-whisper', name: 'Ultra-Concise Whisper', desc: 'Stealth 1-2 sentence prompter with zero filler' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 select-none font-sans">
      <div className="w-full max-w-lg bg-zinc-950 rounded-2xl border border-white/20 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-black border-b border-white/10">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-white" />
            <h3 className="font-bold text-sm text-white">Settings & API Keys (BYOK)</h3>
            {savedBadge && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-semibold animate-pulse">
                <Check className="w-3 h-3" /> Saved
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 pt-2.5 bg-zinc-950 border-b border-white/10 text-xs overflow-x-auto no-scrollbar">
          {[
            { id: 'byok', label: 'API Keys (BYOK)', icon: <Key className="w-3.5 h-3.5" /> },
            { id: 'stealth', label: 'Screen & Audio', icon: <ShieldCheck className="w-3.5 h-3.5 text-zinc-300" /> },
            { id: 'prompts', label: 'AI Presets', icon: <Cpu className="w-3.5 h-3.5" /> },
            { id: 'appearance', label: 'Appearance', icon: <Palette className="w-3.5 h-3.5" /> },
            { id: 'hotkeys', label: 'Hotkeys', icon: <Keyboard className="w-3.5 h-3.5" /> },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 border-b-2 font-medium transition-all text-xs whitespace-nowrap ${
                activeTab === t.id
                  ? 'border-white text-white bg-white/10'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* TAB 1: BYOK API KEYS */}
          {activeTab === 'byok' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 text-zinc-300 space-y-1">
                <div className="flex items-center gap-1.5 text-white font-semibold">
                  <Lock className="w-3.5 h-3.5" />
                  <span>100% Client-Side Privacy (BYOK)</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Keys are stored exclusively on your local computer and sent directly to the official AI endpoints. Zero telemetry, no subscription locks.
                </p>
              </div>

              {/* Active Provider & Model Selection */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Active AI Provider</label>
                  <select
                    value={settings.selectedProvider}
                    onChange={(e) => {
                      const newProv = e.target.value as LLMProvider;
                      const defaultModel = AVAILABLE_MODELS.find(m => m.provider === newProv)?.id || '';
                      onUpdateSettings({ selectedProvider: newProv, selectedModel: defaultModel });
                    }}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-white font-mono"
                  >
                    <option value="gemini">Google Gemini (Recommended / Free)</option>
                    <option value="openai">OpenAI (GPT-4o, o3-mini)</option>
                    <option value="anthropic">Anthropic Claude (Claude 3.7)</option>
                    <option value="groq">Groq (Llama 3.3 70B - Ultra Fast)</option>
                    <option value="deepseek">DeepSeek (V3 & R1)</option>
                    <option value="ollama">Local Ollama (Offline)</option>
                    <option value="custom">Custom Endpoint</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Selected Model</label>
                  <select
                    value={settings.selectedModel}
                    onChange={(e) => onUpdateSettings({ selectedModel: e.target.value })}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-white font-mono"
                  >
                    {AVAILABLE_MODELS.filter(m => m.provider === settings.selectedProvider).map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.isFast ? '⚡' : ''} {m.isVision ? '👁️' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Provider Key Fields */}
              <div className="space-y-3 pt-2">
                {/* Gemini */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-zinc-300">Google Gemini API Key (Free tier supported)</span>
                    <button
                      onClick={() => handleTestKey('gemini')}
                      className="text-zinc-400 hover:text-white underline font-mono"
                    >
                      {testStatus.gemini === 'testing' ? 'Testing...' : testStatus.gemini === 'success' ? '✅ Connected' : testStatus.gemini === 'error' ? '❌ Invalid' : 'Test Key'}
                    </button>
                  </div>
                  <input
                    type="password"
                    value={settings.apiKeys.gemini}
                    onChange={(e) => handleApiKeyChange('gemini', e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-white"
                  />
                </div>

                {/* OpenAI */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-zinc-300">OpenAI API Key</span>
                    <button
                      onClick={() => handleTestKey('openai')}
                      className="text-zinc-400 hover:text-white underline font-mono"
                    >
                      {testStatus.openai === 'testing' ? 'Testing...' : testStatus.openai === 'success' ? '✅ Connected' : testStatus.openai === 'error' ? '❌ Invalid' : 'Test Key'}
                    </button>
                  </div>
                  <input
                    type="password"
                    value={settings.apiKeys.openai}
                    onChange={(e) => handleApiKeyChange('openai', e.target.value)}
                    placeholder="sk-proj-..."
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-white"
                  />
                </div>

                {/* Anthropic Claude */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-zinc-300">Anthropic Claude API Key</span>
                  </div>
                  <input
                    type="password"
                    value={settings.apiKeys.anthropic}
                    onChange={(e) => handleApiKeyChange('anthropic', e.target.value)}
                    placeholder="sk-ant-..."
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-white"
                  />
                </div>

                {/* Groq */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-zinc-300">Groq API Key (Ultra-Low Latency)</span>
                    <button
                      onClick={() => handleTestKey('groq')}
                      className="text-zinc-400 hover:text-white underline font-mono"
                    >
                      {testStatus.groq === 'testing' ? 'Testing...' : testStatus.groq === 'success' ? '✅ Connected' : testStatus.groq === 'error' ? '❌ Invalid' : 'Test Key'}
                    </button>
                  </div>
                  <input
                    type="password"
                    value={settings.apiKeys.groq}
                    onChange={(e) => handleApiKeyChange('groq', e.target.value)}
                    placeholder="gsk_..."
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-white"
                  />
                </div>

                {/* DeepSeek */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-zinc-300">DeepSeek API Key</span>
                  </div>
                  <input
                    type="password"
                    value={settings.apiKeys.deepseek}
                    onChange={(e) => handleApiKeyChange('deepseek', e.target.value)}
                    placeholder="sk-..."
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-white"
                  />
                </div>

                {/* Local Ollama Settings */}
                {settings.selectedProvider === 'ollama' && (
                  <div className="p-3 rounded-lg bg-zinc-900 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-200">Local Ollama Configuration</span>
                      <button
                        onClick={() => handleTestKey('ollama')}
                        className="text-zinc-400 hover:text-white underline font-mono text-[11px]"
                      >
                        {testStatus.ollama === 'testing' ? 'Connecting...' : testStatus.ollama === 'success' ? '✅ Ollama Running' : testStatus.ollama === 'error' ? '❌ Not Found' : 'Check Server'}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={settings.ollamaEndpoint}
                      onChange={(e) => onUpdateSettings({ ollamaEndpoint: e.target.value })}
                      placeholder="http://localhost:11434"
                      className="w-full bg-black border border-white/10 rounded-lg p-2 text-xs font-mono text-white focus:outline-none focus:border-white"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: STEALTH & AUDIO */}
          {activeTab === 'stealth' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 text-zinc-300 space-y-1.5">
                <div className="flex items-center gap-1.5 text-white font-semibold">
                  <ShieldCheck className="w-4 h-4 text-zinc-200" />
                  <span>Screenshare Protection & Hardware Routing</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  On Windows, Nexora uses hardware-level <code className="text-white">WDA_EXCLUDEFROMCAPTURE</code> so your screen shares in Zoom, Google Meet, Teams, and Discord see straight through the overlay with zero black boxes.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-white/10">
                  <div>
                    <span className="font-semibold text-zinc-200">Always on Top</span>
                    <p className="text-[10px] text-zinc-400">Keep overlay floating above all full-screen windows & IDEs</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.alwaysOnTop}
                    onChange={(e) => {
                      onUpdateSettings({ alwaysOnTop: e.target.checked });
                      if ((window as any).electronAPI?.setAlwaysOnTop) {
                        (window as any).electronAPI.setAlwaysOnTop(e.target.checked);
                      }
                    }}
                    className="w-4 h-4 accent-white cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-white/10">
                  <div>
                    <span className="font-semibold text-zinc-200">Click-Through HUD Mode</span>
                    <p className="text-[10px] text-zinc-400">Allow mouse clicks to pass directly to applications beneath</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.clickThroughEnabled}
                    onChange={(e) => {
                      onUpdateSettings({ clickThroughEnabled: e.target.checked });
                      if ((window as any).electronAPI?.setIgnoreMouseEvents) {
                        (window as any).electronAPI.setIgnoreMouseEvents(e.target.checked, { forward: true });
                      }
                    }}
                    className="w-4 h-4 accent-white cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-white/10">
                  <div>
                    <span className="font-semibold text-zinc-200">Auto-Solve on Screen Snip</span>
                    <p className="text-[10px] text-zinc-400">Instantly generate solution as soon as you crop an area</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoSolveSnips}
                    onChange={(e) => onUpdateSettings({ autoSolveSnips: e.target.checked })}
                    className="w-4 h-4 accent-white cursor-pointer"
                  />
                </div>

                {/* Audio Input Device Selector */}
                <div className="p-3 rounded-lg bg-zinc-900 border border-white/10 space-y-2">
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-white" />
                    <div>
                      <span className="font-semibold text-zinc-200">Microphone & Earbuds Audio Input</span>
                      <p className="text-[10px] text-zinc-400">Choose which audio device (earbuds, USB mic, headset) feeds the AI Interview Ear</p>
                    </div>
                  </div>
                  <select
                    value={selectedAudioDevice}
                    onChange={(e) => {
                      setSelectedAudioDevice(e.target.value);
                      speechService.setSelectedDevice(e.target.value);
                      showSaveNotification();
                    }}
                    className="w-full bg-black border border-white/10 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-white font-mono"
                  >
                    <option value="default">System Default Device</option>
                    {audioDevices
                      .filter(d => d.deviceId !== 'default' && d.deviceId !== 'communications')
                      .map(d => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PROMPT PRESETS */}
          {activeTab === 'prompts' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Preferred Code Language</label>
                <select
                  value={settings.preferredLanguage}
                  onChange={(e) => onUpdateSettings({ preferredLanguage: e.target.value })}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-white font-mono"
                >
                  {['Python', 'TypeScript', 'Java', 'C++', 'Go', 'Rust', 'JavaScript', 'SQL'].map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1.5">Preset Reasoning Mode</label>
                <div className="space-y-2">
                  {presets.map(p => (
                    <div
                      key={p.id}
                      onClick={() => onUpdateSettings({ promptPreset: p.id })}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                        settings.promptPreset === p.id
                          ? 'bg-zinc-800 border-white text-white shadow'
                          : 'bg-zinc-900/60 border-white/5 text-zinc-400 hover:bg-zinc-800'
                      }`}
                    >
                      <div className="font-semibold text-xs text-white">{p.name}</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">{p.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1.5">Color Theme</label>
                <div className="grid grid-cols-2 gap-2">
                  {themes.map(th => (
                    <button
                      key={th.id}
                      onClick={() => onUpdateSettings({ theme: th.id })}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
                        settings.theme === th.id
                          ? 'bg-zinc-800 border-white text-white'
                          : 'bg-zinc-900/60 border-white/5 text-zinc-400 hover:bg-zinc-800'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full ${th.color} shrink-0`} />
                      <span className="text-xs font-medium text-white">{th.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Text Font Size</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['xs', 'sm', 'base', 'lg'] as const).map(sz => (
                    <button
                      key={sz}
                      onClick={() => onUpdateSettings({ fontSize: sz })}
                      className={`py-1.5 rounded-lg border text-center font-mono text-xs uppercase ${
                        settings.fontSize === sz
                          ? 'bg-white text-black font-bold'
                          : 'bg-zinc-900 border-white/10 text-zinc-400 hover:bg-zinc-800'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: HOTKEYS */}
          {activeTab === 'hotkeys' && (
            <div className="space-y-3 font-mono text-xs">
              {[
                { key: 'Ctrl + Shift + S', desc: 'Snip Region of Screen to Solve' },
                { key: 'Ctrl + Shift + F', desc: 'Full Screen Instant Capture' },
                { key: 'Ctrl + Shift + A', desc: 'Toggle Real-Time AI Interview Ear' },
                { key: 'Ctrl + Shift + V', desc: 'Paste Screenshot from Clipboard' },
                { key: 'Ctrl + Shift + H', desc: 'Panic Hide / Boss Key (Instant vanish)' },
                { key: 'Alt + Space', desc: 'Toggle Overlay Visibility' },
              ].map((hk, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900 border border-white/10">
                  <span className="text-zinc-300 text-[11px] font-sans">{hk.desc}</span>
                  <span className="px-2 py-0.5 rounded bg-black border border-white/20 text-white text-[10px] font-bold">
                    {hk.key}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
