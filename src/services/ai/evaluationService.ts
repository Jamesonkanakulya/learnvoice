import { Question, EvaluationResult, Feedback } from '../../types';
import { normalizeText, analyzeKeywords, wordOverlapSimilarity, levenshteinDistance } from '../../utils/textProcessing';

/**
 * Evaluate a user's answer against the expected answer.
 * Uses multi-strategy scoring: exact match, keyword analysis,
 * word overlap similarity, and semantic proximity.
 */
export function evaluateAnswer(userAnswer: string, question: Question): EvaluationResult {
  const normalized = normalizeText(userAnswer);
  const expectedAnswer = question.expectedAnswers[0] || '';

  // 1. Check exact match against any expected answer
  for (const expected of question.expectedAnswers) {
    if (normalizeText(expected) === normalized) {
      return {
        score: 100,
        keywordScore: 100,
        keywordDetails: question.keywords.map((k, i) => ({
          keyword: k,
          found: true,
          weight: question.keywordWeights[i] || 1,
        })),
        feedback: generateFeedback(100, []),
        userAnswer: normalized,
        expectedAnswer,
      };
    }
  }

  // 2. Keyword analysis
  const keywordResult = analyzeKeywords(
    normalized,
    question.keywords,
    question.keywordWeights
  );

  // 3. Word overlap similarity against all expected answers
  let bestOverlap = 0;
  for (const alt of question.expectedAnswers) {
    const overlap = wordOverlapSimilarity(normalized, alt);
    if (overlap > bestOverlap) bestOverlap = overlap;
  }

  // 4. String distance score (for short answers / close matches)
  let bestDistanceScore = 0;
  for (const alt of question.expectedAnswers) {
    const normAlt = normalizeText(alt);
    const dist = levenshteinDistance(normalized, normAlt);
    const maxLen = Math.max(normalized.length, normAlt.length, 1);
    const similarity = Math.max(0, 1 - dist / maxLen) * 100;
    if (similarity > bestDistanceScore) bestDistanceScore = similarity;
  }

  // 5. Phrase matching - bonus for matching multi-word phrases
  let phraseBonus = 0;
  const normalizedLower = normalized.toLowerCase();
  for (const expected of question.expectedAnswers) {
    const expectedLower = normalizeText(expected).toLowerCase();
    const phrases = extractPhrases(expectedLower, 2);
    let matchedPhrases = 0;
    for (const phrase of phrases) {
      if (normalizedLower.includes(phrase)) matchedPhrases++;
    }
    if (phrases.length > 0) {
      phraseBonus = Math.max(phraseBonus, (matchedPhrases / phrases.length) * 100);
    }
  }

  // 6. Combined score with weighted strategies
  // Keyword: 45%, Overlap: 25%, Distance: 15%, Phrase: 15%
  const combinedScore = Math.round(
    keywordResult.score * 0.45 +
    bestOverlap * 0.25 +
    bestDistanceScore * 0.15 +
    phraseBonus * 0.15
  );
  const finalScore = Math.min(100, Math.max(0, combinedScore));

  // 7. Generate feedback
  const missingKeywords = keywordResult.details
    .filter((d) => !d.found)
    .map((d) => d.keyword);

  const feedback = generateFeedback(finalScore, missingKeywords);

  return {
    score: finalScore,
    keywordScore: Math.round(keywordResult.score),
    keywordDetails: keywordResult.details,
    feedback,
    userAnswer: normalized,
    expectedAnswer,
  };
}

function extractPhrases(text: string, minWords: number): string[] {
  const words = text.split(/\s+/).filter((w) => w.length > 2);
  const phrases: string[] = [];
  for (let i = 0; i <= words.length - minWords; i++) {
    phrases.push(words.slice(i, i + minWords).join(' '));
  }
  return phrases;
}

function generateFeedback(score: number, missingKeywords: string[]): Feedback {
  let category: Feedback['category'];
  let message: string;

  if (score === 100) {
    category = 'perfect';
    const messages = [
      'Perfect! You nailed it!',
      'Absolutely correct! Full marks!',
      'Excellent! You\'ve mastered this one!',
    ];
    message = messages[Math.floor(Math.random() * messages.length)];
  } else if (score >= 90) {
    category = 'excellent';
    const messages = [
      `Excellent! ${score}% - Almost perfect!`,
      `Great job! ${score}% - You really know this!`,
      `Impressive! ${score}% - Keep it up!`,
    ];
    message = messages[Math.floor(Math.random() * messages.length)];
  } else if (score >= 70) {
    category = 'good';
    const messages = [
      `Good effort! ${score}%`,
      `Nice! ${score}% - You're getting there!`,
      `${score}% - Good, minor details missed.`,
    ];
    message = messages[Math.floor(Math.random() * messages.length)];
  } else if (score >= 50) {
    category = 'needsWork';
    const messages = [
      `${score}% - Let's review this one.`,
      `${score}% - Good start, needs more detail.`,
      `${score}% - Would you like to try again?`,
    ];
    message = messages[Math.floor(Math.random() * messages.length)];
  } else {
    category = 'incorrect';
    const messages = [
      `${score}% - Don't give up!`,
      `${score}% - Let's look at the correct answer.`,
      `${score}% - Every attempt helps you learn!`,
    ];
    message = messages[Math.floor(Math.random() * messages.length)];
  }

  let details = '';
  if (missingKeywords.length > 0 && score < 100) {
    if (missingKeywords.length <= 3) {
      details = `Key terms to include: ${missingKeywords.join(', ')}`;
    } else {
      details = `Missing ${missingKeywords.length} key terms including: ${missingKeywords.slice(0, 3).join(', ')}`;
    }
  }

  return { message, details, category };
}

/**
 * SM-2 spaced repetition algorithm.
 * quality: 0-5 scale mapped from score (0-100).
 */
export function calculateNextReview(
  score: number,
  currentEaseFactor: number,
  currentInterval: number,
  currentRepetitions: number
): {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: number;
} {
  const quality = Math.round((score / 100) * 5);

  let easeFactor = currentEaseFactor;
  let interval = currentInterval;
  let repetitions = currentRepetitions;

  if (quality >= 3) {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  } else {
    repetitions = 0;
    interval = 1;
  }

  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  easeFactor = Math.max(1.3, easeFactor);

  const nextReviewDate = Date.now() + interval * 24 * 60 * 60 * 1000;

  return { easeFactor, interval, repetitions, nextReviewDate };
}
