import type { SQLiteDatabase } from 'expo-sqlite';

// SQL para criação de tabelas (idempotente)
const createTablesSQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  order_index INTEGER,
  banca TEXT,
  question_type TEXT
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  order_index INTEGER,
  folder_id INTEGER,
  FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL ON UPDATE CASCADE
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

CREATE TABLE IF NOT EXISTS study_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folder_id INTEGER NOT NULL,
  goal TEXT NOT NULL,
  exam_date DATETIME NOT NULL,
  daily_minutes INTEGER NOT NULL,
  max_topics INTEGER DEFAULT 1, -- Novo campo
  study_days TEXT NOT NULL, -- JSON string of day numbers (0-6)
  created_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS study_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INTEGER NOT NULL,
  category_id INTEGER,
  date DATETIME NOT NULL,
  completed INTEGER DEFAULT 0,
  FOREIGN KEY (plan_id) REFERENCES study_plans(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS study_suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  watched INTEGER DEFAULT 0,
  type TEXT DEFAULT 'youtube',
  created_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE ON UPDATE CASCADE
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
  
  // Migração para ordenação manual das categorias e vínculo com pasta
  const categoryCols = await database.getAllAsync<{ name: string }>("PRAGMA table_info('categories')");
  const categoryColNames = new Set(categoryCols.map((c) => c.name));
  if (!categoryColNames.has('order_index')) {
    await database.execAsync("ALTER TABLE categories ADD COLUMN order_index INTEGER");
    // Inicializa para manter a ordem atual (alfabética): usa id
    await database.execAsync("UPDATE categories SET order_index = id WHERE order_index IS NULL");
  }
  if (!categoryColNames.has('folder_id')) {
    await database.execAsync("ALTER TABLE categories ADD COLUMN folder_id INTEGER");
    // Não é possível adicionar FK com ALTER no SQLite; nova instalação já cria com FK
  }
  
  // Migração para ordenação manual das estatísticas (answers)
  const answerCols = await database.getAllAsync<{ name: string }>("PRAGMA table_info('answers')");
  const answerColNames = new Set(answerCols.map((c) => c.name));
  if (!answerColNames.has('order_index')) {
    await database.execAsync("ALTER TABLE answers ADD COLUMN order_index INTEGER");
    // Inicializa para manter a ordem atual: usa id
    await database.execAsync("UPDATE answers SET order_index = id WHERE order_index IS NULL");
  }
  
  // Garante colunas em folders (para instalações que já tinham tabela sem colunas novas)
  const folderCols = await database.getAllAsync<{ name: string }>("PRAGMA table_info('folders')");
  const folderColNames = new Set(folderCols.map((c) => c.name));
  if (folderCols.length > 0) {
    if (!folderColNames.has('banca')) {
      await database.execAsync("ALTER TABLE folders ADD COLUMN banca TEXT");
    }
    if (!folderColNames.has('question_type')) {
      await database.execAsync("ALTER TABLE folders ADD COLUMN question_type TEXT");
    }
    if (!folderColNames.has('order_index')) {
      await database.execAsync("ALTER TABLE folders ADD COLUMN order_index INTEGER");
      await database.execAsync("UPDATE folders SET order_index = id WHERE order_index IS NULL");
    }
  }

  // Migração para max_topics em study_plans
  const planCols = await database.getAllAsync<{ name: string }>("PRAGMA table_info('study_plans')");
  const planColNames = new Set(planCols.map((c) => c.name));
  if (planCols.length > 0 && !planColNames.has('max_topics')) {
    await database.execAsync("ALTER TABLE study_plans ADD COLUMN max_topics INTEGER DEFAULT 1");
  }
}

export type Category = {
  id: number;
  name: string;
  order_index?: number;
  folder_id?: number | null;
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

export type Folder = {
  id: number;
  name: string;
  order_index?: number;
  banca?: string | null;
  question_type?: 'MC' | 'TF' | string | null;
};

export type StudyPlan = {
  id: number;
  folder_id: number;
  goal: string;
  exam_date: string;
  daily_minutes: number;
  max_topics: number; // Novo campo
  study_days: string; // JSON string
  created_at: string | null;
};

export type StudyEvent = {
  id: number;
  plan_id: number;
  category_id: number | null;
  date: string;
  completed: number; // 0 or 1
  // joined fields
  category_name?: string;
  folder_color?: string; // For calendar display distinction if we add it later
};

export type StudySuggestion = {
  id: number;
  category_id: number;
  title: string;
  url: string;
  watched: number; // 0 or 1
  type: string;
  created_at: string | null;
};
