import * as Crypto from 'expo-crypto';
import { getDatabase } from './database';
import { UserStats, SessionResult } from '../../types';

export async function getUserStats(): Promise<UserStats> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>('SELECT * FROM user_stats WHERE id = 1');
  if (!row) {
    return {
      totalQuestionsAnswered: 0,
      totalStudyTimeMinutes: 0,
      overallAccuracy: 0,
      currentStreak: 0,
      longestStreak: 0,
      xpPoints: 0,
      level: 1,
      lastStudyDate: null,
    };
  }
  return {
    totalQuestionsAnswered: row.totalQuestionsAnswered || 0,
    totalStudyTimeMinutes: row.totalStudyTimeMinutes || 0,
    overallAccuracy: row.overallAccuracy || 0,
    currentStreak: row.currentStreak || 0,
    longestStreak: row.longestStreak || 0,
    xpPoints: row.xpPoints || 0,
    level: row.level || 1,
    lastStudyDate: row.lastStudyDate || null,
  };
}

export async function updateStatsAfterSession(session: SessionResult): Promise<UserStats> {
  const db = await getDatabase();
  const current = await getUserStats();

  const today = new Date().toISOString().split('T')[0];
  const lastDate = current.lastStudyDate;

  // Calculate streak
  let newStreak = current.currentStreak;
  if (lastDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (lastDate === yesterday || lastDate === null) {
      newStreak = current.currentStreak + 1;
    } else {
      newStreak = 1; // Reset streak
    }
  }

  const newTotal = current.totalQuestionsAnswered + session.answeredQuestions;
  const sessionTimeMinutes = (session.completedAt - session.startedAt) / 60000;
  const newStudyTime = current.totalStudyTimeMinutes + sessionTimeMinutes;

  // Weighted average for overall accuracy
  const newAccuracy = newTotal > 0
    ? ((current.overallAccuracy * current.totalQuestionsAnswered) + (session.averageScore * session.answeredQuestions)) / newTotal
    : session.averageScore;

  // XP: base 10 per question + bonus for accuracy + bonus for streak
  const baseXP = session.answeredQuestions * 10;
  const accuracyBonus = session.averageScore >= 80 ? session.answeredQuestions * 5 : 0;
  const streakBonus = newStreak * 2;
  const perfectBonus = session.perfectAnswers * 10;
  const newXP = current.xpPoints + baseXP + accuracyBonus + streakBonus + perfectBonus;
  const newLevel = calculateLevel(newXP);

  const newLongest = Math.max(current.longestStreak, newStreak);

  await db.runAsync(
    `UPDATE user_stats SET
      totalQuestionsAnswered = ?,
      totalStudyTimeMinutes = ?,
      overallAccuracy = ?,
      currentStreak = ?,
      longestStreak = ?,
      xpPoints = ?,
      level = ?,
      lastStudyDate = ?
     WHERE id = 1`,
    [newTotal, newStudyTime, newAccuracy, newStreak, newLongest, newXP, newLevel, today]
  );

  return {
    totalQuestionsAnswered: newTotal,
    totalStudyTimeMinutes: newStudyTime,
    overallAccuracy: newAccuracy,
    currentStreak: newStreak,
    longestStreak: newLongest,
    xpPoints: newXP,
    level: newLevel,
    lastStudyDate: today,
  };
}

export async function saveSessionResult(session: SessionResult): Promise<void> {
  const db = await getDatabase();
  const id = Crypto.randomUUID();
  await db.runAsync(
    `INSERT INTO session_history (id, deckId, deckName, startedAt, completedAt,
     totalQuestions, answeredQuestions, skippedQuestions, averageScore, perfectAnswers, resultsJson)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, session.deckId, session.deckName, session.startedAt, session.completedAt,
      session.totalQuestions, session.answeredQuestions, session.skippedQuestions,
      session.averageScore, session.perfectAnswers, JSON.stringify(session.results),
    ]
  );
}

export async function getRecentSessions(limit: number = 10): Promise<SessionResult[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM session_history ORDER BY completedAt DESC LIMIT ?',
    [limit]
  );
  return rows.map((r: any) => ({
    deckId: r.deckId,
    deckName: r.deckName,
    startedAt: r.startedAt,
    completedAt: r.completedAt,
    totalQuestions: r.totalQuestions,
    answeredQuestions: r.answeredQuestions,
    skippedQuestions: r.skippedQuestions,
    averageScore: r.averageScore,
    perfectAnswers: r.perfectAnswers,
    results: JSON.parse(r.resultsJson || '[]'),
  }));
}

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
