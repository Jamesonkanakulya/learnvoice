/**
 * Voice service for native (iOS/Android) using expo-speech for TTS.
 * STT (speech-to-text) is not available in standard Expo Go — it requires
 * a custom dev build with expo-speech-recognition.
 */
import * as Speech from 'expo-speech';

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
  get isTTSAvailable(): boolean {
    return true; // expo-speech always works on native
  }

  get isSTTAvailable(): boolean {
    return false; // Requires a custom dev build with expo-speech-recognition
  }

  getAvailableVoices(): VoiceOption[] {
    return []; // expo-speech handles voice selection internally
  }

  async speak(
    text: string,
    options: { rate?: number; voiceName?: string } = {}
  ): Promise<void> {
    const { rate = 1.0 } = options;
    // Stop any ongoing speech before starting new
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

  async startListening(_onPartial?: (text: string) => void): Promise<SpeechResult> {
    throw new Error('Voice input is not available in Expo Go. Please type your answer.');
  }

  stopListening(): void {
    // no-op on native without expo-speech-recognition
  }

  get isListening(): boolean {
    return false;
  }
}

export const speechService = new NativeSpeechService();
