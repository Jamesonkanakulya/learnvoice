/**
 * Voice service for native (iOS/Android).
 * TTS: expo-speech (works in Expo Go)
 * STT: expo-speech-recognition (requires a custom dev build)
 */
import * as Speech from 'expo-speech';
import {
  ExpoSpeechRecognitionModule,
  addSpeechRecognitionListener,
  type ExpoSpeechRecognitionOptions,
} from 'expo-speech-recognition';

export interface SpeechResult {
  text: string;
  confidence: number;
}

export interface VoiceOption {
  name: string;
  lang: string;
  localService: boolean;
}

class NativeSpeechService {
  private _isListening = false;

  get isTTSAvailable(): boolean {
    return true; // expo-speech always works on native
  }

  get isSTTAvailable(): boolean {
    return true; // expo-speech-recognition available in custom dev build
  }

  getAvailableVoices(): VoiceOption[] {
    return []; // expo-speech handles voice selection internally
  }

  async speak(
    text: string,
    options: { rate?: number; voiceName?: string } = {}
  ): Promise<void> {
    const { rate = 1.0 } = options;
    Speech.stop();
    return new Promise((resolve) => {
      Speech.speak(text, {
        rate,
        onDone: resolve,
        onError: () => resolve(),
        onStopped: resolve,
      });
    });
  }

  stopSpeaking(): void {
    Speech.stop();
  }

  async startListening(onPartial?: (text: string) => void): Promise<SpeechResult> {
    // Request permissions first
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      throw new Error('Microphone permission denied.');
    }

    return new Promise((resolve, reject) => {
      this._isListening = true;
      let finalText = '';
      let finalConfidence = 0;

      const options: ExpoSpeechRecognitionOptions = {
        lang: 'en-US',
        interimResults: true,
        continuous: false,
      };

      // Listen for results
      const resultSub = addSpeechRecognitionListener('result', (event) => {
        const results = event.results;
        if (!results || results.length === 0) return;
        const last = results[results.length - 1];
        const transcript = last[0]?.transcript ?? '';
        const confidence = last[0]?.confidence ?? 0;

        if (last.isFinal) {
          finalText = transcript;
          finalConfidence = confidence;
        } else if (onPartial) {
          onPartial(transcript);
        }
      });

      // Listen for end
      const endSub = addSpeechRecognitionListener('end', () => {
        this._isListening = false;
        resultSub.remove();
        endSub.remove();
        errorSub.remove();
        resolve({ text: finalText, confidence: finalConfidence });
      });

      // Listen for errors
      const errorSub = addSpeechRecognitionListener('error', (event) => {
        this._isListening = false;
        resultSub.remove();
        endSub.remove();
        errorSub.remove();
        if (event.error === 'no-speech') {
          resolve({ text: '', confidence: 0 });
        } else {
          reject(new Error(`Speech recognition error: ${event.error}`));
        }
      });

      ExpoSpeechRecognitionModule.start(options);
    });
  }

  stopListening(): void {
    if (this._isListening) {
      ExpoSpeechRecognitionModule.stop();
      this._isListening = false;
    }
  }

  get isListening(): boolean {
    return this._isListening;
  }
}

export const speechService = new NativeSpeechService();
