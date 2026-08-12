export interface SpeechCallback {
  onInterimText: (text: string) => void;
  onFinalText: (text: string) => void;
  onError: (error: string) => void;
  onStateChange: (isListening: boolean) => void;
}

export class SpeechService {
  private recognition: any = null;
  private isListening: boolean = false;
  private callbacks: SpeechCallback | null = null;
  private restartTimeout: any = null;

  constructor() {
    this.initRecognition();
  }

  private initRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech Recognition API is not supported in this browser environment.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.isListening = true;
      this.callbacks?.onStateChange(true);
    };

    this.recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (interim) {
        this.callbacks?.onInterimText(interim);
      }
      if (final) {
        this.callbacks?.onFinalText(final.trim());
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech') {
        this.callbacks?.onError(event.error);
      }
    };

    this.recognition.onend = () => {
      // Auto-restart if we intended to keep listening
      if (this.isListening) {
        this.restartTimeout = setTimeout(() => {
          try {
            if (this.isListening && this.recognition) {
              this.recognition.start();
            }
          } catch (e) {
            console.warn('Error restarting speech recognition:', e);
          }
        }, 300);
      } else {
        this.callbacks?.onStateChange(false);
      }
    };
  }

  public start(callbacks: SpeechCallback) {
    this.callbacks = callbacks;
    if (!this.recognition) {
      this.initRecognition();
    }
    if (!this.recognition) {
      callbacks.onError('Speech Recognition API not supported.');
      return;
    }

    try {
      this.isListening = true;
      this.recognition.start();
    } catch (e: any) {
      // If already started, ignore error
      if (e.name !== 'InvalidStateError') {
        callbacks.onError(e.message || 'Failed to start speech recognition');
      }
    }
  }

  public stop() {
    this.isListening = false;
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (_) {}
    }
    this.callbacks?.onStateChange(false);
  }

  public toggle(callbacks: SpeechCallback): boolean {
    if (this.isListening) {
      this.stop();
      return false;
    } else {
      this.start(callbacks);
      return true;
    }
  }

  public getIsListening(): boolean {
    return this.isListening;
  }
}

export const speechService = new SpeechService();
