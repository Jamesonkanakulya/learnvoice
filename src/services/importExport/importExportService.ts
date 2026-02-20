/**
 * Import/Export service for decks and questions.
 * Supports JSON format for full fidelity and CSV for simple import.
 */
import { Deck, Question } from '../../types';
import { getAllDecks, getQuestionsByDeck, createDeck, createQuestion } from '../data';

export interface ExportedDeck {
  name: string;
  description: string;
  color: string;
  icon: string;
  questions: {
    question: string;
    expectedAnswers: string[];
    keywords?: string[];
    difficulty: 'easy' | 'medium' | 'hard';
    hints: string[];
    explanation: string;
  }[];
}

export interface ExportData {
  version: 1;
  exportedAt: number;
  appName: 'LearnVoice';
  decks: ExportedDeck[];
}

export async function exportAllDecks(): Promise<string> {
  const decks = await getAllDecks();
  const exportDecks: ExportedDeck[] = [];

  for (const deck of decks) {
    const questions = await getQuestionsByDeck(deck.id);
    exportDecks.push({
      name: deck.name,
      description: deck.description,
      color: deck.color,
      icon: deck.icon,
      questions: questions.map((q) => ({
        question: q.question,
        expectedAnswers: q.expectedAnswers,
        keywords: q.keywords,
        difficulty: q.difficulty,
        hints: q.hints,
        explanation: q.explanation,
      })),
    });
  }

  const exportData: ExportData = {
    version: 1,
    exportedAt: Date.now(),
    appName: 'LearnVoice',
    decks: exportDecks,
  };

  return JSON.stringify(exportData, null, 2);
}

export async function exportSingleDeck(deckId: string): Promise<string> {
  const decks = await getAllDecks();
  const deck = decks.find((d) => d.id === deckId);
  if (!deck) throw new Error('Deck not found');

  const questions = await getQuestionsByDeck(deckId);
  const exportData: ExportData = {
    version: 1,
    exportedAt: Date.now(),
    appName: 'LearnVoice',
    decks: [{
      name: deck.name,
      description: deck.description,
      color: deck.color,
      icon: deck.icon,
      questions: questions.map((q) => ({
        question: q.question,
        expectedAnswers: q.expectedAnswers,
        keywords: q.keywords,
        difficulty: q.difficulty,
        hints: q.hints,
        explanation: q.explanation,
      })),
    }],
  };

  return JSON.stringify(exportData, null, 2);
}

export async function importFromJSON(jsonString: string): Promise<{ decksImported: number; questionsImported: number }> {
  const data: ExportData = JSON.parse(jsonString);

  if (data.appName !== 'LearnVoice' || data.version !== 1) {
    throw new Error('Invalid file format. Please use a LearnVoice export file.');
  }

  let totalQuestions = 0;

  for (const deckData of data.decks) {
    const deck = await createDeck({
      name: deckData.name,
      description: deckData.description,
      color: deckData.color,
      icon: deckData.icon,
    });

    for (const q of deckData.questions) {
      await createQuestion({
        deckId: deck.id,
        question: q.question,
        expectedAnswers: q.expectedAnswers,
        keywords: q.keywords,
        difficulty: q.difficulty,
        hints: q.hints,
        explanation: q.explanation,
      });
      totalQuestions++;
    }
  }

  return { decksImported: data.decks.length, questionsImported: totalQuestions };
}

export async function importFromCSV(csvString: string, deckName: string): Promise<{ questionsImported: number }> {
  const lines = csvString.trim().split('\n');
  if (lines.length < 2) throw new Error('CSV must have at least a header row and one data row.');

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
  const qIndex = headers.findIndex((h) => h === 'question' || h === 'q');
  const aIndex = headers.findIndex((h) => h === 'answer' || h === 'a' || h === 'expected_answer');
  const dIndex = headers.findIndex((h) => h === 'difficulty');
  const eIndex = headers.findIndex((h) => h === 'explanation');

  if (qIndex === -1 || aIndex === -1) {
    throw new Error('CSV must have "question" and "answer" columns.');
  }

  const deck = await createDeck({ name: deckName });
  let count = 0;

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const question = values[qIndex]?.trim();
    const answer = values[aIndex]?.trim();
    if (!question || !answer) continue;

    const difficulty = dIndex >= 0 ? (values[dIndex]?.trim() as 'easy' | 'medium' | 'hard') || 'medium' : 'medium';
    const explanation = eIndex >= 0 ? values[eIndex]?.trim() || '' : '';

    await createQuestion({
      deckId: deck.id,
      question,
      expectedAnswers: [answer],
      difficulty,
      explanation,
    });
    count++;
  }

  return { questionsImported: count };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export function downloadFile(content: string, filename: string): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function triggerFileUpload(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('File upload not supported'));
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.csv';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    };
    input.click();
  });
}
