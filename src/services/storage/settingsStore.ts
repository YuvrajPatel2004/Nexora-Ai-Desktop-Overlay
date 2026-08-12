import { AppSettings, LLMProvider, ModelInfo } from '../../types';

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
    description: 'Fastest multimodal model with native screen & code reasoning'
  },
  {
    id: 'gemini-2.0-flash-thinking',
    name: 'Gemini 2.0 Flash Thinking',
    provider: 'gemini',
    contextWindow: '1M tokens',
    isVision: true,
    isFast: false,
    recommended: true,
    description: 'Deep chain-of-thought reasoning for complex algorithms & system design'
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'gemini',
    contextWindow: '2M tokens',
    isVision: true,
    isFast: false,
    description: 'Ultra-large context for full codebase analysis & deep architecture'
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'gemini',
    contextWindow: '1M tokens',
    isVision: true,
    isFast: true,
    description: 'High throughput, low-latency visual analysis'
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
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
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
  coding: `You are Nexora AI, a world-class competitive programming and software engineering copilot.
When given a code snippet, screenshot, or problem description:
1. Identify the core algorithm / data structure pattern.
2. Provide the optimal solution with clean, production-ready code in the user's preferred language.
3. State the precise Time and Space Complexity.
4. Highlight subtle edge cases.
5. Keep explanations crisp, structured, and easy to scan in 5 seconds. Avoid fluff.`,

  'system-design': `You are Nexora AI, a Principal Systems Architect.
When asked about system design or architectural questions:
1. Clarify functional and non-functional requirements (Scale, Latency, Consistency, Availability).
2. Propose a high-level component architecture (API Gateway, Microservices, Caching, DB choice, Message Queues).
3. Discuss data model & database schema/partitioning strategy.
4. Address scaling bottlenecks, caching strategies (Redis/Memcached), and fault tolerance.
5. Provide structured bullet points designed for senior/staff interview discussions.`,

  'interview-star': `You are an elite Tech Interview Coach.
When the user or interviewer asks a behavioral or technical experience question:
1. Format your answer directly using the STAR Method (Situation, Task, Action, Result).
2. Use concise, impactful bullet points that sound authentic, confident, and metrics-driven.
3. Keep the talking points conversational so the user can easily speak them out loud naturally.`,

  'live-troubleshooter': `You are a real-time debugging expert.
When shown an error stack trace, failing test, or bug:
1. Pinpoint the exact root cause in 1 sentence.
2. Provide the exact fix / diff.
3. Explain why the bug happened and how to avoid regression.`,

  'exam-solver': `You are an expert STEM and academic exam problem solver.
When presented with multiple choice, mathematical, or conceptual problems:
1. State the correct answer choice immediately at the top (e.g. "**Correct Answer: (B)**").
2. Provide the clear step-by-step mathematical proof / logical reasoning below.`,

  'concise-whisper': `You are a stealth live prompter.
Provide extremely concise 1-2 sentence answers or code lines. No greetings, no preamble, maximum signal-to-noise ratio.`
};
