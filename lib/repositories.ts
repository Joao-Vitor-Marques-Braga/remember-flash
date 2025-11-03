import { useSQLiteContext } from 'expo-sqlite';
import type { Card, Category, Essay, Folder } from '@/lib/db';

export function useFolderRepository() {
  const db = useSQLiteContext();

  async function listFolders(): Promise<Folder[]> {
    const result = await db.getAllAsync<Folder>('SELECT id, name, order_index, banca, question_type FROM folders ORDER BY order_index ASC, id ASC');
    return result;
  }

  async function createFolder(name: string): Promise<number> {
    const result = await db.runAsync('INSERT INTO folders (name, order_index) VALUES (?, ?)', name, Date.now());
    return result.lastInsertRowId as number;
  }

  async function deleteFolder(id: number): Promise<void> {
    await db.runAsync('DELETE FROM folders WHERE id = ?', id);
  }

  async function renameFolder(id: number, name: string): Promise<void> {
    await db.runAsync('UPDATE folders SET name = ? WHERE id = ?', name, id);
  }

  async function updateFolderSettings(id: number, updates: { banca?: string | null; question_type?: 'MC' | 'TF' | string | null }): Promise<void> {
    const fields: string[] = [];
    const values: (string | null | number)[] = [];
    if (updates.banca !== undefined) {
      fields.push('banca = ?');
      values.push(updates.banca);
    }
    if (updates.question_type !== undefined) {
      fields.push('question_type = ?');
      values.push(updates.question_type);
    }
    if (fields.length === 0) return;
    values.push(id);
    const sql = `UPDATE folders SET ${fields.join(', ')} WHERE id = ?`;
    await db.runAsync(sql, ...values);
  }

  async function reorderFolders(orderedIds: number[]): Promise<void> {
    let index = 0;
    for (const id of orderedIds) {
      await db.runAsync('UPDATE folders SET order_index = ? WHERE id = ?', index, id);
      index += 1;
    }
  }

  async function getFolder(id: number): Promise<Folder | null> {
    const res = await db.getFirstAsync<Folder>('SELECT id, name, order_index, banca, question_type FROM folders WHERE id = ?', id);
    return res || null;
  }

  async function getFolderByCategoryId(categoryId: number): Promise<Folder | null> {
    const res = await db.getFirstAsync<Folder>(
      'SELECT f.id, f.name, f.order_index, f.banca, f.question_type FROM folders f JOIN categories c ON c.folder_id = f.id WHERE c.id = ?',
      categoryId
    );
    return res || null;
  }

  return { listFolders, createFolder, deleteFolder, renameFolder, updateFolderSettings, reorderFolders, getFolder, getFolderByCategoryId };
}

export function useCategoryRepository() {
  const db = useSQLiteContext();

  async function listCategories(folderId?: number | null): Promise<Category[]> {
    if (folderId !== undefined) {
      const result = await db.getAllAsync<Category>(
        'SELECT id, name, order_index, folder_id FROM categories WHERE folder_id IS ? ORDER BY order_index ASC, id ASC',
        folderId === null ? null : folderId
      );
      return result;
    }
    const result = await db.getAllAsync<Category>('SELECT id, name, order_index, folder_id FROM categories ORDER BY order_index ASC, id ASC');
    return result;
  }

  async function createCategory(name: string, folderId?: number | null): Promise<number> {
    const result = await db.runAsync(
      'INSERT INTO categories (name, order_index, folder_id) VALUES (?, ?, ?)',
      name,
      Date.now(),
      folderId ?? null
    );
    return result.lastInsertRowId as number;
  }

  async function deleteCategory(id: number): Promise<void> {
    await db.runAsync('DELETE FROM categories WHERE id = ?', id);
  }

  async function renameCategory(id: number, name: string): Promise<void> {
    await db.runAsync('UPDATE categories SET name = ? WHERE id = ?', name, id);
  }

  async function reorderCategories(orderedIds: number[]): Promise<void> {
    // usa transação simples sequencial para atualizar order_index conforme posição
    // menor order_index = mais ao topo
    let index = 0;
    for (const id of orderedIds) {
      await db.runAsync('UPDATE categories SET order_index = ? WHERE id = ?', index, id);
      index += 1;
    }
  }

  async function moveCategoryToFolder(categoryId: number, folderId: number | null): Promise<void> {
    await db.runAsync('UPDATE categories SET folder_id = ? WHERE id = ?', folderId, categoryId);
  }

  return { listCategories, createCategory, deleteCategory, renameCategory, reorderCategories, moveCategoryToFolder };
}

export function useCardRepository() {
  const db = useSQLiteContext();

  async function listCardsByCategory(categoryId: number): Promise<Card[]> {
    const result = await db.getAllAsync<Card>(
      'SELECT id, category_id, title, description, created_at, options_json, correct, order_index FROM cards WHERE category_id = ? ORDER BY order_index ASC, id DESC',
      categoryId
    );
    return result;
  }

  async function createCard(input: { categoryId: number; title: string; description?: string | null; options?: Record<string, string> | null; correct?: string | null }): Promise<number> {
    const { categoryId, title, description, options, correct } = input;
    const optionsJson = options ? JSON.stringify(options) : null;
    const result = await db.runAsync(
      'INSERT INTO cards (category_id, title, description, options_json, correct, order_index) VALUES (?, ?, ?, ?, ?, ?)',
      categoryId,
      title,
      description ?? null,
      optionsJson,
      correct ?? null,
      Date.now()
    );
    return result.lastInsertRowId as number;
  }

  async function updateCard(id: number, updates: { title?: string; description?: string | null; options?: Record<string, string> | null; correct?: string | null; order_index?: number }): Promise<void> {
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
    if (updates.order_index !== undefined) {
      fields.push('order_index = ?');
      values.push(updates.order_index);
    }
    if (fields.length === 0) return;
    values.push(id);
    const sql = `UPDATE cards SET ${fields.join(', ')} WHERE id = ?`;
    await db.runAsync(sql, ...values);
  }

  async function deleteCard(id: number): Promise<void> {
    await db.runAsync('DELETE FROM cards WHERE id = ?', id);
  }

  async function reorderCards(categoryId: number, orderedIds: number[]): Promise<void> {
    // usa transação simples sequencial para atualizar order_index conforme posição
    // menor order_index = mais ao topo
    let index = 0;
    for (const id of orderedIds) {
      await db.runAsync('UPDATE cards SET order_index = ? WHERE id = ? AND category_id = ?', index, id, categoryId);
      index += 1;
    }
  }

  return { listCardsByCategory, createCard, updateCard, deleteCard, reorderCards };
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

  async function getStatsByCategory(): Promise<Array<{ category_name: string | null; total: number; acertos: number; erros: number; order_index: number }>> {
    const rows = await db.getAllAsync<any>(
      `SELECT category_name, COUNT(*) as total, SUM(is_correct) as acertos, COUNT(*) - SUM(is_correct) as erros, MIN(order_index) as order_index
       FROM answers
       GROUP BY category_name
       ORDER BY order_index ASC, total DESC`
    );
    return rows;
  }

  async function reorderStats(orderedCategoryNames: (string | null)[]): Promise<void> {
    // Atualiza order_index para cada categoria baseado na nova ordem
    let index = 0;
    for (const categoryName of orderedCategoryNames) {
      await db.runAsync('UPDATE answers SET order_index = ? WHERE category_name = ?', index, categoryName);
      index += 1;
    }
  }

  return { saveAnswer, getStatsByCategory, reorderStats };
}

export function useEssayRepository() {
  const db = useSQLiteContext();

  async function listEssays(): Promise<Essay[]> {
    const result = await db.getAllAsync<Essay>('SELECT * FROM essays ORDER BY created_at DESC');
    return result;
  }

  async function saveEssay(
    title: string | null,
    essayText: string | null,
    imageUri: string | null,
    analysis: string,
    score: number | null
  ): Promise<number> {
    const result = await db.runAsync(
      'INSERT INTO essays (title, essay_text, image_uri, analysis, score) VALUES (?, ?, ?, ?, ?)',
      title,
      essayText,
      imageUri,
      analysis,
      score
    );
    return result.lastInsertRowId as number;
  }

  async function getEssay(id: number): Promise<Essay | null> {
    const result = await db.getFirstAsync<Essay>('SELECT * FROM essays WHERE id = ?', id);
    return result || null;
  }

  async function deleteEssay(id: number): Promise<void> {
    await db.runAsync('DELETE FROM essays WHERE id = ?', id);
  }

  return { listEssays, saveEssay, getEssay, deleteEssay };
}


