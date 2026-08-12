import { KnowledgeDocument, DocumentChunk, RAGQueryResult, KnowledgeCategory } from '../../types';

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are',
  'aren\'t', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both',
  'but', 'by', 'can', 'can\'t', 'cannot', 'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does',
  'doesn\'t', 'doing', 'don\'t', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had',
  'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s',
  'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i',
  'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its',
  'itself', 'let\'s', 'me', 'more', 'most', 'mustn\'t', 'my', 'myself', 'no', 'nor', 'not', 'of',
  'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over',
  'own', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s', 'should', 'shouldn\'t', 'so',
  'some', 'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs', 'them', 'themselves',
  'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve',
  'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we',
  'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s',
  'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom', 'why', 'why\'s', 'with',
  'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve', 'your',
  'yours', 'yourself', 'yourselves'
]);

export class RAGEngine {
  /**
   * Tokenizes text into normalized alphanumeric keywords, filtering stop words.
   */
  public static tokenize(text: string): string[] {
    if (!text) return [];
    return text
      .toLowerCase()
      .replace(/[^a-z0-9_\-\.\#\+]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1 && !STOP_WORDS.has(w));
  }

  /**
   * Computes term frequency map for a list of tokens.
   */
  public static getTermFrequencies(tokens: string[]): Map<string, number> {
    const tf = new Map<string, number>();
    for (const t of tokens) {
      tf.set(t, (tf.get(t) || 0) + 1);
    }
    return tf;
  }

  /**
   * Intelligently chunks a document into logical sections (by headers, paragraphs, or bullet groups).
   */
  public static chunkDocument(
    documentId: string,
    rawText: string,
    category: KnowledgeCategory = 'resume'
  ): DocumentChunk[] {
    if (!rawText || !rawText.trim()) return [];

    const lines = rawText.split(/\r?\n/);
    const rawChunks: { title: string; lines: string[] }[] = [];
    let currentTitle = category === 'resume' ? 'Overview & Summary' : 'General Notes';
    let currentLines: string[] = [];

    // Header matching regex (# Header, ## Subhead, Experience:, Projects:, Skills:, etc.)
    const headerRegex = /^(?:#{1,4}\s+|[A-Z][A-Za-z0-9\s\-_/]{2,40}:|[0-9]+\.\s+[A-Z]|(?:EXPERIENCE|PROJECTS|EDUCATION|SKILLS|CERTIFICATIONS|ARCHITECTURE|SITUATION|TASK|ACTION|RESULT)\b)/i;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        if (currentLines.length > 0) {
          currentLines.push('');
        }
        continue;
      }

      if (headerRegex.test(trimmed) && currentLines.length > 0) {
        // Close previous chunk
        rawChunks.push({
          title: currentTitle,
          lines: [...currentLines]
        });
        currentTitle = trimmed.replace(/^#{1,4}\s+/, '').replace(/:$/, '').trim();
        currentLines = [line];
      } else {
        currentLines.push(line);
      }
    }

    if (currentLines.length > 0) {
      rawChunks.push({
        title: currentTitle,
        lines: currentLines
      });
    }

    // Now refine chunks: if a chunk is too big (> 1500 chars), split into sub-paragraphs
    const finalChunks: DocumentChunk[] = [];

    rawChunks.forEach((rc, idx) => {
      const fullContent = rc.lines.join('\n').trim();
      if (!fullContent) return;

      if (fullContent.length <= 1200) {
        const tokens = this.tokenize(fullContent);
        finalChunks.push({
          id: `${documentId}-chk-${idx}`,
          documentId,
          sectionTitle: rc.title,
          content: fullContent,
          keywords: Array.from(new Set(tokens)).slice(0, 30),
          tokenEstimate: Math.ceil(fullContent.length / 4)
        });
      } else {
        // Split into sub-blocks
        const paragraphs = fullContent.split(/\n\s*\n/);
        let subIndex = 0;
        let subBuffer: string[] = [];

        for (const p of paragraphs) {
          subBuffer.push(p);
          const subText = subBuffer.join('\n\n');
          if (subText.length >= 800) {
            const tokens = this.tokenize(subText);
            finalChunks.push({
              id: `${documentId}-chk-${idx}-${subIndex++}`,
              documentId,
              sectionTitle: `${rc.title} (Part ${subIndex})`,
              content: subText,
              keywords: Array.from(new Set(tokens)).slice(0, 30),
              tokenEstimate: Math.ceil(subText.length / 4)
            });
            subBuffer = [];
          }
        }

        if (subBuffer.length > 0) {
          const remText = subBuffer.join('\n\n');
          const tokens = this.tokenize(remText);
          finalChunks.push({
            id: `${documentId}-chk-${idx}-${subIndex}`,
            documentId,
            sectionTitle: `${rc.title} (Part ${subIndex + 1})`,
            content: remText,
            keywords: Array.from(new Set(tokens)).slice(0, 30),
            tokenEstimate: Math.ceil(remText.length / 4)
          });
        }
      }
    });

    return finalChunks;
  }

  /**
   * Searches active knowledge documents for the most relevant context chunks.
   */
  public static queryKnowledge(
    query: string,
    documents: KnowledgeDocument[],
    topK: number = 3,
    minScoreThreshold: number = 0.05
  ): RAGQueryResult[] {
    const activeDocs = documents.filter(d => d.isActive && d.chunks.length > 0);
    if (!activeDocs.length || !query.trim()) return [];

    const queryTokens = this.tokenize(query);
    if (!queryTokens.length) return [];

    const queryTf = this.getTermFrequencies(queryTokens);
    const queryLower = query.toLowerCase();

    // Context intent detector: is user asking behavioral / past experience / architecture?
    const isBehavioral = /\b(tell me about|experience|worked on|project|handled|challenge|conflict|leadership|failure|situation|star|metric|scaled|redesign|team|collaborated)\b/i.test(queryLower);
    const isSystemDesign = /\b(system design|architecture|database|cache|queue|microservice|kafka|scale|throughput|latency|sharding|distributed)\b/i.test(queryLower);

    const allResults: RAGQueryResult[] = [];

    for (const doc of activeDocs) {
      for (const chunk of doc.chunks) {
        let score = 0;
        const chunkLower = chunk.content.toLowerCase();
        const chunkTokens = this.tokenize(chunk.content);
        const chunkTf = this.getTermFrequencies(chunkTokens);

        // 1. BM25 / TF-IDF Keyword Match
        for (const [token, qCount] of queryTf.entries()) {
          const docCount = chunkTf.get(token) || 0;
          if (docCount > 0) {
            // TF weighting with length normalization
            const tfWeight = Math.sqrt(docCount) / (1 + Math.log(1 + chunkTokens.length / 50));
            score += tfWeight * (1 + Math.log(qCount)) * 2.0;
          }
        }

        // 2. Exact Title Match Boost
        const titleLower = chunk.sectionTitle.toLowerCase();
        for (const token of queryTokens) {
          if (titleLower.includes(token)) {
            score += 3.5;
          }
        }

        // 3. Category Intent Alignment Boost
        if (isBehavioral && (doc.category === 'behavioral' || doc.category === 'resume')) {
          score *= 1.35;
        }
        if (isSystemDesign && (doc.category === 'system-design' || doc.category === 'projects')) {
          score *= 1.35;
        }

        // 4. Exact multi-word phrase matching
        if (queryTokens.length >= 2) {
          const bigrams: string[] = [];
          for (let i = 0; i < queryTokens.length - 1; i++) {
            bigrams.push(`${queryTokens[i]} ${queryTokens[i + 1]}`);
          }
          for (const bg of bigrams) {
            if (chunkLower.includes(bg)) {
              score += 4.0;
            }
          }
        }

        if (score >= minScoreThreshold) {
          allResults.push({
            chunk,
            score,
            documentTitle: doc.title,
            category: doc.category
          });
        }
      }
    }

    // Sort by descending score
    allResults.sort((a, b) => b.score - a.score);
    return allResults.slice(0, topK);
  }

  /**
   * Formats RAG query results into a structured prompt injection context.
   */
  public static buildPersonalizedContext(results: RAGQueryResult[]): string {
    if (!results.length) return '';

    const contextBlocks = results.map((res, i) => {
      return `[Context Chunk ${i + 1} | Source: "${res.documentTitle}" (${res.category.toUpperCase()}) | Section: "${res.chunk.sectionTitle}"]\n${res.chunk.content.trim()}`;
    }).join('\n\n---\n\n');

    return `\n\n=================================================================\n🎯 CANDIDATE PERSONAL RESUME & REAL-WORLD EXPERIENCE CONTEXT:\n=================================================================\nThe candidate has provided their verified resume, real projects, and past career achievements below. When answering behavioral, architectural, or background questions:\n1. Speak in the FIRST-PERSON ("In my previous role at...", "When I designed the...", "My team and I...").\n2. Seamlessly weave in the specific company names, metrics, scale numbers (e.g. users, QPS, latency reductions), and architectures from the context below.\n3. Follow the STAR framework (Situation, Task, Action, Result) for behavioral questions.\n\n${contextBlocks}\n=================================================================\n`;
  }
}
