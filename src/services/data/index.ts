// Native platform: use SQLite storage
// On web, Metro automatically resolves index.web.ts instead of this file
export {
  getAllDecks,
  getDeck,
  createDeck,
  updateDeck,
  deleteDeck,
  getDecksWithDueQuestions,
} from './deckService';

export {
  getQuestionsByDeck,
  getQuestion,
  getDueQuestions,
  createQuestion,
  updateQuestion,
  updateQuestionAfterReview,
  deleteQuestion,
} from './questionService';

export {
  getUserStats,
  updateStatsAfterSession,
  saveSessionResult,
  getRecentSessions,
} from './statsService';
