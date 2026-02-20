// Native: initialize SQLite database
import { getDatabase } from './database';

export async function initDatabase(): Promise<void> {
  await getDatabase();
}
