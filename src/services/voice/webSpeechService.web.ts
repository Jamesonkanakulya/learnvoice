/**
 * Voice service for web using the Web Speech API.
 * Works in Chrome/Edge browsers that support speechSynthesis and SpeechRecognition.
 */

export interface SpeechResult {
  text: string;
  confidence: number;
}

export interface VoiceOption {
  name: string;
  lang: string;
  localService: boolean;
}

class WebSpeechService {
  private recognition: any = null;
  private synthesis: SpeechSynthesis | null = null;
  private isListeningActive = false;
  private onPartialResult: ((text: string) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.synthesis = window.speechSynthesis || null;
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
      }
    }
  }

  get isTTSAvailable(): boolean {
    return this.synthesis !== null;
  }

  get isSTTAvailable(): boolean {
    return this.recognition !== null;
  }

  getAvailableVoices(): VoiceOption[] {
    if (!this.synthesis) return [];
    return this.synthesis.getVoices().map((v) => ({
      name: v.name,
      lang: v.lang,
      localService: v.localService,
    }));
  }

  getBestEnglishVoice(preferredName?: string): SpeechSynthesisVoice | null {
    if (!this.synthesis) return null;
    const voices = this.synthesis.getVoices();
    if (!voices.length) return null;

    if (preferredName) {
      const found = voices.find((v) => v.name === preferredName);
      if (found) return found;
    }

    return (
      voices.find((v) => v.lang.startsWith('en') && v.name.includes('Google')) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0]
    );
  }

  async speak(
    text: string,
    options: { rate?: number; voiceName?: string } = {}
  ): Promise<void> {
    if (!this.synthesis) return;

    const { rate = 1.0, voiceName = '' } = options;

    return new Promise((resolve) => {
      this.synthesis!.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      const voice = this.getBestEnglishVoice(voiceName || undefined);
      if (voice) utterance.voice = voice;

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      this.synthesis!.speak(utterance);
    });
  }

  stopSpeaking(): void {
    this.synthesis?.cancel();
  }

  async startListening(onPartial?: (text: string) => void): Promise<SpeechResult> {
    if (!this.recognition) {
      throw new Error('Speech recognition not available');
    }

    this.onPartialResult = onPartial || null;
    this.isListeningActive = true;

    return new Promise((resolve, reject) => {
      let finalText = '';
      let finalConfidence = 0;

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText = transcript;
            finalConfidence = event.results[i][0].confidence;
          } else {
            interimTranscript += transcript;
          }
        }
        if (interimTranscript && this.onPartialResult) {
          this.onPartialResult(interimTranscript);
        }
      };

      this.recognition.onend = () => {
        this.isListeningActive = false;
        resolve({ text: finalText, confidence: finalConfidence });
      };

      this.recognition.onerror = (event: any) => {
        this.isListeningActive = false;
        if (event.error === 'no-speech') {
          resolve({ text: '', confidence: 0 });
        } else {
          reject(new Error(`Speech recognition error: ${event.error}`));
        }
      };

      this.recognition.start();
    });
  }

  stopListening(): void {
    if (this.recognition && this.isListeningActive) {
      this.recognition.stop();
      this.isListeningActive = false;
    }
  }

  get isListening(): boolean {
    return this.isListeningActive;
  }
}

export const speechService = new WebSpeechService();
