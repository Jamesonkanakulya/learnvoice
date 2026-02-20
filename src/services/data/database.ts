import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('learnvoice.db');
  await initializeDatabase(db);
  return db;
}

async function initializeDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS decks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      color TEXT DEFAULT '#6C63FF',
      icon TEXT DEFAULT 'book',
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      deckId TEXT NOT NULL,
      question TEXT NOT NULL,
      expectedAnswers TEXT NOT NULL DEFAULT '[]',
      keywords TEXT NOT NULL DEFAULT '[]',
      keywordWeights TEXT NOT NULL DEFAULT '[]',
      difficulty TEXT DEFAULT 'medium',
      hints TEXT NOT NULL DEFAULT '[]',
      explanation TEXT DEFAULT '',
      createdAt INTEGER NOT NULL,
      lastReviewed INTEGER,
      masteryLevel INTEGER DEFAULT 0,
      reviewCount INTEGER DEFAULT 0,
      correctCount INTEGER DEFAULT 0,
      easeFactor REAL DEFAULT 2.5,
      interval INTEGER DEFAULT 0,
      repetitions INTEGER DEFAULT 0,
      nextReviewDate INTEGER,
      FOREIGN KEY (deckId) REFERENCES decks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS session_history (
      id TEXT PRIMARY KEY,
      deckId TEXT NOT NULL,
      deckName TEXT NOT NULL,
      startedAt INTEGER NOT NULL,
      completedAt INTEGER NOT NULL,
      totalQuestions INTEGER NOT NULL,
      answeredQuestions INTEGER NOT NULL,
      skippedQuestions INTEGER NOT NULL,
      averageScore REAL NOT NULL,
      perfectAnswers INTEGER NOT NULL,
      resultsJson TEXT NOT NULL DEFAULT '[]',
      FOREIGN KEY (deckId) REFERENCES decks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_stats (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      totalQuestionsAnswered INTEGER DEFAULT 0,
      totalStudyTimeMinutes REAL DEFAULT 0,
      overallAccuracy REAL DEFAULT 0,
      currentStreak INTEGER DEFAULT 0,
      longestStreak INTEGER DEFAULT 0,
      xpPoints INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      lastStudyDate TEXT
    );

    INSERT OR IGNORE INTO user_stats (id) VALUES (1);

    CREATE INDEX IF NOT EXISTS idx_questions_deckId ON questions(deckId);
    CREATE INDEX IF NOT EXISTS idx_questions_nextReview ON questions(nextReviewDate);
    CREATE INDEX IF NOT EXISTS idx_session_history_deckId ON session_history(deckId);
  `);
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}
