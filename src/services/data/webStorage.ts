/**
 * In-memory storage with localStorage persistence for web platform.
 * Mimics the SQLite data layer so all screens work unchanged.
 */
import { v4 as uuidv4 } from 'uuid';
import { Deck, Question, UserStats, SessionResult } from '../../types';

interface StorageData {
  decks: Record<string, Deck>;
  questions: Record<string, Question>;
  sessions: SessionResult[];
  userStats: UserStats;
}

const STORAGE_KEY = 'learnvoice_data';

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

function loadData(): StorageData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { decks: {}, questions: {}, sessions: [], userStats: { ...DEFAULT_STATS } };
}

function saveData(data: StorageData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

let data: StorageData = loadData();

function persist() { saveData(data); }

// ---- Deck operations ----

export async function getAllDecks(): Promise<Deck[]> {
  return Object.values(data.decks)
    .map((d) => ({
      ...d,
      questionCount: Object.values(data.questions).filter((q) => q.deckId === d.id).length,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getDeck(id: string): Promise<Deck | null> {
  const d = data.decks[id];
  if (!d) return null;
  return {
    ...d,
    questionCount: Object.values(data.questions).filter((q) => q.deckId === id).length,
  };
}

export async function createDeck(input: {
  name: string; description?: string; color?: string; icon?: string;
}): Promise<Deck> {
  const now = Date.now();
  const deck: Deck = {
    id: uuidv4(),
    name: input.name,
    description: input.description || '',
    color: input.color || '#6C63FF',
    icon: input.icon || 'book',
    createdAt: now,
    updatedAt: now,
    questionCount: 0,
  };
  data.decks[deck.id] = deck;
  persist();
  return deck;
}

export async function updateDeck(id: string, updates: Partial<Pick<Deck, 'name' | 'description' | 'color' | 'icon'>>): Promise<void> {
  const deck = data.decks[id];
  if (!deck) return;
  Object.assign(deck, updates, { updatedAt: Date.now() });
  persist();
}

export async function deleteDeck(id: string): Promise<void> {
  delete data.decks[id];
  // Delete associated questions
  for (const [qId, q] of Object.entries(data.questions)) {
    if (q.deckId === id) delete data.questions[qId];
  }
  persist();
}

export async function getDecksWithDueQuestions(): Promise<(Deck & { dueCount: number })[]> {
  const now = Date.now();
  const allDecks = await getAllDecks();
  return allDecks
    .map((d) => {
      const dueCount = Object.values(data.questions).filter(
        (q) => q.deckId === d.id && (q.nextReviewDate === null || q.nextReviewDate <= now)
      ).length;
      return { ...d, dueCount };
    })
    .filter((d) => d.dueCount > 0)
    .sort((a, b) => b.dueCount - a.dueCount);
}

// ---- Question operations ----

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'of', 'in', 'to', 'for',
  'with', 'on', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
  'before', 'after', 'and', 'but', 'or', 'nor', 'not', 'so', 'yet',
  'both', 'either', 'neither', 'each', 'every', 'all', 'any', 'few',
  'more', 'most', 'other', 'some', 'such', 'no', 'only', 'own', 'same',
  'than', 'too', 'very', 'just', 'because', 'it', 'its', 'this', 'that',
  'these', 'those', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he',
  'she', 'they', 'them', 'their', 'what', 'which', 'who', 'whom',
]);

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
    .filter((word, index, arr) => arr.indexOf(word) === index)
    .slice(0, 10);
}

export async function getQuestionsByDeck(deckId: string): Promise<Question[]> {
  return Object.values(data.questions)
    .filter((q) => q.deckId === deckId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function getQuestion(id: string): Promise<Question | null> {
  return data.questions[id] || null;
}

export async function getDueQuestions(deckId: string, limit?: number): Promise<Question[]> {
  const now = Date.now();
  let due = Object.values(data.questions)
    .filter((q) => q.deckId === deckId && (q.nextReviewDate === null || q.nextReviewDate <= now))
    .sort((a, b) => {
      if (a.nextReviewDate === null && b.nextReviewDate !== null) return -1;
      if (a.nextReviewDate !== null && b.nextReviewDate === null) return 1;
      return (a.nextReviewDate || 0) - (b.nextReviewDate || 0);
    });
  if (limit) due = due.slice(0, limit);
  return due;
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
  const keywords = input.keywords?.length ? input.keywords : extractKeywords(input.expectedAnswers[0] || '');
  const weights = input.keywordWeights?.length ? input.keywordWeights : keywords.map(() => 1);

  const q: Question = {
    id: uuidv4(),
    deckId: input.deckId,
    question: input.question,
    expectedAnswers: input.expectedAnswers,
    keywords,
    keywordWeights: weights,
    difficulty: input.difficulty || 'medium',
    hints: input.hints || [],
    explanation: input.explanation || '',
    createdAt: Date.now(),
    lastReviewed: null,
    masteryLevel: 0,
    reviewCount: 0,
    correctCount: 0,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReviewDate: null,
  };
  data.questions[q.id] = q;

  // Update deck timestamp
  if (data.decks[input.deckId]) {
    data.decks[input.deckId].updatedAt = Date.now();
  }
  persist();
  return q;
}

export async function updateQuestion(id: string, updates: Partial<Pick<Question,
  'question' | 'expectedAnswers' | 'keywords' | 'keywordWeights' | 'difficulty' | 'hints' | 'explanation'
>>): Promise<void> {
  const q = data.questions[id];
  if (!q) return;
  Object.assign(q, updates);
  persist();
}

export async function updateQuestionAfterReview(
  id: string,
  score: number,
  easeFactor: number,
  interval: number,
  repetitions: number,
  nextReviewDate: number
): Promise<void> {
  const q = data.questions[id];
  if (!q) return;
  q.lastReviewed = Date.now();
  q.masteryLevel = Math.min(100, Math.round(score));
  q.reviewCount += 1;
  if (score >= 70) q.correctCount += 1;
  q.easeFactor = easeFactor;
  q.interval = interval;
  q.repetitions = repetitions;
  q.nextReviewDate = nextReviewDate;
  persist();
}

export async function deleteQuestion(id: string): Promise<void> {
  delete data.questions[id];
  persist();
}

// ---- Stats operations ----

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

export async function getUserStats(): Promise<UserStats> {
  return { ...data.userStats };
}

export async function updateStatsAfterSession(session: SessionResult): Promise<UserStats> {
  const current = data.userStats;
  const today = new Date().toISOString().split('T')[0];
  const lastDate = current.lastStudyDate;

  let newStreak = current.currentStreak;
  if (lastDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (lastDate === yesterday || lastDate === null) {
      newStreak = current.currentStreak + 1;
    } else {
      newStreak = 1;
    }
  }

  const newTotal = current.totalQuestionsAnswered + session.answeredQuestions;
  const sessionTimeMinutes = (session.completedAt - session.startedAt) / 60000;
  const newStudyTime = current.totalStudyTimeMinutes + sessionTimeMinutes;
  const newAccuracy = newTotal > 0
    ? ((current.overallAccuracy * current.totalQuestionsAnswered) + (session.averageScore * session.answeredQuestions)) / newTotal
    : session.averageScore;

  const baseXP = session.answeredQuestions * 10;
  const accuracyBonus = session.averageScore >= 80 ? session.answeredQuestions * 5 : 0;
  const streakBonus = newStreak * 2;
  const perfectBonus = session.perfectAnswers * 10;
  const newXP = current.xpPoints + baseXP + accuracyBonus + streakBonus + perfectBonus;

  data.userStats = {
    totalQuestionsAnswered: newTotal,
    totalStudyTimeMinutes: newStudyTime,
    overallAccuracy: newAccuracy,
    currentStreak: newStreak,
    longestStreak: Math.max(current.longestStreak, newStreak),
    xpPoints: newXP,
    level: calculateLevel(newXP),
    lastStudyDate: today,
  };
  persist();
  return { ...data.userStats };
}

export async function saveSessionResult(session: SessionResult): Promise<void> {
  data.sessions.unshift(session);
  if (data.sessions.length > 100) data.sessions = data.sessions.slice(0, 100);
  persist();
}

export async function getRecentSessions(limit: number = 10): Promise<SessionResult[]> {
  return data.sessions.slice(0, limit);
}
