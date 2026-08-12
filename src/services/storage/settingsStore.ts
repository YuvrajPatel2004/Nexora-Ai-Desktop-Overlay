import { AppSettings, ModelInfo } from '../../types';

export const AVAILABLE_MODELS: ModelInfo[] = [
  // Google Gemini
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'gemini',
    contextWindow: '1M tokens',
    isVision: true,
    isFast: true,
    recommended: true,
    description: 'Latest flagship multimodal model with ultra-fast screen reasoning'
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'gemini',
    contextWindow: '2M tokens',
    isVision: true,
    isFast: false,
    recommended: true,
    description: 'Deep reasoning model for competitive programming & architecture'
  },
  {
    id: 'gemini-1.5-flash-latest',
    name: 'Gemini 1.5 Flash',
    provider: 'gemini',
    contextWindow: '1M tokens',
    isVision: true,
    isFast: true,
    description: 'High throughput, low-latency visual analysis'
  },
  {
    id: 'gemini-1.5-pro-latest',
    name: 'Gemini 1.5 Pro',
    provider: 'gemini',
    contextWindow: '2M tokens',
    isVision: true,
    isFast: false,
    description: 'Ultra-large context for full codebase analysis & deep architecture'
  },

  // OpenAI
  {
    id: 'gpt-4o',
    name: 'GPT-4o (Omni)',
    provider: 'openai',
    contextWindow: '128k tokens',
    isVision: true,
    isFast: true,
    recommended: true,
    description: 'Flagship multimodal model with supreme coding & conversational skills'
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    contextWindow: '128k tokens',
    isVision: true,
    isFast: true,
    description: 'Super-fast, affordable vision and reasoning'
  },
  {
    id: 'o3-mini',
    name: 'o3-mini (High Reasoning)',
    provider: 'openai',
    contextWindow: '200k tokens',
    isVision: false,
    isFast: false,
    description: 'Top-tier competitive programming & complex math solver'
  },
  {
    id: 'o1',
    name: 'o1 Reasoning',
    provider: 'openai',
    contextWindow: '200k tokens',
    isVision: true,
    isFast: false,
    description: 'Deep deliberation model for hardest LeetCode & system problems'
  },

  // Anthropic Claude
  {
    id: 'claude-3-7-sonnet-20250219',
    name: 'Claude 3.7 Sonnet',
    provider: 'anthropic',
    contextWindow: '200k tokens',
    isVision: true,
    isFast: true,
    recommended: true,
    description: 'Highest coding benchmark score & nuanced technical explanations'
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    contextWindow: '200k tokens',
    isVision: true,
    isFast: true,
    description: 'Industry standard for code generation and visual UI analysis'
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    contextWindow: '200k tokens',
    isVision: true,
    isFast: true,
    description: 'Blazing fast responses for rapid live prompts'
  },

  // Groq (Ultra-Low Latency)
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B (Groq)',
    provider: 'groq',
    contextWindow: '128k tokens',
    isVision: false,
    isFast: true,
    recommended: true,
    description: 'Blazing 400+ tokens/sec speed for near-instant interview answers'
  },
  {
    id: 'deepseek-r1-distill-llama-70b',
    name: 'DeepSeek R1 70B (Groq)',
    provider: 'groq',
    contextWindow: '128k tokens',
    isVision: false,
    isFast: true,
    description: 'Ultra-fast chain-of-thought reasoning on Groq LPUs'
  },

  // DeepSeek Direct
  {
    id: 'deepseek-chat',
    name: 'DeepSeek V3',
    provider: 'deepseek',
    contextWindow: '64k tokens',
    isVision: false,
    isFast: true,
    description: 'Extremely capable open-weights flagship for coding'
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek R1 (Thinking)',
    provider: 'deepseek',
    contextWindow: '64k tokens',
    isVision: false,
    isFast: false,
    description: 'Full mathematical & algorithmic step-by-step reasoning'
  },

  // Local Ollama
  {
    id: 'llama3.2-vision:latest',
    name: 'Ollama Llama 3.2 Vision (Local)',
    provider: 'ollama',
    contextWindow: '128k tokens',
    isVision: true,
    isFast: true,
    description: '100% offline & private local vision model'
  },
  {
    id: 'qwen2.5-coder:7b',
    name: 'Ollama Qwen 2.5 Coder (Local)',
    provider: 'ollama',
    contextWindow: '32k tokens',
    isVision: false,
    isFast: true,
    description: 'Top local model optimized for coding & algorithms'
  }
];

const DEFAULT_SETTINGS: AppSettings = {
  apiKeys: {
    gemini: '',
    openai: '',
    anthropic: '',
    groq: '',
    deepseek: '',
    custom: '',
  },
  selectedProvider: 'gemini',
  selectedModel: 'gemini-2.5-flash',
  ollamaEndpoint: 'http://localhost:11434',
  ollamaModel: 'llama3.2-vision:latest',
  customEndpoint: 'https://api.openai.com/v1',
  customModel: 'gpt-4o',
  
  opacity: 0.94,
  fontSize: 'sm',
  theme: 'cyber-stealth',
  mode: 'copilot',
  viewStyle: 'expanded',
  contentProtectionEnabled: true,
  clickThroughEnabled: false,
  alwaysOnTop: true,
  
  promptPreset: 'coding',
  customSystemPrompt: '',
  temperature: 0.2,
  autoSolveSnips: true,
  autoSuggestAudio: true,
  soundAlerts: false,
  preferredLanguage: 'Python',
};

const STORAGE_KEY = 'nexora_ai_overlay_settings_v1';

export function getStoredSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(saved);
    
    // Auto-fix deprecated/not-found model names
    let selModel = parsed.selectedModel || DEFAULT_SETTINGS.selectedModel;
    if (selModel === 'gemini-2.5-flash' || selModel === 'gemini-1.5-pro') {
      selModel = 'gemini-2.0-flash';
    }

    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      selectedModel: selModel,
      apiKeys: {
        ...DEFAULT_SETTINGS.apiKeys,
        ...(parsed.apiKeys || {})
      }
    };
  } catch (err) {
    console.error('Failed to parse saved settings:', err);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

export const SYSTEM_PROMPTS = {
  coding: `You are Nexora AI, a competitive programming and software engineering copilot.
CRITICAL INSTRUCTION: Output ONLY the direct answer/solution. Do NOT output planning steps, meta-analysis, or restate instructions. Start immediately with the solution code, optimal algorithm, and Big-O complexity.`,

  'system-design': `You are Nexora AI, a Principal Systems Architect.
CRITICAL INSTRUCTION: Output ONLY structured system design talking points (Requirements, Architecture, DB schema, Caching & Scaling bottlenecks). Do NOT output meta thoughts or planning outlines.`,

  'interview-star': `You are an elite Tech Interview Coach.
CRITICAL INSTRUCTION: Output ONLY crisp, impactful STAR bullet points (Situation, Task, Action, Result) ready to speak out loud. No preamble.`,

  'live-troubleshooter': `You are a real-time debugging expert.
CRITICAL INSTRUCTION: State the root cause in 1 sentence, then provide the exact corrected code diff.`,

  'exam-solver': `You are an expert exam problem solver.
CRITICAL INSTRUCTION: State the correct answer choice immediately at the top in bold, followed by the step-by-step proof/logic.`,

  'concise-whisper': `You are a stealth live prompter.
Provide extremely concise 1-2 sentence answers or code lines. No greetings, no preamble, maximum signal-to-noise ratio.`
};
