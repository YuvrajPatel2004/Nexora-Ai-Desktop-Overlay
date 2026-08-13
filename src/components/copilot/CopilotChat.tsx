import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Crop, 
  Trash2, 
  Image as ImageIcon, 
  X, 
  Sparkles, 
  Zap, 
  Cpu, 
  Clock, 
  Code2,
  HelpCircle,
  Copy,
  Check
} from 'lucide-react';
import { AppSettings, ChatMessage, LLMProvider } from '../../types';
import { LLMClient } from '../../services/ai/llmClient';
import { MarkdownRenderer } from '../common/MarkdownRenderer';
import { AVAILABLE_MODELS } from '../../services/storage/settingsStore';
import { CompanionBridge } from '../../services/companion/companionBridge';

interface CopilotChatProps {
  settings: AppSettings;
  llmClient: LLMClient;
  pendingScreenshot?: string | null;
  onClearPendingScreenshot?: () => void;
  pendingClipboardText?: string | null;
  onClearPendingClipboardText?: () => void;
  onTriggerSnip: () => void;
  onOpenSettings: () => void;
}

export const CopilotChat: React.FC<CopilotChatProps> = ({
  settings,
  llmClient,
  pendingScreenshot,
  onClearPendingScreenshot,
  pendingClipboardText,
  onClearPendingClipboardText,
  onTriggerSnip,
  onOpenSettings,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: `👋 **Nexora AI Overlay Active & Screenshare Invisible**\n\nI am your real-time desktop copilot. Ask any coding, interview, or architectural question, **snip your screen** (\`Ctrl+Shift+S\`), or **paste clipboard images & text** (\`Ctrl+Shift+V\` / \`Alt+P\`).`,
      timestamp: Date.now(),
      metrics: {
        provider: settings.selectedProvider,
        model: settings.selectedModel,
      }
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (pendingScreenshot) {
      setAttachedImage(pendingScreenshot);
      onClearPendingScreenshot?.();
    }
  }, [pendingScreenshot]);

  useEffect(() => {
    if (pendingClipboardText) {
      setInputText(pendingClipboardText);
      onClearPendingClipboardText?.();
    }
  }, [pendingClipboardText]);

  // Global window paste listener for direct image & text clipboard upload
  useEffect(() => {
    const handleWindowPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              if (typeof event.target?.result === 'string') {
                setAttachedImage(event.target.result);
              }
            };
            reader.readAsDataURL(file);
            e.preventDefault();
            return;
          }
        }
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => window.removeEventListener('paste', handleWindowPaste);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const currentModelInfo = AVAILABLE_MODELS.find(m => m.id === settings.selectedModel) || {
    name: settings.selectedModel,
    provider: settings.selectedProvider,
  };

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputText).trim();
    if (!textToSend && !attachedImage) return;

    const currentKey = settings.apiKeys[settings.selectedProvider];
    if (settings.selectedProvider !== 'ollama' && !currentKey?.trim()) {
      onOpenSettings();
      return;
    }

    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `assistant-${Date.now()}`;
    const startTime = Date.now();

    const userMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: textToSend || 'Please analyze this screenshot and provide the optimal solution.',
      screenshot: attachedImage || undefined,
      timestamp: Date.now(),
    };

    const initialAssistantMessage: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      timestamp: Date.now(),
      metrics: {
        provider: settings.selectedProvider,
        model: settings.selectedModel,
      }
    };

    setMessages(prev => [...prev, userMessage, initialAssistantMessage]);
    setInputText('');
    const imageToSend = attachedImage;
    setAttachedImage(null);
    setIsGenerating(true);

    try {
      let accumulatedText = '';
      await llmClient.generate({
        prompt: userMessage.content,
        screenshot: imageToSend || undefined,
        history: messages,
        onChunk: (chunk) => {
          accumulatedText += chunk;
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMsgId
                ? { ...msg, content: accumulatedText }
                : msg
            )
          );
          CompanionBridge.broadcastSolution(accumulatedText);
        },
      });

      CompanionBridge.broadcastSolution(accumulatedText);

      const latencyMs = Date.now() - startTime;
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                isStreaming: false,
                metrics: {
                  ...msg.metrics,
                  latencyMs,
                }
              }
            : msg
        )
      );
    } catch (err: any) {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                isStreaming: false,
                content: `⚠️ **Error:** ${err.message || 'Failed to generate response'}`
              }
            : msg
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const electron = (window as any).electronAPI;
      if (electron?.readClipboardContent) {
        const data = await electron.readClipboardContent();
        if (data?.type === 'image') {
          setAttachedImage(data.content);
          return;
        } else if (data?.type === 'text') {
          setInputText(data.content);
          return;
        }
      }
      // Web clipboard fallback
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputText(text);
      }
    } catch (e) {
      console.warn('Failed to read clipboard:', e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyMessage = (msg: ChatMessage) => {
    if ((window as any).electronAPI?.copyToClipboard) {
      (window as any).electronAPI.copyToClipboard(msg.content);
    } else {
      navigator.clipboard.writeText(msg.content);
    }
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickPrompts = [
    { label: '⚡ Solve Problem', prompt: 'Solve this problem optimally with clean code, time/space complexity analysis, and edge cases.' },
    { label: '📐 System Design', prompt: 'Provide a structured senior-level System Design breakdown for this architecture with bottlenecks and DB strategy.' },
    { label: '⭐ STAR Answer', prompt: 'Formulate a crisp STAR-method (Situation, Task, Action, Result) interview response for this question.' },
    { label: '🐞 Debug Error', prompt: 'Identify the exact root cause of this error and provide the corrected code diff.' },
  ];

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      {/* Model & Preset Badge Strip */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-black/40 border-b border-white/5 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-medium text-slate-200">{currentModelInfo.name}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-cyan-300 uppercase font-mono">
            {settings.selectedProvider}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-mono text-[10px]">
            Lang: <strong className="text-slate-300">{settings.preferredLanguage}</strong>
          </span>
          <button
            onClick={() => setMessages([])}
            className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-rose-400 transition-colors"
            title="Clear Chat History"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} group`}
            >
              {/* Message Header / Timestamp */}
              <div className="flex items-center gap-2 mb-1 px-1 text-[10px] text-slate-400">
                <span className="font-semibold text-slate-300">
                  {isUser ? 'You' : 'Nexora AI'}
                </span>
                {msg.metrics?.latencyMs && (
                  <span className="flex items-center gap-0.5 text-cyan-400 font-mono">
                    <Clock className="w-2.5 h-2.5" />
                    {(msg.metrics.latencyMs / 1000).toFixed(2)}s
                  </span>
                )}
                {!isUser && !msg.isStreaming && (
                  <button
                    onClick={() => handleCopyMessage(msg)}
                    className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/10 transition-all flex items-center gap-1 text-[10px] font-medium"
                    title="Copy full response to clipboard"
                  >
                    {copiedId === msg.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 font-semibold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-cyan-400" />
                        <span>Copy Answer</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`p-3 rounded-xl max-w-[92%] border transition-all ${
                  isUser
                    ? 'bg-cyan-950/50 border-cyan-500/30 text-slate-100'
                    : 'glass-panel text-slate-100'
                }`}
              >
                {/* Attached Screenshot preview */}
                {msg.screenshot && (
                  <div className="mb-2 rounded-lg overflow-hidden border border-white/15 max-h-48">
                    <img
                      src={msg.screenshot}
                      alt="Attached Screen Snip"
                      className="w-full h-auto object-contain bg-black/50"
                    />
                  </div>
                )}

                {/* Content */}
                <MarkdownRenderer content={msg.content} isStreaming={msg.isStreaming} />
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar */}
      <div className="flex items-center gap-1.5 px-3 py-1 overflow-x-auto no-scrollbar border-t border-white/5 bg-black/20">
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(qp.prompt)}
            disabled={isGenerating}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-cyan-300 text-[11px] whitespace-nowrap transition-colors disabled:opacity-50"
          >
            <span>{qp.label}</span>
          </button>
        ))}
      </div>

      {/* Screenshot attachment preview badge */}
      {attachedImage && (
        <div className="flex items-center justify-between mx-3 mt-2 px-2.5 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-xs">
          <div className="flex items-center gap-2 truncate">
            <ImageIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-cyan-200 truncate font-mono text-[11px]">Clipboard / Snip Image attached</span>
          </div>
          <button
            onClick={() => setAttachedImage(null)}
            className="p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-rose-400"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Input Form */}
      <div className="p-3 pt-2 bg-slate-950/90 border-t border-white/10">
        <div className="relative flex items-center glass-input rounded-xl overflow-hidden focus-within:border-cyan-400 transition-all">
          {/* Snip screen button */}
          <button
            onClick={onTriggerSnip}
            className="p-2.5 text-slate-400 hover:text-cyan-400 hover:bg-white/5 transition-colors"
            title="Snip Screen Area (Ctrl+Shift+S / F10)"
          >
            <Crop className="w-4 h-4" />
          </button>

          {/* Direct Clipboard Paste button */}
          <button
            onClick={handlePasteFromClipboard}
            className="p-2.5 text-slate-400 hover:text-cyan-400 hover:bg-white/5 transition-colors"
            title="Paste Image / Text from Clipboard (Ctrl+Shift+V / Alt+P / F6)"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          {/* Text input */}
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              settings.apiKeys[settings.selectedProvider] || settings.selectedProvider === 'ollama'
                ? "Ask anything, paste image/text (Ctrl+V / Ctrl+Shift+V)..."
                : `Enter your ${settings.selectedProvider.toUpperCase()} API key in Settings (⚙️)...`
            }
            rows={1}
            className="flex-1 bg-transparent py-2.5 px-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none max-h-32"
          />

          {/* Send button */}
          <button
            onClick={() => handleSend()}
            disabled={isGenerating || (!inputText.trim() && !attachedImage)}
            className="p-2.5 mr-1 rounded-lg text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
            title="Send Message (Enter)"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
