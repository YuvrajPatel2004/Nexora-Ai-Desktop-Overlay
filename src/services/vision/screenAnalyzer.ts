import { SnipRegion } from '../../types';
import Tesseract from 'tesseract.js';

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
   * Extract text from image via client-side OCR for models that don't accept images (Groq, DeepSeek, o3-mini)
   */
  public static async extractTextFromImage(dataUrl: string): Promise<string> {
    try {
      console.log('[OCR] Running client-side OCR text extraction...');
      const result = await Tesseract.recognize(dataUrl, 'eng');
      const text = result.data.text?.trim() || '';
      console.log(`[OCR] Extracted ${text.length} characters.`);
      return text;
    } catch (err) {
      console.warn('[OCR] Extraction error:', err);
      return '';
    }
  }

  /**
   * Generates prompt template for LeetCode / Coding problems
   */
  public static buildCodingPrompt(language: string = 'Python'): string {
    return `Solve this coding problem in ${language}:
1. Optimal Algorithm & Code Solution.
2. Big-O Time & Space Complexity.
Output only the solution without meta reasoning.`;
  }

  /**
   * Generates prompt template for System Design problems
   */
  public static buildSystemDesignPrompt(): string {
    return `Provide a structured System Design architecture:
1. Requirements & QPS.
2. Component Architecture & DB choice.
3. Scaling & Caching bottlenecks.`;
  }

  /**
   * Generates prompt template for Exam & Multiple Choice Questions
   */
  public static buildExamPrompt(): string {
    return `Solve the question:
1. State the correct answer in bold at the top.
2. Step-by-step mathematical calculation or logical deduction.`;
  }

  /**
   * Generates prompt template for Bug Debugging & Error Logs
   */
  public static buildDebuggerPrompt(language: string = 'Python'): string {
    return `Fix this error/code:
1. Root cause in 1 sentence.
2. Corrected code diff in ${language}.`;
  }
}
