import type { SQLiteDatabase } from 'expo-sqlite';

// SQL para criação de tabelas (idempotente)
const createTablesSQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER,
  category_name TEXT,
  title TEXT NOT NULL,
  selected TEXT,
  correct TEXT,
  is_correct INTEGER NOT NULL,
  created_at DATETIME DEFAULT (datetime('now'))
);
`;

export async function migrateDb(database: SQLiteDatabase): Promise<void> {
  // Executa criação de tabelas de forma transacional
  await database.execAsync(createTablesSQL);

  // Migração para MCQ: adiciona colunas se não existirem
  const cols = await database.getAllAsync<{ name: string }>("PRAGMA table_info('cards')");
  const colNames = new Set(cols.map((c) => c.name));
  if (!colNames.has('options_json')) {
    await database.execAsync("ALTER TABLE cards ADD COLUMN options_json TEXT");
  }
  if (!colNames.has('correct')) {
    await database.execAsync("ALTER TABLE cards ADD COLUMN correct TEXT");
  }
}

export type Category = {
  id: number;
  name: string;
};

export type Card = {
  id: number;
  category_id: number;
  title: string;
  description: string | null;
  created_at: string | null;
  options_json?: string | null;
  correct?: string | null;
};


