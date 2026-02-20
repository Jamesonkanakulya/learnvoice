/**
 * Normalize text for comparison: lowercase, trim, remove extra spaces and punctuation.
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Levenshtein distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/**
 * Fuzzy match: returns true if the words are similar enough (based on threshold).
 */
export function fuzzyMatch(word: string, target: string, threshold: number = 0.8): boolean {
  const a = word.toLowerCase();
  const b = target.toLowerCase();

  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;

  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return true;

  const distance = levenshteinDistance(a, b);
  const similarity = 1 - distance / maxLen;
  return similarity >= threshold;
}

/**
 * Check if a keyword (or its fuzzy variant) appears in the text.
 */
export function findKeywordInText(text: string, keyword: string, threshold: number = 0.75): boolean {
  const normalizedText = normalizeText(text);
  const normalizedKeyword = normalizeText(keyword);

  // Direct inclusion check
  if (normalizedText.includes(normalizedKeyword)) return true;

  // Word-by-word fuzzy check
  const textWords = normalizedText.split(' ');
  const keywordWords = normalizedKeyword.split(' ');

  // For multi-word keywords, check if all keyword words appear
  if (keywordWords.length > 1) {
    return keywordWords.every((kw) =>
      textWords.some((tw) => fuzzyMatch(tw, kw, threshold))
    );
  }

  // Single word keyword
  return textWords.some((tw) => fuzzyMatch(tw, normalizedKeyword, threshold));
}

/**
 * Calculate the percentage of keywords found in the text.
 */
export function analyzeKeywords(
  text: string,
  keywords: string[],
  weights: number[]
): {
  score: number;
  details: { keyword: string; found: boolean; weight: number }[];
} {
  if (keywords.length === 0) return { score: 100, details: [] };

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let matchedWeight = 0;

  const details = keywords.map((keyword, index) => {
    const weight = weights[index] || 1;
    const found = findKeywordInText(text, keyword);
    if (found) matchedWeight += weight;
    return { keyword, found, weight };
  });

  const score = totalWeight > 0 ? (matchedWeight / totalWeight) * 100 : 0;

  return { score, details };
}

/**
 * Simple string similarity (Jaccard-like) using word overlap.
 */
export function wordOverlapSimilarity(a: string, b: string): number {
  const wordsA = new Set(normalizeText(a).split(' ').filter(Boolean));
  const wordsB = new Set(normalizeText(b).split(' ').filter(Boolean));

  if (wordsA.size === 0 && wordsB.size === 0) return 100;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }

  const union = new Set([...wordsA, ...wordsB]).size;
  return (intersection / union) * 100;
}
