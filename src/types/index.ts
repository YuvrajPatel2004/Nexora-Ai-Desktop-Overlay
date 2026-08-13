export type LLMProvider = 
  | 'gemini' 
  | 'openai' 
  | 'anthropic' 
  | 'groq' 
  | 'deepseek' 
  | 'ollama' 
  | 'custom';

export interface ModelInfo {
  id: string;
  name: string;
  provider: LLMProvider;
  contextWindow?: string;
  isVision: boolean;
  isFast: boolean;
  recommended?: boolean;
  description?: string;
}

export type OverlayMode = 'copilot' | 'interview-ear' | 'solver' | 'teleprompter';

export type OverlayViewStyle = 'expanded' | 'compact-pill' | 'teleprompter';

export type SystemPromptPreset = 
  | 'coding' 
  | 'system-design' 
  | 'interview-star' 
  | 'live-troubleshooter' 
  | 'exam-solver' 
  | 'concise-whisper';

export type AppTheme = 
  | 'cyber-stealth' 
  | 'obsidian' 
  | 'matrix-emerald' 
  | 'rose-gold' 
  | 'midnight-blue';

export interface AppSettings {
  apiKeys: Record<string, string>;
  selectedProvider: LLMProvider;
  selectedModel: string;
  ollamaEndpoint: string;
  ollamaModel: string;
  customEndpoint: string;
  customModel: string;
  
  // Appearance & Stealth
  opacity: number; // 0.2 to 1.0
  fontSize: 'xs' | 'sm' | 'base' | 'lg';
  theme: AppTheme;
  mode: OverlayMode;
  viewStyle: OverlayViewStyle;
  contentProtectionEnabled: boolean;
  clickThroughEnabled: boolean;
  alwaysOnTop: boolean;
  hideFromTaskbar: boolean;
  
  // AI Behavior
  promptPreset: SystemPromptPreset;
  customSystemPrompt: string;
  temperature: number;
  autoSolveSnips: boolean;
  autoSuggestAudio: boolean;
  soundAlerts: boolean;
  preferredLanguage: string; // Python, TypeScript, Java, C++, Go, etc.
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  screenshot?: string; // base64 dataUrl
  isStreaming?: boolean;
  metrics?: {
    latencyMs?: number;
    provider?: LLMProvider;
    model?: string;
    timeComplexity?: string;
    spaceComplexity?: string;
  };
}

export interface SpeechTranscript {
  id: string;
  text: string;
  timestamp: number;
  isFinal: boolean;
  aiResponse?: string;
  isGenerating?: boolean;
}

export interface SnipRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

// -------------------------------------------------------------
// Feature F: Personal Resume & Knowledge Base RAG Types
// -------------------------------------------------------------
export type KnowledgeCategory = 
  | 'resume' 
  | 'projects' 
  | 'system-design' 
  | 'behavioral' 
  | 'notes' 
  | 'custom';

export interface DocumentChunk {
  id: string;
  documentId: string;
  sectionTitle: string;
  content: string;
  keywords: string[];
  tokenEstimate: number;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  category: KnowledgeCategory;
  rawContent: string;
  chunks: DocumentChunk[];
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  fileType?: string;
  summary?: string;
}

export interface RAGQueryResult {
  chunk: DocumentChunk;
  score: number;
  documentTitle: string;
  category: KnowledgeCategory;
}

// -------------------------------------------------------------
// Feature B: Second-Screen Mobile Companion Types
// -------------------------------------------------------------
export interface CompanionDevice {
  id: string;
  ip: string;
  userAgent?: string;
  connectedAt: number;
  lastPing: number;
}

export interface CompanionServerInfo {
  isRunning: boolean;
  port: number;
  localIp: string;
  fullUrl: string;
  connectedCount: number;
}

export interface CompanionPayload {
  type: 'solution' | 'transcript' | 'snip' | 'mode' | 'notification' | 'action';
  data: any;
  timestamp: number;
}

