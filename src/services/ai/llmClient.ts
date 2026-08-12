import { AppSettings, ChatMessage } from '../../types';
import { SYSTEM_PROMPTS } from '../storage/settingsStore';
import { ScreenAnalyzer } from '../vision/screenAnalyzer';

export interface GenerateOptions {
  prompt: string;
  screenshot?: string; // base64 data url or raw base64
  history?: ChatMessage[];
  systemPromptOverride?: string;
  onChunk?: (chunk: string) => void;
}

export class LLMClient {
  private settings: AppSettings;

  constructor(settings: AppSettings) {
    this.settings = settings;
  }

  public updateSettings(settings: AppSettings) {
    this.settings = settings;
  }

  private getEffectiveSystemPrompt(override?: string): string {
    if (override) return override;
    if (this.settings.customSystemPrompt?.trim()) {
      return this.settings.customSystemPrompt.trim();
    }
    const preset = this.settings.promptPreset || 'coding';
    let base = SYSTEM_PROMPTS[preset] || SYSTEM_PROMPTS.coding;
    if (this.settings.preferredLanguage) {
      base += `\nPreferred programming language: ${this.settings.preferredLanguage}. Provide all code solutions in ${this.settings.preferredLanguage} unless requested otherwise.`;
    }
    return base;
  }

  public async generate(options: GenerateOptions): Promise<string> {
    const { prompt, screenshot, history = [], onChunk, systemPromptOverride } = options;
    const provider = this.settings.selectedProvider;
    const model = this.settings.selectedModel;
    const systemPrompt = this.getEffectiveSystemPrompt(systemPromptOverride);

    // If model is text-only (Groq, DeepSeek, o3-mini) and an image is provided, extract text via OCR
    let effectivePrompt = prompt;
    const isTextOnlyModel = provider === 'groq' || provider === 'deepseek' || model === 'o3-mini';
    if (screenshot && isTextOnlyModel) {
      const ocrText = await ScreenAnalyzer.extractTextFromImage(screenshot);
      if (ocrText) {
        effectivePrompt = `${prompt}\n\n[OCR Extracted Problem/Code from Screen]:\n${ocrText}`;
      }
    }

    switch (provider) {
      case 'gemini':
        return this.callGemini({ prompt: effectivePrompt, screenshot, history, systemPrompt, model, onChunk });
      case 'openai':
        return this.callOpenAI({ prompt: effectivePrompt, screenshot: isTextOnlyModel ? undefined : screenshot, history, systemPrompt, model, onChunk });
      case 'anthropic':
        return this.callAnthropic({ prompt: effectivePrompt, screenshot, history, systemPrompt, model, onChunk });
      case 'groq':
        return this.callGroq({ prompt: effectivePrompt, screenshot: undefined, history, systemPrompt, model, onChunk });
      case 'deepseek':
        return this.callDeepSeek({ prompt: effectivePrompt, screenshot: undefined, history, systemPrompt, model, onChunk });
      case 'ollama':
        return this.callOllama({ prompt: effectivePrompt, screenshot, history, systemPrompt, onChunk });
      case 'custom':
        return this.callCustom({ prompt: effectivePrompt, screenshot, history, systemPrompt, onChunk });
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  // Google Gemini Direct Call
  private async callGemini({
    prompt,
    screenshot,
    history,
    systemPrompt,
    model,
    onChunk
  }: {
    prompt: string;
    screenshot?: string;
    history: ChatMessage[];
    systemPrompt: string;
    model: string;
    onChunk?: (chunk: string) => void;
  }): Promise<string> {
    const apiKey = this.settings.apiKeys.gemini?.trim();
    if (!apiKey) {
      throw new Error('Please enter your Google Gemini API Key in Settings (⚙️).');
    }

    const contents: any[] = [];

    // Prior history (limit to last 6 messages to stay snappy)
    const recentHistory = history.slice(-6);
    for (const msg of recentHistory) {
      if (msg.role === 'user') {
        const parts: any[] = [{ text: msg.content }];
        if (msg.screenshot) {
          const cleanBase64 = msg.screenshot.replace(/^data:image\/\w+;base64,/, '');
          parts.push({
            inline_data: {
              mime_type: 'image/png',
              data: cleanBase64
            }
          });
        }
        contents.push({ role: 'user', parts });
      } else if (msg.role === 'assistant') {
        contents.push({ role: 'model', parts: [{ text: msg.content }] });
      }
    }

    // Current turn
    const currentParts: any[] = [];
    if (screenshot) {
      const cleanBase64 = screenshot.replace(/^data:image\/\w+;base64,/, '');
      currentParts.push({
        inline_data: {
          mime_type: 'image/png',
          data: cleanBase64
        }
      });
    }
    currentParts.push({ text: prompt || 'Analyze this problem/code and provide the optimal solution.' });
    contents.push({ role: 'user', parts: currentParts });

    // Build candidate list prioritizing user selection, then latest 2.5 and 1.5 versions
    const candidateModels: string[] = [];
    if (model) candidateModels.push(model);
    if (!candidateModels.includes('gemini-2.5-flash')) candidateModels.push('gemini-2.5-flash');
    if (!candidateModels.includes('gemini-2.5-pro')) candidateModels.push('gemini-2.5-pro');
    if (!candidateModels.includes('gemini-1.5-flash-latest')) candidateModels.push('gemini-1.5-flash-latest');
    if (!candidateModels.includes('gemini-1.5-flash')) candidateModels.push('gemini-1.5-flash');
    if (!candidateModels.includes('gemini-1.5-pro-latest')) candidateModels.push('gemini-1.5-pro-latest');

    const body = {
      contents,
      system_instruction: {
        parts: [{ text: systemPrompt }]
      },
      generationConfig: {
        temperature: this.settings.temperature ?? 0.2,
        maxOutputTokens: 4096,
        // Disable internal chain-of-thought monologue from printing to the user output
        thinkingConfig: {
          thinkingBudget: 0
        }
      }
    };

    let response: Response | null = null;
    let lastErrorMsg = '';

    for (const cand of candidateModels) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${cand}:streamGenerateContent?alt=sse&key=${apiKey}`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (res.ok) {
          response = res;
          break;
        } else {
          const errText = await res.text();
          let parsedMsg = errText;
          try {
            const errJson = JSON.parse(errText);
            parsedMsg = errJson.error?.message || errText;
          } catch (_) {}
          lastErrorMsg = parsedMsg;
          console.warn(`[Gemini] Candidate ${cand} failed (${res.status}): ${parsedMsg}. Trying next candidate...`);
        }
      } catch (err: any) {
        lastErrorMsg = err.message || 'Network error';
      }
    }

    // If all candidates failed, dynamically query ListModels to find valid active models
    if (!response || !response.ok) {
      try {
        console.log('[Gemini] Querying ListModels to discover available models for this key...');
        const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (listRes.ok) {
          const listData = await listRes.json();
          const validModels: string[] = (listData.models || [])
            .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
            .map((m: any) => m.name.replace('models/', ''));

          console.log('[Gemini] Discovered models on API Key:', validModels);
          for (const vm of validModels) {
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${vm}:streamGenerateContent?alt=sse&key=${apiKey}`;
            const res = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });
            if (res.ok) {
              response = res;
              break;
            }
          }
        }
      } catch (discoveryErr) {
        console.warn('[Gemini] Model discovery failed:', discoveryErr);
      }
    }

    if (!response || !response.ok) {
      throw new Error(`Gemini API Error: ${lastErrorMsg || 'Could not find an available Gemini model for this API key.'}`);
    }

    let fullText = '';
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Response stream not readable');
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          try {
            const data = JSON.parse(jsonStr);
            const parts = data.candidates?.[0]?.content?.parts || [];
            for (const part of parts) {
              // Skip internal thinking tokens if Gemini flags them
              if (part.thought) continue;
              if (part.text) {
                fullText += part.text;
                onChunk?.(part.text);
              }
            }
          } catch (e) {
            // Ignore parse errors on partial lines
          }
        }
      }
    }

    // Clean any leading monologue artifacts if model still emitted reflections
    let cleanOutput = fullText.trim();
    if (cleanOutput.startsWith('*Wait*') || cleanOutput.startsWith('The user said')) {
      const respIdx = cleanOutput.indexOf('Response:');
      if (respIdx !== -1) {
        cleanOutput = cleanOutput.substring(respIdx + 9).trim().replace(/^["']|["']$/g, '');
      }
    }

    return cleanOutput;
  }

  // OpenAI Direct Call
  private async callOpenAI({
    prompt,
    screenshot,
    history,
    systemPrompt,
    model,
    onChunk
  }: {
    prompt: string;
    screenshot?: string;
    history: ChatMessage[];
    systemPrompt: string;
    model: string;
    onChunk?: (chunk: string) => void;
  }): Promise<string> {
    const apiKey = this.settings.apiKeys.openai?.trim();
    if (!apiKey) {
      throw new Error('Please enter your OpenAI API Key in Settings (⚙️).');
    }

    const messages: any[] = [{ role: 'system', content: systemPrompt }];

    const recentHistory = history.slice(-6);
    for (const msg of recentHistory) {
      if (msg.role === 'user') {
        if (msg.screenshot) {
          messages.push({
            role: 'user',
            content: [
              { type: 'text', text: msg.content },
              { type: 'image_url', image_url: { url: msg.screenshot } }
            ]
          });
        } else {
          messages.push({ role: 'user', content: msg.content });
        }
      } else if (msg.role === 'assistant') {
        messages.push({ role: 'assistant', content: msg.content });
      }
    }

    // Current turn
    if (screenshot) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: prompt || 'Analyze this problem/code and provide the optimal solution.' },
          { type: 'image_url', image_url: { url: screenshot.startsWith('data:') ? screenshot : `data:image/png;base64,${screenshot}` } }
        ]
      });
    } else {
      messages.push({ role: 'user', content: prompt });
    }

    const isOModel = model.startsWith('o1') || model.startsWith('o3');

    const body: any = {
      model,
      messages,
      stream: true,
    };

    if (!isOModel) {
      body.temperature = this.settings.temperature ?? 0.2;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      let msg = errText;
      try {
        const errJson = JSON.parse(errText);
        msg = errJson.error?.message || errText;
      } catch (_) {}
      throw new Error(`OpenAI API Error (${response.status}): ${msg}`);
    }

    return this.parseSSEStream(response, onChunk);
  }

  // Anthropic Claude Direct Call
  private async callAnthropic({
    prompt,
    screenshot,
    history,
    systemPrompt,
    model,
    onChunk
  }: {
    prompt: string;
    screenshot?: string;
    history: ChatMessage[];
    systemPrompt: string;
    model: string;
    onChunk?: (chunk: string) => void;
  }): Promise<string> {
    const apiKey = this.settings.apiKeys.anthropic?.trim();
    if (!apiKey) {
      throw new Error('Please enter your Anthropic Claude API Key in Settings (⚙️).');
    }

    const messages: any[] = [];
    const recentHistory = history.slice(-6);

    for (const msg of recentHistory) {
      if (msg.role === 'user') {
        if (msg.screenshot) {
          const cleanBase64 = msg.screenshot.replace(/^data:image\/\w+;base64,/, '');
          messages.push({
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: cleanBase64
                }
              },
              { type: 'text', text: msg.content }
            ]
          });
        } else {
          messages.push({ role: 'user', content: msg.content });
        }
      } else if (msg.role === 'assistant') {
        messages.push({ role: 'assistant', content: msg.content });
      }
    }

    // Current turn
    const currentContents: any[] = [];
    if (screenshot) {
      const cleanBase64 = screenshot.replace(/^data:image\/\w+;base64,/, '');
      currentContents.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: cleanBase64
        }
      });
    }
    currentContents.push({ type: 'text', text: prompt || 'Analyze this problem/code and provide the optimal solution.' });
    messages.push({ role: 'user', content: currentContents });

    const body = {
      model,
      system: systemPrompt,
      max_tokens: 4096,
      temperature: this.settings.temperature ?? 0.2,
      messages,
      stream: true,
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'dangerously-allow-browser': 'true',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      let msg = errText;
      try {
        const errJson = JSON.parse(errText);
        msg = errJson.error?.message || errText;
      } catch (_) {}
      throw new Error(`Claude API Error (${response.status}): ${msg}`);
    }

    let fullText = '';
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Response stream not readable');
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          try {
            const data = JSON.parse(jsonStr);
            if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
              const textChunk = data.delta.text;
              if (textChunk) {
                fullText += textChunk;
                onChunk?.(textChunk);
              }
            }
          } catch (e) {
            // Partial JSON ignored
          }
        }
      }
    }

    return fullText;
  }

  // Groq Direct Call
  private async callGroq({
    prompt,
    screenshot: _screenshot,
    history,
    systemPrompt,
    model,
    onChunk
  }: {
    prompt: string;
    screenshot?: string;
    history: ChatMessage[];
    systemPrompt: string;
    model: string;
    onChunk?: (chunk: string) => void;
  }): Promise<string> {
    const apiKey = this.settings.apiKeys.groq?.trim();
    if (!apiKey) {
      throw new Error('Please enter your Groq API Key in Settings (⚙️).');
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: prompt }
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: this.settings.temperature ?? 0.2,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API Error (${response.status}): ${errText}`);
    }

    return this.parseSSEStream(response, onChunk);
  }

  // DeepSeek Direct Call
  private async callDeepSeek({
    prompt,
    screenshot: _screenshot,
    history,
    systemPrompt,
    model,
    onChunk
  }: {
    prompt: string;
    screenshot?: string;
    history: ChatMessage[];
    systemPrompt: string;
    model: string;
    onChunk?: (chunk: string) => void;
  }): Promise<string> {
    const apiKey = this.settings.apiKeys.deepseek?.trim();
    if (!apiKey) {
      throw new Error('Please enter your DeepSeek API Key in Settings (⚙️).');
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: prompt }
    ];

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: this.settings.temperature ?? 0.2,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`DeepSeek API Error (${response.status}): ${errText}`);
    }

    return this.parseSSEStream(response, onChunk);
  }

  // Local Ollama Call
  private async callOllama({
    prompt,
    screenshot,
    history,
    systemPrompt,
    onChunk
  }: {
    prompt: string;
    screenshot?: string;
    history: ChatMessage[];
    systemPrompt: string;
    onChunk?: (chunk: string) => void;
  }): Promise<string> {
    const endpoint = (this.settings.ollamaEndpoint || 'http://localhost:11434').replace(/\/$/, '');
    const model = this.settings.ollamaModel || 'llama3.2-vision:latest';

    const messages: any[] = [{ role: 'system', content: systemPrompt }];
    for (const msg of history.slice(-6)) {
      messages.push({ role: msg.role, content: msg.content });
    }

    const currentMsg: any = { role: 'user', content: prompt };
    if (screenshot) {
      const cleanBase64 = screenshot.replace(/^data:image\/\w+;base64,/, '');
      currentMsg.images = [cleanBase64];
    }
    messages.push(currentMsg);

    const response = await fetch(`${endpoint}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama Error (${response.status}): Check if Ollama is running at ${endpoint}`);
    }

    let fullText = '';
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Response stream not readable');
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          const chunk = data.message?.content;
          if (chunk) {
            fullText += chunk;
            onChunk?.(chunk);
          }
        } catch (_) {}
      }
    }

    return fullText;
  }

  // Custom / OpenRouter Call
  private async callCustom({
    prompt,
    screenshot,
    history,
    systemPrompt,
    onChunk
  }: {
    prompt: string;
    screenshot?: string;
    history: ChatMessage[];
    systemPrompt: string;
    onChunk?: (chunk: string) => void;
  }): Promise<string> {
    const endpoint = (this.settings.customEndpoint || 'https://api.openai.com/v1').replace(/\/$/, '');
    const model = this.settings.customModel || 'gpt-4o';
    const apiKey = this.settings.apiKeys.custom?.trim();

    const messages: any[] = [{ role: 'system', content: systemPrompt }];
    for (const msg of history.slice(-6)) {
      messages.push({ role: msg.role, content: msg.content });
    }

    if (screenshot) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: screenshot } }
        ]
      });
    } else {
      messages.push({ role: 'user', content: prompt });
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature: this.settings.temperature ?? 0.2,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Custom Endpoint Error (${response.status}): ${errText}`);
    }

    return this.parseSSEStream(response, onChunk);
  }

  // Helper for standard OpenAI-compatible SSE streams
  private async parseSSEStream(response: Response, onChunk?: (chunk: string) => void): Promise<string> {
    let fullText = '';
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Response stream not readable');
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]' || !jsonStr) continue;
          try {
            const data = JSON.parse(jsonStr);
            const textChunk = data.choices?.[0]?.delta?.content || data.choices?.[0]?.text;
            if (textChunk) {
              fullText += textChunk;
              onChunk?.(textChunk);
            }
          } catch (e) {
            // Ignore parse errors on partial chunks
          }
        }
      }
    }

    return fullText;
  }
}
