import type { SQLiteDatabase } from 'expo-sqlite';

// SQL para criação de tabelas (idempotente)
const createTablesSQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  order_index INTEGER
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
  created_at DATETIME DEFAULT (datetime('now')),
  order_index INTEGER
);

CREATE TABLE IF NOT EXISTS essays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  essay_text TEXT,
  image_uri TEXT,
  analysis TEXT NOT NULL,
  score REAL,
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
  // Migração para ordenação manual dos cards
  if (!colNames.has('order_index')) {
    await database.execAsync("ALTER TABLE cards ADD COLUMN order_index INTEGER");
    // Inicializa para manter a ordem atual (mais novo primeiro): usa -id
    await database.execAsync("UPDATE cards SET order_index = -id WHERE order_index IS NULL");
  }
  
  // Migração para ordenação manual das categorias
  const categoryCols = await database.getAllAsync<{ name: string }>("PRAGMA table_info('categories')");
  const categoryColNames = new Set(categoryCols.map((c) => c.name));
  if (!categoryColNames.has('order_index')) {
    await database.execAsync("ALTER TABLE categories ADD COLUMN order_index INTEGER");
    // Inicializa para manter a ordem atual (alfabética): usa id
    await database.execAsync("UPDATE categories SET order_index = id WHERE order_index IS NULL");
  }
  
  // Migração para ordenação manual das estatísticas (answers)
  const answerCols = await database.getAllAsync<{ name: string }>("PRAGMA table_info('answers')");
  const answerColNames = new Set(answerCols.map((c) => c.name));
  if (!answerColNames.has('order_index')) {
    await database.execAsync("ALTER TABLE answers ADD COLUMN order_index INTEGER");
    // Inicializa para manter a ordem atual: usa id
    await database.execAsync("UPDATE answers SET order_index = id WHERE order_index IS NULL");
  }
}

export type Category = {
  id: number;
  name: string;
  order_index?: number;
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

export type Essay = {
  id: number;
  title: string | null;
  essay_text: string | null;
  image_uri: string | null;
  analysis: string;
  score: number | null;
  created_at: string | null;
};


