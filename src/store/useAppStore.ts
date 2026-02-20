import { create } from 'zustand';
import { UserStats } from '../types';

export interface VoiceSettings {
  ttsEnabled: boolean;
  sttEnabled: boolean;
  autoReadQuestions: boolean;
  autoListen: boolean;
  speechRate: number; // 0.5 | 0.75 | 1.0 | 1.5 | 2.0
  selectedVoiceName: string; // '' means auto-select best voice
}

const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  ttsEnabled: true,
  sttEnabled: true,
  autoReadQuestions: false,
  autoListen: false,
  speechRate: 1.0,
  selectedVoiceName: '',
};

interface AppState {
  isDarkMode: boolean;
  toggleDarkMode: () => void;

  userStats: UserStats;
  setUserStats: (stats: UserStats) => void;
  addXP: (amount: number) => void;

  isDbReady: boolean;
  setDbReady: (ready: boolean) => void;

  voiceSettings: VoiceSettings;
  setVoiceSettings: (updates: Partial<VoiceSettings>) => void;
}

const DEFAULT_STATS: UserStats = {
  totalQuestionsAnswered: 0,
  totalStudyTimeMinutes: 0,
  overallAccuracy: 0,
  currentStreak: 0,
  longestStreak: 0,
  xpPoints: 0,
  level: 1,
  lastStudyDate: null,
};

function calculateLevel(xp: number): number {
  let level = 1;
  let threshold = 100;
  let remaining = xp;
  while (remaining >= threshold) {
    remaining -= threshold;
    level++;
    threshold = Math.floor(threshold * 1.5);
  }
  return level;
}

export const useAppStore = create<AppState>((set) => ({
  isDarkMode: false,
  toggleDarkMode: () => set((s) => ({ isDarkMode: !s.isDarkMode })),

  userStats: DEFAULT_STATS,
  setUserStats: (stats) => set({ userStats: stats }),
  addXP: (amount) =>
    set((s) => {
      const newXP = s.userStats.xpPoints + amount;
      return {
        userStats: {
          ...s.userStats,
          xpPoints: newXP,
          level: calculateLevel(newXP),
        },
      };
    }),

  isDbReady: false,
  setDbReady: (ready) => set({ isDbReady: ready }),

  voiceSettings: DEFAULT_VOICE_SETTINGS,
  setVoiceSettings: (updates) =>
    set((s) => ({ voiceSettings: { ...s.voiceSettings, ...updates } })),
}));
