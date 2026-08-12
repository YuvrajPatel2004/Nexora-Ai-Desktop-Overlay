import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Brain } from 'lucide-react';
import { CodeViewer } from './CodeViewer';

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, isStreaming }) => {
  const [showThought, setShowThought] = useState(false);

  // Extract <thought> or <think> blocks if present
  let thoughtText: string | null = null;
  let cleanContent = content;

  const thinkMatch = content.match(/<(thought|think)>([\s\S]*?)<\/(thought|think)>/i);
  if (thinkMatch) {
    thoughtText = thinkMatch[2].trim();
    cleanContent = content.replace(/<(thought|think)>[\s\S]*?<\/(thought|think)>/gi, '').trim();
  }

  // Filter out meta prompt echo bullets if present (e.g. "- User says:", "- Goal:", "- Role:", "- Tone:")
  const metaRegex = /^\s*[-*•]\s*(User says|Context:|Goal:|Role:|Tone:|Capabilities:|Greeting:|Call to Action:|Reminder of what|Keep it short|Maintain the).*\n?/gmi;
  cleanContent = cleanContent.replace(metaRegex, '').trim();

  // Parse code blocks vs regular text
  const parts: React.ReactNode[] = [];
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;

  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(cleanContent)) !== null) {
    const textBefore = cleanContent.substring(lastIndex, match.index);
    if (textBefore) {
      parts.push(renderFormattedText(textBefore, `text-${lastIndex}`));
    }

    const language = match[1] || 'plaintext';
    const code = match[2].trim();
    parts.push(<CodeViewer key={`code-${match.index}`} code={code} language={language} />);

    lastIndex = match.index + match[0].length;
  }

  const remainingText = cleanContent.substring(lastIndex);
  if (remainingText) {
    parts.push(renderFormattedText(remainingText, `text-${lastIndex}`));
  }

  return (
    <div className={`prose-invert text-slate-100 text-sm space-y-2 leading-relaxed ${isStreaming ? 'streaming-cursor' : ''}`}>
      {/* Collapsible Chain of Thought Block */}
      {thoughtText && (
        <div className="rounded-lg border border-purple-500/20 bg-purple-950/20 overflow-hidden mb-3">
          <button
            onClick={() => setShowThought(!showThought)}
            className="w-full flex items-center justify-between px-3 py-1.5 bg-purple-900/20 text-purple-300 text-xs font-semibold hover:bg-purple-900/30 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-purple-400" />
              <span>Chain of Thought Reasoning</span>
            </div>
            {showThought ? (
              <ChevronDown className="w-3.5 h-3.5 text-purple-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-purple-400" />
            )}
          </button>
          {showThought && (
            <div className="p-3 text-xs text-purple-200/80 leading-relaxed border-t border-purple-500/15 font-mono whitespace-pre-wrap bg-black/40">
              {thoughtText}
            </div>
          )}
        </div>
      )}

      {parts.length > 0 ? parts : <span>{cleanContent}</span>}
    </div>
  );
};

function renderFormattedText(text: string, keyPrefix: string): React.ReactNode {
  const lines = text.split('\n');

  return (
    <div key={keyPrefix} className="space-y-1.5">
      {lines.map((line, idx) => {
        const lineKey = `${keyPrefix}-line-${idx}`;

        // Headers
        if (line.startsWith('### ')) {
          return <h4 key={lineKey} className="text-sm font-bold text-cyan-300 mt-2 mb-1">{parseInline(line.replace('### ', ''))}</h4>;
        }
        if (line.startsWith('## ')) {
          return <h3 key={lineKey} className="text-base font-bold text-cyan-200 mt-3 mb-1 border-b border-white/10 pb-1">{parseInline(line.replace('## ', ''))}</h3>;
        }
        if (line.startsWith('# ')) {
          return <h2 key={lineKey} className="text-lg font-extrabold text-cyan-100 mt-3 mb-1">{parseInline(line.replace('# ', ''))}</h2>;
        }

        // Bullet points
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          const content = line.trim().substring(2);
          return (
            <div key={lineKey} className="flex items-start gap-2 pl-1">
              <span className="text-cyan-400 font-bold text-xs mt-1">•</span>
              <span className="text-slate-200 text-xs sm:text-sm">{parseInline(content)}</span>
            </div>
          );
        }

        // Numbered list
        const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={lineKey} className="flex items-start gap-2 pl-1">
              <span className="text-cyan-400 font-mono font-semibold text-xs mt-0.5">{numMatch[1]}.</span>
              <span className="text-slate-200 text-xs sm:text-sm">{parseInline(numMatch[2])}</span>
            </div>
          );
        }

        if (!line.trim()) {
          return <div key={lineKey} className="h-1" />;
        }

        return (
          <p key={lineKey} className="text-slate-200 text-xs sm:text-sm leading-relaxed">
            {parseInline(line)}
          </p>
        );
      })}
    </div>
  );
}

function parseInline(text: string): React.ReactNode {
  // Handle Bold, Inline Code, and Complexity Badges
  const parts: React.ReactNode[] = [];
  const tokenRegex = /(\*\*.*?\*\*|`.*?`|O\([a-zA-Z0-9 ^*+!()]+\))/g;

  let lastIndex = 0;
  let match;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      const boldText = token.slice(2, -2);
      // Highlight complexity or key tags
      if (boldText.includes('Time Complexity') || boldText.includes('Space Complexity') || boldText.includes('Optimal')) {
        parts.push(
          <span key={match.index} className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30 text-xs">
            {boldText}
          </span>
        );
      } else {
        parts.push(<strong key={match.index} className="font-semibold text-white">{boldText}</strong>);
      }
    } else if (token.startsWith('`') && token.endsWith('`')) {
      const codeText = token.slice(1, -1);
      parts.push(
        <code key={match.index} className="px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 font-mono text-xs border border-white/5">
          {codeText}
        </code>
      );
    } else if (token.startsWith('O(') && token.endsWith(')')) {
      parts.push(
        <span key={match.index} className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono font-bold text-xs border border-purple-500/30">
          {token}
        </span>
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
}
