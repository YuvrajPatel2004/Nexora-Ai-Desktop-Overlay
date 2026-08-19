import { getStoredSettings } from '../storage/settingsStore';

export interface SpeechCallback {
  onInterimText: (text: string) => void;
  onFinalText: (text: string) => void;
  onError: (error: string) => void;
  onStateChange: (isListening: boolean) => void;
  onAudioLevel?: (level: number) => void; // 0 to 100
}

export interface AudioInputDevice {
  deviceId: string;
  label: string;
  isDefault: boolean;
}

export type AudioCaptureMode = 'dual' | 'mic' | 'system';

export class SpeechService {
  private isListening: boolean = false;
  private callbacks: SpeechCallback | null = null;
  private micStream: MediaStream | null = null;
  private systemStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private mixerGain: GainNode | null = null;
  private animFrameId: number | null = null;
  private isTranscribing: boolean = false;
  private captureMode: AudioCaptureMode = 'dual';
  private selectedDeviceId: string = 'default';
  
  // Raw PCM sample buffer (16kHz mono)
  private pcmSampleBuffer: Float32Array[] = [];
  private totalSamples: number = 0;

  // Adaptive Voice Activity Detection (VAD)
  private noiseFloor: number = 20; // Calibrated ambient noise
  private lastSpokenTime: number = 0;
  private speechStartTime: number = 0;
  private hasDetectedSpeech: boolean = false;

  public setCaptureMode(mode: AudioCaptureMode) {
    this.captureMode = mode;
  }

  public setSelectedDevice(deviceId: string) {
    this.selectedDeviceId = deviceId;
  }

  public async getAudioDevices(): Promise<AudioInputDevice[]> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return [];
      }
      
      // Request mic permission first to get real device labels
      // (browsers hide labels until permission is granted)
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tempStream.getTracks().forEach(t => t.stop());
      } catch (_) {
        // Permission denied or no devices — continue with what we have
      }
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter(d => d.kind === 'audioinput')
        .map((d, idx) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${idx + 1} (${d.deviceId.slice(0, 8)}...)`,
          isDefault: d.deviceId === 'default'
        }));
    } catch (e) {
      console.warn('Failed to enumerate audio devices:', e);
      return [];
    }
  }

  private linkInterval: any = null;

  public async start(callbacks: SpeechCallback) {
    this.callbacks = callbacks;
    this.isListening = true;
    this.noiseFloor = 20;
    this.hasDetectedSpeech = false;
    this.lastSpokenTime = 0;
    this.speechStartTime = 0;
    this.pcmSampleBuffer = [];
    this.totalSamples = 0;
    this.callbacks.onStateChange(true);

    // Automatically link system output monitors across all OSes (Linux PipeWire, Windows, macOS)
    (window as any).electronAPI?.linkSystemAudioOutput?.();
    if (this.linkInterval) clearInterval(this.linkInterval);
    this.linkInterval = setInterval(() => {
      if (this.isListening) {
        (window as any).electronAPI?.linkSystemAudioOutput?.();
      }
    }, 2500);

    const success = await this.startAudioCapture();
    if (!success) {
      this.callbacks.onError('Could not access microphone/system audio. Please check audio permissions.');
    }
  }

  private async startAudioCapture(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return false;
      }

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return false;

      this.audioContext = new AudioCtx();
      const targetSampleRate = 16000;
      const inputSampleRate = this.audioContext.sampleRate;

      // Master Mixer Node & Analyser
      this.mixerGain = this.audioContext.createGain();
      this.mixerGain.gain.value = 1.0;

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.mixerGain.connect(this.analyser);
      this.monitorAudioLevel();

      // ScriptProcessor for raw PCM capture (buffer size 4096)
      this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);
      this.processorNode.onaudioprocess = (e) => {
        if (!this.isListening) return;
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Resample from inputSampleRate (e.g. 48kHz) to 16kHz
        const downsampled = this.downsampleBuffer(inputData, inputSampleRate, targetSampleRate);
        this.pcmSampleBuffer.push(downsampled);
        this.totalSamples += downsampled.length;

        // Keep buffer capped at 12s
        const maxSamples = targetSampleRate * 12;
        while (this.totalSamples > maxSamples && this.pcmSampleBuffer.length > 0) {
          const removed = this.pcmSampleBuffer.shift();
          if (removed) this.totalSamples -= removed.length;
        }
      };

      this.mixerGain.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      // 1. Capture Microphone Stream (Your voice)
      if (this.captureMode === 'dual' || this.captureMode === 'mic') {
        try {
          // Build audio constraints based on selected device
          let audioConstraints: MediaTrackConstraints = {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: true,
          };

          // If a specific device is selected (not 'default' or empty),
          // use { exact: deviceId } to force that device. Otherwise let
          // the browser pick the system default.
          if (this.selectedDeviceId && this.selectedDeviceId !== 'default') {
            audioConstraints.deviceId = { exact: this.selectedDeviceId };
          }

          const micConstraints: MediaStreamConstraints = {
            audio: audioConstraints
          };

          this.micStream = await navigator.mediaDevices.getUserMedia(micConstraints);
          const micSource = this.audioContext.createMediaStreamSource(this.micStream);
          const micGain = this.audioContext.createGain();
          micGain.gain.value = 1.2; // Slightly boost mic
          micSource.connect(micGain);
          micGain.connect(this.mixerGain);
          
          console.log(`[SpeechService] Mic captured: ${this.micStream.getAudioTracks()[0]?.label || 'unknown device'}`);
        } catch (err: any) {
          console.warn('[SpeechService] Mic capture warning:', err);
          
          // If exact device failed, try again with no device constraint (system default)
          if (this.selectedDeviceId && this.selectedDeviceId !== 'default') {
            console.log('[SpeechService] Falling back to system default mic...');
            try {
              this.micStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                  echoCancellation: false,
                  noiseSuppression: false,
                  autoGainControl: true,
                }
              });
              const micSource = this.audioContext!.createMediaStreamSource(this.micStream);
              const micGain = this.audioContext!.createGain();
              micGain.gain.value = 1.2;
              micSource.connect(micGain);
              micGain.connect(this.mixerGain!);
              console.log(`[SpeechService] Fallback mic captured: ${this.micStream.getAudioTracks()[0]?.label || 'unknown device'}`);
            } catch (fallbackErr) {
              console.warn('[SpeechService] Fallback mic also failed:', fallbackErr);
            }
          }
        }
      }

      // 2. Capture System Loopback Audio (Interviewer voice through earphones/speakers)
      if (this.captureMode === 'dual' || this.captureMode === 'system') {
        try {
          // In Electron with desktopCapturer or getDisplayMedia
          if (navigator.mediaDevices.getDisplayMedia) {
            this.systemStream = await navigator.mediaDevices.getDisplayMedia({
              video: true,
              audio: true
            });

            // If audio track is present in display media
            if (this.systemStream.getAudioTracks().length > 0) {
              const systemSource = this.audioContext.createMediaStreamSource(this.systemStream);
              const systemGain = this.audioContext.createGain();
              systemGain.gain.value = 1.4; // Boost interviewer volume
              systemSource.connect(systemGain);
              systemGain.connect(this.mixerGain);
            }
          }
        } catch (_) {
          // If system loopback wasn't granted or unsupported on this display, mic capture handles input
        }
      }

      return true;
    } catch (err: any) {
      console.warn('[SpeechService] Master Audio Capture error:', err);
      this.callbacks?.onError(`Audio Error: ${err.message || err}`);
      return false;
    }
  }

  private downsampleBuffer(buffer: Float32Array, inputRate: number, outputRate: number): Float32Array {
    if (inputRate === outputRate) {
      return new Float32Array(buffer);
    }
    const sampleRateRatio = inputRate / outputRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = count > 0 ? accum / count : 0;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  }

  private monitorAudioLevel() {
    if (!this.analyser || !this.isListening) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const checkLevel = () => {
      if (!this.analyser || !this.isListening) return;
      this.analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      const currentLevel = Math.min(100, Math.round((avg / 128) * 100));

      this.callbacks?.onAudioLevel?.(currentLevel);

      // Calibrate ambient noise floor
      if (currentLevel < 35) {
        this.noiseFloor = this.noiseFloor * 0.96 + currentLevel * 0.04;
      }

      // Dynamic speech threshold
      const speechThreshold = Math.max(38, Math.round(this.noiseFloor + 15));
      const now = Date.now();

      if (currentLevel >= speechThreshold) {
        // Voice detected (either from mic or interviewer in earphones)
        this.lastSpokenTime = now;
        if (!this.hasDetectedSpeech) {
          this.hasDetectedSpeech = true;
          this.speechStartTime = now;
          this.callbacks?.onInterimText('Listening to question...');
        } else if (now - this.speechStartTime > 6500) {
          // Continuous talking guard: auto-flush after 6.5s
          this.speechStartTime = now;
          this.flushAndTranscribe();
        }
      } else if (this.hasDetectedSpeech && (now - this.lastSpokenTime > 750)) {
        // Silence detected for 750ms after speech -> auto-transcribe!
        this.hasDetectedSpeech = false;
        this.flushAndTranscribe();
      }

      this.animFrameId = requestAnimationFrame(checkLevel);
    };

    checkLevel();
  }

  public async flushAndTranscribe() {
    if (this.pcmSampleBuffer.length === 0 || this.isTranscribing) return;

    // Flatten PCM samples
    const merged = new Float32Array(this.totalSamples);
    let offset = 0;
    for (const chunk of this.pcmSampleBuffer) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    // Reset buffer for next question
    this.pcmSampleBuffer = [];
    this.totalSamples = 0;

    // If less than 0.5s of audio (8000 samples @ 16kHz), skip
    if (merged.length < 8000) return;

    // Encode to standard RIFF PCM 16-bit 16kHz WAV
    const wavBlob = this.encodeWAV(merged, 16000);

    this.isTranscribing = true;
    this.callbacks?.onInterimText('Transcribing with AI...');

    try {
      const text = await this.transcribeWAV(wavBlob);
      const clean = text?.trim() || '';
      
      // Filter out Whisper & Gemini silent hallucinations
      const lower = clean.toLowerCase().replace(/[.,!?;:'"“”]/g, '').trim();
      const hallucinations = [
        'thank you',
        'thank you so much',
        'thanks for watching',
        'thank you for watching',
        'thanks for listening',
        'subtitles by',
        'translated by',
        'bye',
        'you',
        'the end',
        'subtitle',
        'silence'
      ];

      if (clean.length > 1 && !hallucinations.includes(lower)) {
        this.callbacks?.onInterimText('');
        this.callbacks?.onFinalText(clean);
      } else {
        this.callbacks?.onInterimText('');
      }
    } catch (err: any) {
      console.warn('[SpeechService] Transcription error:', err);
      this.callbacks?.onError(`Audio STT error: ${err.message || err}`);
      this.callbacks?.onInterimText('');
    } finally {
      this.isTranscribing = false;
    }
  }

  private encodeWAV(samples: Float32Array, sampleRate: number): Blob {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    // RIFF chunk descriptor
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');

    // fmt sub-chunk
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, 1, true); // NumChannels (1 = Mono)
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
    view.setUint16(32, 2, true); // BlockAlign (NumChannels * BitsPerSample/8)
    view.setUint16(34, 16, true); // BitsPerSample (16 bits)

    // data sub-chunk
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    // Write PCM audio data (convert Float32 [-1.0, 1.0] to Int16)
    let byteOffset = 44;
    for (let i = 0; i < samples.length; i++, byteOffset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(byteOffset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  private async transcribeWAV(wavBlob: Blob): Promise<string> {
    const settings = getStoredSettings();
    const geminiKey = settings.apiKeys.gemini?.trim();
    const groqKey = settings.apiKeys.groq?.trim();
    const openAIKey = settings.apiKeys.openai?.trim();

    // 1. Gemini 2.0 Flash / 1.5 Flash Audio Transcription
    if (geminiKey) {
      try {
        const base64Wav = await this.blobToBase64(wavBlob);
        if (base64Wav) {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: 'Transcribe the spoken words verbatim into English text. Output ONLY the transcribed words with zero preamble or commentary:' },
                  { inlineData: { mimeType: 'audio/wav', data: base64Wav } }
                ]
              }],
              generationConfig: {
                temperature: 0.0,
                maxOutputTokens: 256
              }
            })
          });

          if (res.ok) {
            const json = await res.json();
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text?.trim()) return text.trim();
          } else {
            // Try fallback endpoint
            const fallbackRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{
                  parts: [
                    { text: 'Transcribe this audio verbatim in English. Return only the raw spoken text:' },
                    { inlineData: { mimeType: 'audio/wav', data: base64Wav } }
                  ]
                }],
                generationConfig: {
                  temperature: 0.0,
                  maxOutputTokens: 256
                }
              })
            });

            if (fallbackRes.ok) {
              const json = await fallbackRes.json();
              const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text?.trim()) return text.trim();
            } else {
              const err = await fallbackRes.json().catch(() => null);
              console.warn('[SpeechService] Gemini API Error:', err);
              if (err?.error?.message) {
                this.callbacks?.onError(`Gemini Audio error: ${err.error.message}`);
              }
            }
          }
        }
      } catch (e: any) {
        console.warn('[SpeechService] Gemini STT Exception:', e);
      }
    }

    // 2. Groq Whisper (whisper-large-v3)
    if (groqKey) {
      try {
        const formData = new FormData();
        formData.append('file', wavBlob, 'audio.wav');
        formData.append('model', 'whisper-large-v3');
        formData.append('language', 'en');
        formData.append('response_format', 'json');

        const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${groqKey}` },
          body: formData
        });

        if (res.ok) {
          const json = await res.json();
          if (json.text?.trim()) return json.text.trim();
        }
      } catch (e) {
        console.warn('Groq whisper failed:', e);
      }
    }

    // 3. OpenAI Whisper
    if (openAIKey) {
      try {
        const formData = new FormData();
        formData.append('file', wavBlob, 'audio.wav');
        formData.append('model', 'whisper-1');
        formData.append('language', 'en');

        const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${openAIKey}` },
          body: formData
        });

        if (res.ok) {
          const json = await res.json();
          if (json.text?.trim()) return json.text.trim();
        }
      } catch (e) {
        console.warn('OpenAI whisper failed:', e);
      }
    }

    if (!geminiKey && !groqKey && !openAIKey) {
      this.callbacks?.onError('Please add a Gemini, Groq, or OpenAI API key in Settings (⚙️) to enable speech recognition.');
    }
    return '';
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  public stop() {
    this.isListening = false;
    if (this.linkInterval) {
      clearInterval(this.linkInterval);
      this.linkInterval = null;
    }
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.processorNode) {
      try { this.processorNode.disconnect(); } catch (_) {}
      this.processorNode = null;
    }
    if (this.mixerGain) {
      try { this.mixerGain.disconnect(); } catch (_) {}
      this.mixerGain = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    if (this.systemStream) {
      this.systemStream.getTracks().forEach(t => t.stop());
      this.systemStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try { this.audioContext.close(); } catch (_) {}
      this.audioContext = null;
    }
    this.pcmSampleBuffer = [];
    this.totalSamples = 0;
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
