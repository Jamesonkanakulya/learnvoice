import { Platform } from 'react-native';
import { Deck, Question, UserStats, SessionResult } from '../../types';

// Lazy-loaded modules
let nativeDeckService: typeof import('./deckService') | null = null;
let nativeQuestionService: typeof import('./questionService') | null = null;
let nativeStatsService: typeof import('./statsService') | null = null;
let webStorage: typeof import('./webStorage') | null = null;

const isWeb = Platform.OS === 'web';

async function getWeb() {
  if (!webStorage) webStorage = await import('./webStorage');
  return webStorage;
}

async function getNativeDeck() {
  if (!nativeDeckService) nativeDeckService = await import('./deckService');
  return nativeDeckService;
}

async function getNativeQuestion() {
  if (!nativeQuestionService) nativeQuestionService = await import('./questionService');
  return nativeQuestionService;
}

async function getNativeStats() {
  if (!nativeStatsService) nativeStatsService = await import('./statsService');
  return nativeStatsService;
}

// ---- Deck operations ----

export async function getAllDecks(): Promise<Deck[]> {
  if (isWeb) return (await getWeb()).getAllDecks();
  return (await getNativeDeck()).getAllDecks();
}

export async function getDeck(id: string): Promise<Deck | null> {
  if (isWeb) return (await getWeb()).getDeck(id);
  return (await getNativeDeck()).getDeck(id);
}

export async function createDeck(input: {
  name: string; description?: string; color?: string; icon?: string;
}): Promise<Deck> {
  if (isWeb) return (await getWeb()).createDeck(input);
  return (await getNativeDeck()).createDeck(input);
}

export async function updateDeck(id: string, updates: Partial<Pick<Deck, 'name' | 'description' | 'color' | 'icon'>>): Promise<void> {
  if (isWeb) return (await getWeb()).updateDeck(id, updates);
  return (await getNativeDeck()).updateDeck(id, updates);
}

export async function deleteDeck(id: string): Promise<void> {
  if (isWeb) return (await getWeb()).deleteDeck(id);
  return (await getNativeDeck()).deleteDeck(id);
}

export async function getDecksWithDueQuestions(): Promise<(Deck & { dueCount: number })[]> {
  if (isWeb) return (await getWeb()).getDecksWithDueQuestions();
  return (await getNativeDeck()).getDecksWithDueQuestions();
}

// ---- Question operations ----

export async function getQuestionsByDeck(deckId: string): Promise<Question[]> {
  if (isWeb) return (await getWeb()).getQuestionsByDeck(deckId);
  return (await getNativeQuestion()).getQuestionsByDeck(deckId);
}

export async function getQuestion(id: string): Promise<Question | null> {
  if (isWeb) return (await getWeb()).getQuestion(id);
  return (await getNativeQuestion()).getQuestion(id);
}

export async function getDueQuestions(deckId: string, limit?: number): Promise<Question[]> {
  if (isWeb) return (await getWeb()).getDueQuestions(deckId, limit);
  return (await getNativeQuestion()).getDueQuestions(deckId, limit);
}

export async function createQuestion(input: {
  deckId: string;
  question: string;
  expectedAnswers: string[];
  keywords?: string[];
  keywordWeights?: number[];
  difficulty?: 'easy' | 'medium' | 'hard';
  hints?: string[];
  explanation?: string;
}): Promise<Question> {
  if (isWeb) return (await getWeb()).createQuestion(input);
  return (await getNativeQuestion()).createQuestion(input);
}

export async function updateQuestion(id: string, updates: Partial<Pick<Question,
  'question' | 'expectedAnswers' | 'keywords' | 'keywordWeights' | 'difficulty' | 'hints' | 'explanation'
>>): Promise<void> {
  if (isWeb) return (await getWeb()).updateQuestion(id, updates);
  return (await getNativeQuestion()).updateQuestion(id, updates);
}

export async function updateQuestionAfterReview(
  id: string, score: number, easeFactor: number, interval: number,
  repetitions: number, nextReviewDate: number
): Promise<void> {
  if (isWeb) return (await getWeb()).updateQuestionAfterReview(id, score, easeFactor, interval, repetitions, nextReviewDate);
  return (await getNativeQuestion()).updateQuestionAfterReview(id, score, easeFactor, interval, repetitions, nextReviewDate);
}

export async function deleteQuestion(id: string): Promise<void> {
  if (isWeb) return (await getWeb()).deleteQuestion(id);
  return (await getNativeQuestion()).deleteQuestion(id);
}

// ---- Stats operations ----

export async function getUserStats(): Promise<UserStats> {
  if (isWeb) return (await getWeb()).getUserStats();
  return (await getNativeStats()).getUserStats();
}

export async function updateStatsAfterSession(session: SessionResult): Promise<UserStats> {
  if (isWeb) return (await getWeb()).updateStatsAfterSession(session);
  return (await getNativeStats()).updateStatsAfterSession(session);
}

export async function saveSessionResult(session: SessionResult): Promise<void> {
  if (isWeb) return (await getWeb()).saveSessionResult(session);
  return (await getNativeStats()).saveSessionResult(session);
}

export async function getRecentSessions(limit?: number): Promise<SessionResult[]> {
  if (isWeb) return (await getWeb()).getRecentSessions(limit);
  return (await getNativeStats()).getRecentSessions(limit);
}
