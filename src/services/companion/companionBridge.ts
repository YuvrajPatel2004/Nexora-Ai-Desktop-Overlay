import { CompanionServerInfo } from '../../types';

export class CompanionBridge {
  private static listeners: Set<(action: string, payload?: any) => void> = new Set();
  private static isInitialized = false;

  public static init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    const electron = (window as any).electronAPI;
    if (electron?.onCompanionAction) {
      electron.onCompanionAction((action: string, payload?: any) => {
        console.log(`[CompanionBridge] Action from mobile device:`, action, payload);
        this.listeners.forEach(cb => cb(action, payload));
      });
    }
  }

  public static addActionListener(cb: (action: string, payload?: any) => void): () => void {
    this.init();
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  public static async getInfo(): Promise<CompanionServerInfo> {
    const electron = (window as any).electronAPI;
    if (electron?.getCompanionInfo) {
      return await electron.getCompanionInfo();
    }
    // Browser dev fallback
    return {
      isRunning: true,
      port: 4123,
      localIp: 'localhost',
      fullUrl: 'http://localhost:4123',
      connectedCount: 0
    };
  }

  public static broadcastSolution(solutionText: string) {
    const electron = (window as any).electronAPI;
    electron?.broadcastToCompanion?.('solution', solutionText);
  }

  public static broadcastTranscript(transcriptText: string) {
    const electron = (window as any).electronAPI;
    electron?.broadcastToCompanion?.('transcript', transcriptText);
  }

  public static broadcastMode(mode: string) {
    const electron = (window as any).electronAPI;
    electron?.broadcastToCompanion?.('mode', mode);
  }

  public static broadcastAudioState(isListening: boolean) {
    const electron = (window as any).electronAPI;
    electron?.broadcastToCompanion?.('audio-state', isListening);
  }
}
