import { SnipRegion } from '../../types';

export class ScreenAnalyzer {
  /**
   * Crop an image dataUrl to the given snip region
   */
  public static async cropImage(
    sourceDataUrl: string,
    region: SnipRegion,
    sourceWidth: number,
    sourceHeight: number
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get 2d context for image crop'));
          return;
        }

        // Scale factors if display scaling differs
        const scaleX = img.naturalWidth / sourceWidth;
        const scaleY = img.naturalHeight / sourceHeight;

        const cropX = Math.max(0, region.x * scaleX);
        const cropY = Math.max(0, region.y * scaleY);
        const cropW = Math.min(img.naturalWidth - cropX, region.width * scaleX);
        const cropH = Math.min(img.naturalHeight - cropY, region.height * scaleY);

        canvas.width = cropW;
        canvas.height = cropH;

        ctx.drawImage(
          img,
          cropX,
          cropY,
          cropW,
          cropH,
          0,
          0,
          cropW,
          cropH
        );

        resolve(canvas.toDataURL('image/png', 0.95));
      };
      img.onerror = (err) => reject(err);
      img.src = sourceDataUrl;
    });
  }

  /**
   * Generates prompt template for LeetCode / Coding problems
   */
  public static buildCodingPrompt(language: string = 'Python'): string {
    return `Analyze this coding problem / screenshot:
1. Problem Summary & Key Constraints.
2. Optimal Algorithm Pattern (e.g. Two Pointers, Monotonic Stack, Dynamic Programming, Topological Sort).
3. Production-Ready Code Solution in ${language} with clean comments.
4. Time Complexity & Space Complexity Analysis (in Big-O notation).
5. Edge Cases considered.`;
  }

  /**
   * Generates prompt template for System Design problems
   */
  public static buildSystemDesignPrompt(): string {
    return `Analyze this system design problem / architecture diagram:
1. Requirements (Functional & Non-Functional: QPS, Latency, Data Volume).
2. High-Level Architecture Components & Data Flow.
3. Database & Storage Layer (SQL vs NoSQL, Indexing, Partitioning).
4. Scalability Bottlenecks, Caching (Redis/CDN), and Fault Tolerance.
5. Key Trade-offs & Deep-dive Discussion Points.`;
  }

  /**
   * Generates prompt template for Exam & Multiple Choice Questions
   */
  public static buildExamPrompt(): string {
    return `Solve the question in this screenshot:
1. Correct Option / Answer immediately at the top (bold).
2. Step-by-step mathematical calculation or logical deduction.
3. Quick explanation of why other options are incorrect.`;
  }

  /**
   * Generates prompt template for Bug Debugging & Error Logs
   */
  public static buildDebuggerPrompt(language: string = 'Python'): string {
    return `Analyze this error stack trace / broken code:
1. Root Cause in 1 sentence.
2. Corrected Code Diff / Solution in ${language}.
3. Why this fix works and how to prevent it.`;
  }
}
