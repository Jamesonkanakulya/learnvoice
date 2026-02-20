/**
 * Achievements system - tracks user milestones and awards badges.
 */
import { Platform } from 'react-native';
import { Achievement, UserStats, SessionResult } from '../../types';

// In-memory cache for native (localStorage not available)
let nativeCache: Record<string, number> = {};

export const ACHIEVEMENTS: Achievement[] = [
  // Getting Started
  { id: 'first_session', name: 'First Steps', description: 'Complete your first study session', icon: 'school', xpReward: 50, unlockedAt: null },
  { id: 'first_perfect', name: 'Perfectionist', description: 'Get a perfect score on a question', icon: 'star', xpReward: 30, unlockedAt: null },
  { id: 'first_deck', name: 'Deck Builder', description: 'Create your first deck', icon: 'library-add', xpReward: 20, unlockedAt: null },

  // Study Milestones
  { id: 'questions_10', name: 'Getting Warmed Up', description: 'Answer 10 questions', icon: 'fitness-center', xpReward: 30, unlockedAt: null },
  { id: 'questions_50', name: 'Knowledge Seeker', description: 'Answer 50 questions', icon: 'explore', xpReward: 75, unlockedAt: null },
  { id: 'questions_100', name: 'Century Club', description: 'Answer 100 questions', icon: 'military-tech', xpReward: 150, unlockedAt: null },
  { id: 'questions_500', name: 'Scholar', description: 'Answer 500 questions', icon: 'workspace-premium', xpReward: 300, unlockedAt: null },

  // Streak Achievements
  { id: 'streak_3', name: 'On a Roll', description: 'Maintain a 3-day streak', icon: 'local-fire-department', xpReward: 40, unlockedAt: null },
  { id: 'streak_7', name: 'Week Warrior', description: 'Maintain a 7-day streak', icon: 'whatshot', xpReward: 100, unlockedAt: null },
  { id: 'streak_30', name: 'Monthly Master', description: 'Maintain a 30-day streak', icon: 'diamond', xpReward: 500, unlockedAt: null },

  // Accuracy Achievements
  { id: 'accuracy_80', name: 'Sharp Mind', description: 'Achieve 80% overall accuracy', icon: 'psychology', xpReward: 60, unlockedAt: null },
  { id: 'accuracy_90', name: 'Brilliant', description: 'Achieve 90% overall accuracy', icon: 'lightbulb', xpReward: 120, unlockedAt: null },

  // Session Achievements
  { id: 'perfect_session', name: 'Flawless Victory', description: 'Get 100% in a complete session', icon: 'emoji-events', xpReward: 100, unlockedAt: null },
  { id: 'speed_demon', name: 'Speed Demon', description: 'Complete a 10+ question session in under 5 minutes', icon: 'speed', xpReward: 80, unlockedAt: null },

  // Level Achievements
  { id: 'level_5', name: 'Rising Star', description: 'Reach Level 5', icon: 'trending-up', xpReward: 75, unlockedAt: null },
  { id: 'level_10', name: 'Expert', description: 'Reach Level 10', icon: 'verified', xpReward: 200, unlockedAt: null },

  // Study Time
  { id: 'study_60', name: 'Dedicated Learner', description: 'Study for a total of 60 minutes', icon: 'timer', xpReward: 50, unlockedAt: null },
  { id: 'study_300', name: 'Time Investor', description: 'Study for a total of 5 hours', icon: 'hourglass-full', xpReward: 150, unlockedAt: null },
];

const STORAGE_KEY = 'learnvoice_achievements';

function loadUnlocked(): Record<string, number> {
  if (Platform.OS !== 'web') return nativeCache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveUnlocked(unlocked: Record<string, number>): void {
  if (Platform.OS !== 'web') {
    nativeCache = { ...unlocked };
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unlocked));
  } catch {}
}

export function getAchievements(): Achievement[] {
  const unlocked = loadUnlocked();
  return ACHIEVEMENTS.map((a) => ({
    ...a,
    unlockedAt: unlocked[a.id] || null,
  }));
}

export function getUnlockedCount(): number {
  const unlocked = loadUnlocked();
  return Object.keys(unlocked).length;
}

export function checkAchievements(
  stats: UserStats,
  session?: SessionResult,
  deckCount?: number
): Achievement[] {
  const unlocked = loadUnlocked();
  const newlyUnlocked: Achievement[] = [];

  const check = (id: string, condition: boolean) => {
    if (!unlocked[id] && condition) {
      unlocked[id] = Date.now();
      const achievement = ACHIEVEMENTS.find((a) => a.id === id);
      if (achievement) {
        newlyUnlocked.push({ ...achievement, unlockedAt: unlocked[id] });
      }
    }
  };

  // Study milestones
  check('questions_10', stats.totalQuestionsAnswered >= 10);
  check('questions_50', stats.totalQuestionsAnswered >= 50);
  check('questions_100', stats.totalQuestionsAnswered >= 100);
  check('questions_500', stats.totalQuestionsAnswered >= 500);

  // Streak
  check('streak_3', stats.currentStreak >= 3 || stats.longestStreak >= 3);
  check('streak_7', stats.currentStreak >= 7 || stats.longestStreak >= 7);
  check('streak_30', stats.currentStreak >= 30 || stats.longestStreak >= 30);

  // Accuracy
  check('accuracy_80', stats.overallAccuracy >= 80 && stats.totalQuestionsAnswered >= 10);
  check('accuracy_90', stats.overallAccuracy >= 90 && stats.totalQuestionsAnswered >= 10);

  // Level
  check('level_5', stats.level >= 5);
  check('level_10', stats.level >= 10);

  // Study time
  check('study_60', stats.totalStudyTimeMinutes >= 60);
  check('study_300', stats.totalStudyTimeMinutes >= 300);

  // Session-specific
  if (session) {
    check('first_session', true);
    check('first_perfect', session.perfectAnswers > 0);
    check('perfect_session', session.averageScore === 100 && session.answeredQuestions > 0);

    const sessionDuration = (session.completedAt - session.startedAt) / 60000;
    check('speed_demon', session.answeredQuestions >= 10 && sessionDuration < 5);
  }

  // Deck creation
  if (deckCount !== undefined) {
    check('first_deck', deckCount >= 1);
  }

  if (newlyUnlocked.length > 0) {
    saveUnlocked(unlocked);
  }

  return newlyUnlocked;
}
