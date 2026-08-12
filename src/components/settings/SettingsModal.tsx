import React, { useState } from 'react';
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
  EyeOff
} from 'lucide-react';
import { AppSettings, LLMProvider, AppTheme, SystemPromptPreset } from '../../types';
import { AVAILABLE_MODELS } from '../../services/storage/settingsStore';

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
    setTimeout(() => setSavedBadge(false), 2000);
  };

  const handleTestKey = async (provider: LLMProvider) => {
    setTestStatus(prev => ({ ...prev, [provider]: 'testing' }));
    try {
      const apiKey = settings.apiKeys[provider];
      if (provider !== 'ollama' && !apiKey?.trim()) {
        throw new Error('API key is empty');
      }

      if (provider === 'gemini') {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'ping' }] }] }),
        });
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
    { id: 'cyber-stealth', name: 'Cyber Stealth', color: 'bg-cyan-500' },
    { id: 'obsidian', name: 'Obsidian Pure', color: 'bg-blue-500' },
    { id: 'matrix-emerald', name: 'Matrix Emerald', color: 'bg-emerald-500' },
    { id: 'rose-gold', name: 'Rose Gold', color: 'bg-rose-500' },
    { id: 'midnight-blue', name: 'Midnight Violet', color: 'bg-purple-500' },
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
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 select-none">
      <div className="w-full max-w-lg glass-panel rounded-2xl border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-slate-100 font-sans">Settings & BYOK API Keys</h3>
            {savedBadge && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold animate-pulse">
                <Check className="w-3 h-3" /> Saved
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 pt-2.5 bg-black/40 border-b border-white/10 text-xs overflow-x-auto no-scrollbar">
          {[
            { id: 'byok', label: 'API Keys (BYOK)', icon: <Key className="w-3.5 h-3.5" /> },
            { id: 'stealth', label: 'Screen Protection', icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> },
            { id: 'prompts', label: 'AI Presets', icon: <Cpu className="w-3.5 h-3.5" /> },
            { id: 'appearance', label: 'Appearance', icon: <Palette className="w-3.5 h-3.5" /> },
            { id: 'hotkeys', label: 'Hotkeys', icon: <Keyboard className="w-3.5 h-3.5" /> },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 border-b-2 font-medium transition-all text-xs whitespace-nowrap ${
                activeTab === t.id
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
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
              <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-slate-300 space-y-1">
                <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                  <Lock className="w-3.5 h-3.5" />
                  <span>100% Client-Side Privacy (BYOK)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Keys are stored exclusively on your machine and sent directly to the official AI endpoints. Zero telemetry, no recurring subscription locks.
                </p>
              </div>

              {/* Active Provider & Model Selection */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Active AI Provider</label>
                  <select
                    value={settings.selectedProvider}
                    onChange={(e) => {
                      const newProv = e.target.value as LLMProvider;
                      const defaultModel = AVAILABLE_MODELS.find(m => m.provider === newProv)?.id || '';
                      onUpdateSettings({ selectedProvider: newProv, selectedModel: defaultModel });
                    }}
                    className="w-full bg-slate-900/90 border border-white/10 rounded-lg p-2 text-cyan-300 focus:outline-none focus:border-cyan-400"
                  >
                    <option value="gemini">Google Gemini (Recommended - Vision & Fast)</option>
                    <option value="openai">OpenAI (GPT-4o, o3-mini, o1)</option>
                    <option value="anthropic">Anthropic Claude (Claude 3.7 / 3.5)</option>
                    <option value="groq">Groq (Llama 3.3 70B - Ultra Fast)</option>
                    <option value="deepseek">DeepSeek (V3 & R1)</option>
                    <option value="ollama">Local Ollama (Offline / Private)</option>
                    <option value="custom">Custom / OpenRouter Endpoint</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Selected Model</label>
                  <select
                    value={settings.selectedModel}
                    onChange={(e) => onUpdateSettings({ selectedModel: e.target.value })}
                    className="w-full bg-slate-900/90 border border-white/10 rounded-lg p-2 text-cyan-300 focus:outline-none focus:border-cyan-400"
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
                    <span className="font-semibold text-slate-300">Google Gemini API Key</span>
                    <button
                      onClick={() => handleTestKey('gemini')}
                      className="text-cyan-400 hover:underline"
                    >
                      {testStatus.gemini === 'testing' ? 'Testing...' : testStatus.gemini === 'success' ? '✅ Connected' : testStatus.gemini === 'error' ? '❌ Invalid' : 'Test Key'}
                    </button>
                  </div>
                  <input
                    type="password"
                    value={settings.apiKeys.gemini}
                    onChange={(e) => handleApiKeyChange('gemini', e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full glass-input rounded-lg p-2 text-xs font-mono"
                  />
                </div>

                {/* OpenAI */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-300">OpenAI API Key</span>
                    <button
                      onClick={() => handleTestKey('openai')}
                      className="text-cyan-400 hover:underline"
                    >
                      {testStatus.openai === 'testing' ? 'Testing...' : testStatus.openai === 'success' ? '✅ Connected' : testStatus.openai === 'error' ? '❌ Invalid' : 'Test Key'}
                    </button>
                  </div>
                  <input
                    type="password"
                    value={settings.apiKeys.openai}
                    onChange={(e) => handleApiKeyChange('openai', e.target.value)}
                    placeholder="sk-proj-..."
                    className="w-full glass-input rounded-lg p-2 text-xs font-mono"
                  />
                </div>

                {/* Anthropic Claude */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-300">Anthropic Claude API Key</span>
                  </div>
                  <input
                    type="password"
                    value={settings.apiKeys.anthropic}
                    onChange={(e) => handleApiKeyChange('anthropic', e.target.value)}
                    placeholder="sk-ant-..."
                    className="w-full glass-input rounded-lg p-2 text-xs font-mono"
                  />
                </div>

                {/* Groq */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-300">Groq API Key (Ultra-Low Latency)</span>
                    <button
                      onClick={() => handleTestKey('groq')}
                      className="text-cyan-400 hover:underline"
                    >
                      {testStatus.groq === 'testing' ? 'Testing...' : testStatus.groq === 'success' ? '✅ Connected' : testStatus.groq === 'error' ? '❌ Invalid' : 'Test Key'}
                    </button>
                  </div>
                  <input
                    type="password"
                    value={settings.apiKeys.groq}
                    onChange={(e) => handleApiKeyChange('groq', e.target.value)}
                    placeholder="gsk_..."
                    className="w-full glass-input rounded-lg p-2 text-xs font-mono"
                  />
                </div>

                {/* DeepSeek */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-300">DeepSeek API Key</span>
                  </div>
                  <input
                    type="password"
                    value={settings.apiKeys.deepseek}
                    onChange={(e) => handleApiKeyChange('deepseek', e.target.value)}
                    placeholder="sk-..."
                    className="w-full glass-input rounded-lg p-2 text-xs font-mono"
                  />
                </div>

                {/* Local Ollama */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-300">Local Ollama Endpoint</span>
                    <button
                      onClick={() => handleTestKey('ollama')}
                      className="text-cyan-400 hover:underline"
                    >
                      {testStatus.ollama === 'testing' ? 'Testing...' : testStatus.ollama === 'success' ? '✅ Connected' : testStatus.ollama === 'error' ? '❌ Offline' : 'Test Endpoint'}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={settings.ollamaEndpoint}
                    onChange={(e) => onUpdateSettings({ ollamaEndpoint: e.target.value })}
                    placeholder="http://localhost:11434"
                    className="w-full glass-input rounded-lg p-2 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STEALTH & SCREEN PROTECTION */}
          {activeTab === 'stealth' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Hardware Screen Share Protection Active</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Nexora uses native OS window protection flags (<code>WDA_EXCLUDEFROMCAPTURE</code> on Windows and <code>NSWindowSharingNone</code> on macOS via Electron <code>setContentProtection(true)</code>).
                </p>
                <div className="text-[11px] text-slate-400 space-y-1">
                  <div>✅ <strong>Zoom:</strong> Hidden from desktop and window share.</div>
                  <div>✅ <strong>Google Meet & Teams:</strong> Completely invisible to meeting participants.</div>
                  <div>✅ <strong>Discord & OBS Studio:</strong> Captures desktop behind the overlay.</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <div>
                    <span className="font-semibold text-slate-200">Always on Top</span>
                    <p className="text-[10px] text-slate-400">Keep overlay floating above all full-screen windows & IDEs</p>
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
                    className="w-4 h-4 accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <div>
                    <span className="font-semibold text-slate-200">Click-Through HUD Mode</span>
                    <p className="text-[10px] text-slate-400">Allow mouse clicks to pass directly to applications beneath</p>
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
                    className="w-4 h-4 accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <div>
                    <span className="font-semibold text-slate-200">Auto-Solve on Screen Snip</span>
                    <p className="text-[10px] text-slate-400">Instantly generate solution as soon as you crop an area</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoSolveSnips}
                    onChange={(e) => onUpdateSettings({ autoSolveSnips: e.target.checked })}
                    className="w-4 h-4 accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PROMPT PRESETS */}
          {activeTab === 'prompts' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Preferred Code Language</label>
                <select
                  value={settings.preferredLanguage}
                  onChange={(e) => onUpdateSettings({ preferredLanguage: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-cyan-300 focus:outline-none"
                >
                  {['Python', 'TypeScript', 'JavaScript', 'Java', 'C++', 'Go', 'Rust', 'C#', 'SQL', 'Swift'].map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-2">System Persona Preset</label>
                <div className="space-y-2">
                  {presets.map(p => (
                    <div
                      key={p.id}
                      onClick={() => onUpdateSettings({ promptPreset: p.id })}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                        settings.promptPreset === p.id
                          ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-neon-cyan'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <div className="font-bold text-xs">{p.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{p.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Custom System Instructions (Optional)</label>
                <textarea
                  value={settings.customSystemPrompt}
                  onChange={(e) => onUpdateSettings({ customSystemPrompt: e.target.value })}
                  placeholder="Override default instructions (e.g. Always respond with concise bullets and emphasize space complexity)..."
                  rows={3}
                  className="w-full glass-input rounded-lg p-2 text-xs"
                />
              </div>
            </div>
          )}

          {/* TAB 4: APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-2">Theme Aesthetic</label>
                <div className="grid grid-cols-2 gap-2">
                  {themes.map(th => (
                    <button
                      key={th.id}
                      onClick={() => onUpdateSettings({ theme: th.id })}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
                        settings.theme === th.id
                          ? 'bg-white/15 border-cyan-400 text-white font-bold'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full ${th.color}`} />
                      <span className="text-xs">{th.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-semibold text-slate-300">Default Opacity</span>
                  <span className="font-mono text-cyan-400">{Math.round(settings.opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.25"
                  max="1.0"
                  step="0.05"
                  value={settings.opacity}
                  onChange={(e) => onUpdateSettings({ opacity: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
            </div>
          )}

          {/* TAB 5: HOTKEYS */}
          {activeTab === 'hotkeys' && (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-400 mb-3">
                Global hotkeys operate from any background application or full-screen window:
              </p>

              {[
                { key: 'Alt + Space / Ctrl + Shift + Space', desc: 'Toggle Show / Hide Overlay' },
                { key: 'Ctrl + Shift + S', desc: 'Interactive Screen Region Snip & Solve' },
                { key: 'Ctrl + Shift + F', desc: 'Instant Fullscreen Snap & Solve' },
                { key: 'Ctrl + Shift + A', desc: 'Toggle Real-Time Audio Interview Ear' },
                { key: 'Ctrl + Shift + H', desc: 'Emergency Panic / Boss Hide' },
                { key: 'Ctrl + Shift + T', desc: 'Toggle Click-Through Pass-Through' },
                { key: 'Ctrl + Shift + C', desc: 'Quick Copy Latest AI Solution' },
              ].map((hk, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-slate-300 text-xs">{hk.desc}</span>
                  <kbd className="px-2 py-0.5 rounded bg-black/60 border border-white/20 text-cyan-300 font-mono text-[11px] shadow">
                    {hk.key}
                  </kbd>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-900/90 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors shadow-neon-cyan"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
