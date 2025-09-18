import { useSQLiteContext } from 'expo-sqlite';
import type { Card, Category } from '@/lib/db';

export function useCategoryRepository() {
  const db = useSQLiteContext();

  async function listCategories(): Promise<Category[]> {
    const result = await db.getAllAsync<Category>('SELECT id, name FROM categories ORDER BY name ASC');
    return result;
  }

  async function createCategory(name: string): Promise<number> {
    const result = await db.runAsync('INSERT INTO categories (name) VALUES (?)', name);
    return result.lastInsertRowId as number;
  }

  async function deleteCategory(id: number): Promise<void> {
    await db.runAsync('DELETE FROM categories WHERE id = ?', id);
  }

  async function renameCategory(id: number, name: string): Promise<void> {
    await db.runAsync('UPDATE categories SET name = ? WHERE id = ?', name, id);
  }

  return { listCategories, createCategory, deleteCategory, renameCategory };
}

export function useCardRepository() {
  const db = useSQLiteContext();

  async function listCardsByCategory(categoryId: number): Promise<Card[]> {
    const result = await db.getAllAsync<Card>(
      'SELECT id, category_id, title, description, created_at, options_json, correct FROM cards WHERE category_id = ? ORDER BY id DESC',
      categoryId
    );
    return result;
  }

  async function createCard(input: { categoryId: number; title: string; description?: string | null; options?: Record<string, string> | null; correct?: string | null }): Promise<number> {
    const { categoryId, title, description, options, correct } = input;
    const optionsJson = options ? JSON.stringify(options) : null;
    const result = await db.runAsync(
      'INSERT INTO cards (category_id, title, description, options_json, correct) VALUES (?, ?, ?, ?, ?)',
      categoryId,
      title,
      description ?? null,
      optionsJson,
      correct ?? null
    );
    return result.lastInsertRowId as number;
  }

  async function updateCard(id: number, updates: { title?: string; description?: string | null; options?: Record<string, string> | null; correct?: string | null }): Promise<void> {
    const fields: string[] = [];
    const values: (string | null | number)[] = [];
    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description ?? null);
    }
    if (updates.options !== undefined) {
      fields.push('options_json = ?');
      values.push(updates.options ? JSON.stringify(updates.options) : null);
    }
    if (updates.correct !== undefined) {
      fields.push('correct = ?');
      values.push(updates.correct ?? null);
    }
    if (fields.length === 0) return;
    values.push(id);
    const sql = `UPDATE cards SET ${fields.join(', ')} WHERE id = ?`;
    await db.runAsync(sql, ...values);
  }

  async function deleteCard(id: number): Promise<void> {
    await db.runAsync('DELETE FROM cards WHERE id = ?', id);
  }

  return { listCardsByCategory, createCard, updateCard, deleteCard };
}

export function useAnswerRepository() {
  const db = useSQLiteContext();

  async function saveAnswer(input: { categoryId?: number | null; categoryName?: string | null; title: string; selected: string | null; correct: string | null; isCorrect: boolean }): Promise<number> {
    const result = await db.runAsync(
      'INSERT INTO answers (category_id, category_name, title, selected, correct, is_correct) VALUES (?, ?, ?, ?, ?, ?)',
      input.categoryId ?? null,
      input.categoryName ?? null,
      input.title,
      input.selected,
      input.correct,
      input.isCorrect ? 1 : 0
    );
    return result.lastInsertRowId as number;
  }

  async function getStatsByCategory(): Promise<Array<{ category_name: string | null; total: number; acertos: number; erros: number }>> {
    const rows = await db.getAllAsync<any>(
      `SELECT category_name, COUNT(*) as total, SUM(is_correct) as acertos, COUNT(*) - SUM(is_correct) as erros
       FROM answers
       GROUP BY category_name
       ORDER BY total DESC`
    );
    return rows;
  }

  return { saveAnswer, getStatsByCategory };
}


