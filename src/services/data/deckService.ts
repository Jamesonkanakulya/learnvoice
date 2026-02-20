import * as Crypto from 'expo-crypto';
import { getDatabase } from './database';
import { Deck } from '../../types';

export async function getAllDecks(): Promise<Deck[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT d.*, COUNT(q.id) as questionCount
     FROM decks d
     LEFT JOIN questions q ON q.deckId = d.id
     GROUP BY d.id
     ORDER BY d.updatedAt DESC`
  );
  return rows.map(mapRowToDeck);
}

export async function getDeck(id: string): Promise<Deck | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>(
    `SELECT d.*, COUNT(q.id) as questionCount
     FROM decks d
     LEFT JOIN questions q ON q.deckId = d.id
     WHERE d.id = ?
     GROUP BY d.id`,
    [id]
  );
  return row ? mapRowToDeck(row) : null;
}

export async function createDeck(data: {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}): Promise<Deck> {
  const db = await getDatabase();
  const id = Crypto.randomUUID();
  const now = Date.now();

  await db.runAsync(
    `INSERT INTO decks (id, name, description, color, icon, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, data.name, data.description || '', data.color || '#6C63FF', data.icon || 'book', now, now]
  );

  return {
    id,
    name: data.name,
    description: data.description || '',
    color: data.color || '#6C63FF',
    icon: data.icon || 'book',
    createdAt: now,
    updatedAt: now,
    questionCount: 0,
  };
}

export async function updateDeck(id: string, data: Partial<Pick<Deck, 'name' | 'description' | 'color' | 'icon'>>): Promise<void> {
  const db = await getDatabase();
  const sets: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) { sets.push('name = ?'); values.push(data.name); }
  if (data.description !== undefined) { sets.push('description = ?'); values.push(data.description); }
  if (data.color !== undefined) { sets.push('color = ?'); values.push(data.color); }
  if (data.icon !== undefined) { sets.push('icon = ?'); values.push(data.icon); }

  sets.push('updatedAt = ?');
  values.push(Date.now());
  values.push(id);

  await db.runAsync(`UPDATE decks SET ${sets.join(', ')} WHERE id = ?`, values);
}

export async function deleteDeck(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM decks WHERE id = ?', [id]);
}

export async function getDecksWithDueQuestions(): Promise<(Deck & { dueCount: number })[]> {
  const db = await getDatabase();
  const now = Date.now();
  const rows = await db.getAllAsync<any>(
    `SELECT d.*, COUNT(q.id) as questionCount,
     SUM(CASE WHEN q.nextReviewDate IS NULL OR q.nextReviewDate <= ? THEN 1 ELSE 0 END) as dueCount
     FROM decks d
     LEFT JOIN questions q ON q.deckId = d.id
     GROUP BY d.id
     HAVING dueCount > 0
     ORDER BY dueCount DESC`,
    [now]
  );
  return rows.map((r: any) => ({ ...mapRowToDeck(r), dueCount: r.dueCount || 0 }));
}

function mapRowToDeck(row: any): Deck {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    color: row.color || '#6C63FF',
    icon: row.icon || 'book',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    questionCount: row.questionCount || 0,
  };
}
