// Web platform: use in-memory + localStorage storage
// This file is automatically used by Metro/Webpack when Platform.OS === 'web'
export {
  getAllDecks,
  getDeck,
  createDeck,
  updateDeck,
  deleteDeck,
  getDecksWithDueQuestions,
  getQuestionsByDeck,
  getQuestion,
  getDueQuestions,
  createQuestion,
  updateQuestion,
  updateQuestionAfterReview,
  deleteQuestion,
  getUserStats,
  updateStatsAfterSession,
  saveSessionResult,
  getRecentSessions,
} from './webStorage';
