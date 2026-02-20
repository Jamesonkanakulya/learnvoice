import * as Crypto from 'expo-crypto';
import { getDatabase } from './database';
import { Question } from '../../types';

export async function getQuestionsByDeck(deckId: string): Promise<Question[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM questions WHERE deckId = ? ORDER BY createdAt ASC',
    [deckId]
  );
  return rows.map(mapRowToQuestion);
}

export async function getQuestion(id: string): Promise<Question | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>('SELECT * FROM questions WHERE id = ?', [id]);
  return row ? mapRowToQuestion(row) : null;
}

export async function getDueQuestions(deckId: string, limit?: number): Promise<Question[]> {
  const db = await getDatabase();
  const now = Date.now();
  const sql = `SELECT * FROM questions WHERE deckId = ?
    AND (nextReviewDate IS NULL OR nextReviewDate <= ?)
    ORDER BY
      CASE WHEN nextReviewDate IS NULL THEN 0 ELSE 1 END,
      nextReviewDate ASC
    ${limit ? `LIMIT ${limit}` : ''}`;
  const rows = await db.getAllAsync<any>(sql, [deckId, now]);
  return rows.map(mapRowToQuestion);
}

export async function createQuestion(data: {
  deckId: string;
  question: string;
  expectedAnswers: string[];
  keywords?: string[];
  keywordWeights?: number[];
  difficulty?: 'easy' | 'medium' | 'hard';
  hints?: string[];
  explanation?: string;
}): Promise<Question> {
  const db = await getDatabase();
  const id = Crypto.randomUUID();
  const now = Date.now();

  // Auto-extract keywords from expected answers if not provided
  const keywords = data.keywords?.length
    ? data.keywords
    : extractKeywords(data.expectedAnswers[0] || '');

  const weights = data.keywordWeights?.length
    ? data.keywordWeights
    : keywords.map(() => 1);

  await db.runAsync(
    `INSERT INTO questions (id, deckId, question, expectedAnswers, keywords, keywordWeights,
     difficulty, hints, explanation, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, data.deckId, data.question,
      JSON.stringify(data.expectedAnswers),
      JSON.stringify(keywords),
      JSON.stringify(weights),
      data.difficulty || 'medium',
      JSON.stringify(data.hints || []),
      data.explanation || '',
      now,
    ]
  );

  // Update deck's updatedAt
  await db.runAsync('UPDATE decks SET updatedAt = ? WHERE id = ?', [now, data.deckId]);

  return {
    id,
    deckId: data.deckId,
    question: data.question,
    expectedAnswers: data.expectedAnswers,
    keywords,
    keywordWeights: weights,
    difficulty: data.difficulty || 'medium',
    hints: data.hints || [],
    explanation: data.explanation || '',
    createdAt: now,
    lastReviewed: null,
    masteryLevel: 0,
    reviewCount: 0,
    correctCount: 0,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReviewDate: null,
  };
}

export async function updateQuestion(id: string, data: Partial<Pick<Question,
  'question' | 'expectedAnswers' | 'keywords' | 'keywordWeights' | 'difficulty' | 'hints' | 'explanation'
>>): Promise<void> {
  const db = await getDatabase();
  const sets: string[] = [];
  const values: any[] = [];

  if (data.question !== undefined) { sets.push('question = ?'); values.push(data.question); }
  if (data.expectedAnswers !== undefined) { sets.push('expectedAnswers = ?'); values.push(JSON.stringify(data.expectedAnswers)); }
  if (data.keywords !== undefined) { sets.push('keywords = ?'); values.push(JSON.stringify(data.keywords)); }
  if (data.keywordWeights !== undefined) { sets.push('keywordWeights = ?'); values.push(JSON.stringify(data.keywordWeights)); }
  if (data.difficulty !== undefined) { sets.push('difficulty = ?'); values.push(data.difficulty); }
  if (data.hints !== undefined) { sets.push('hints = ?'); values.push(JSON.stringify(data.hints)); }
  if (data.explanation !== undefined) { sets.push('explanation = ?'); values.push(data.explanation); }

  if (sets.length === 0) return;
  values.push(id);

  await db.runAsync(`UPDATE questions SET ${sets.join(', ')} WHERE id = ?`, values);
}

export async function updateQuestionAfterReview(
  id: string,
  score: number,
  easeFactor: number,
  interval: number,
  repetitions: number,
  nextReviewDate: number
): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();
  const mastery = Math.min(100, Math.round(score));

  await db.runAsync(
    `UPDATE questions SET
      lastReviewed = ?, masteryLevel = ?,
      reviewCount = reviewCount + 1,
      correctCount = correctCount + CASE WHEN ? >= 70 THEN 1 ELSE 0 END,
      easeFactor = ?, interval = ?, repetitions = ?, nextReviewDate = ?
     WHERE id = ?`,
    [now, mastery, score, easeFactor, interval, repetitions, nextReviewDate, id]
  );
}

export async function deleteQuestion(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM questions WHERE id = ?', [id]);
}

function mapRowToQuestion(row: any): Question {
  return {
    id: row.id,
    deckId: row.deckId,
    question: row.question,
    expectedAnswers: JSON.parse(row.expectedAnswers || '[]'),
    keywords: JSON.parse(row.keywords || '[]'),
    keywordWeights: JSON.parse(row.keywordWeights || '[]'),
    difficulty: row.difficulty || 'medium',
    hints: JSON.parse(row.hints || '[]'),
    explanation: row.explanation || '',
    createdAt: row.createdAt,
    lastReviewed: row.lastReviewed,
    masteryLevel: row.masteryLevel || 0,
    reviewCount: row.reviewCount || 0,
    correctCount: row.correctCount || 0,
    easeFactor: row.easeFactor || 2.5,
    interval: row.interval || 0,
    repetitions: row.repetitions || 0,
    nextReviewDate: row.nextReviewDate,
  };
}

// Simple keyword extraction: split on spaces, filter short/common words
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
