export interface Deck {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  createdAt: number;
  updatedAt: number;
  questionCount: number;
}

export interface Question {
  id: string;
  deckId: string;
  question: string;
  expectedAnswers: string[];
  keywords: string[];
  keywordWeights: number[];
  difficulty: 'easy' | 'medium' | 'hard';
  hints: string[];
  explanation: string;
  createdAt: number;
  lastReviewed: number | null;
  masteryLevel: number;
  reviewCount: number;
  correctCount: number;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: number | null;
}

export interface EvaluationResult {
  score: number;
  keywordScore: number;
  keywordDetails: { keyword: string; found: boolean; weight: number }[];
  feedback: Feedback;
  userAnswer: string;
  expectedAnswer: string;
  skipped?: boolean;
}

export interface Feedback {
  message: string;
  details: string;
  category: 'perfect' | 'excellent' | 'good' | 'needsWork' | 'incorrect';
}

export interface SessionConfig {
  mode: 'text' | 'voice' | 'hybrid';
  questionCount: number | 'all';
  shuffleQuestions: boolean;
  repeatIncorrect: boolean;
  showHints: boolean;
  difficultyFilter: ('easy' | 'medium' | 'hard')[];
}

export interface SessionResult {
  deckId: string;
  deckName: string;
  startedAt: number;
  completedAt: number;
  totalQuestions: number;
  answeredQuestions: number;
  skippedQuestions: number;
  averageScore: number;
  perfectAnswers: number;
  results: EvaluationResult[];
}

export interface DeckStats {
  questionsAnswered: number;
  averageScore: number;
  masteryLevel: number;
  lastStudied: number | null;
  totalStudyTime: number;
}

export interface UserStats {
  totalQuestionsAnswered: number;
  totalStudyTimeMinutes: number;
  overallAccuracy: number;
  currentStreak: number;
  longestStreak: number;
  xpPoints: number;
  level: number;
  lastStudyDate: string | null;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  unlockedAt: number | null;
}

export type RootStackParamList = {
  MainTabs: undefined;
  DeckDetail: { deckId: string };
  CreateDeck: undefined;
  EditDeck: { deckId: string };
  AddQuestion: { deckId: string };
  EditQuestion: { deckId: string; questionId: string };
  StudySession: { deckId: string };
  SessionResults: { result: SessionResult };
  ImportDeck: undefined;
  Achievements: undefined;
};

export type TabParamList = {
  Home: undefined;
  Decks: undefined;
  Stats: undefined;
  Settings: undefined;
};
