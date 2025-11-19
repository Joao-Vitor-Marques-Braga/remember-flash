import { useSQLiteContext } from 'expo-sqlite';
import type { Card, Category, Essay, Folder, StudyPlan, StudyEvent } from '@/lib/db';
import { eachDayOfInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { useCallback } from 'react';
import { generateStudySchedule } from '@/lib/ai';

export function useFolderRepository() {
  const db = useSQLiteContext();

  const listFolders = useCallback(async (): Promise<Folder[]> => {
    const result = await db.getAllAsync<Folder>('SELECT id, name, order_index, banca, question_type FROM folders ORDER BY order_index ASC, id ASC');
    return result;
  }, [db]);

  const createFolder = useCallback(async (name: string): Promise<number> => {
    const result = await db.runAsync('INSERT INTO folders (name, order_index) VALUES (?, ?)', name, Date.now());
    return result.lastInsertRowId as number;
  }, [db]);

  const deleteFolder = useCallback(async (id: number): Promise<void> => {
    await db.runAsync('DELETE FROM folders WHERE id = ?', id);
  }, [db]);

  const renameFolder = useCallback(async (id: number, name: string): Promise<void> => {
    await db.runAsync('UPDATE folders SET name = ? WHERE id = ?', name, id);
  }, [db]);

  const updateFolderSettings = useCallback(async (id: number, updates: { banca?: string | null; question_type?: 'MC' | 'TF' | string | null }): Promise<void> => {
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
  }, [db]);

  const reorderFolders = useCallback(async (orderedIds: number[]): Promise<void> => {
    let index = 0;
    for (const id of orderedIds) {
      await db.runAsync('UPDATE folders SET order_index = ? WHERE id = ?', index, id);
      index += 1;
    }
  }, [db]);

  const getFolder = useCallback(async (id: number): Promise<Folder | null> => {
    const res = await db.getFirstAsync<Folder>('SELECT id, name, order_index, banca, question_type FROM folders WHERE id = ?', id);
    return res || null;
  }, [db]);

  const getFolderByCategoryId = useCallback(async (categoryId: number): Promise<Folder | null> => {
    const res = await db.getFirstAsync<Folder>(
      'SELECT f.id, f.name, f.order_index, f.banca, f.question_type FROM folders f JOIN categories c ON c.folder_id = f.id WHERE c.id = ?',
      categoryId
    );
    return res || null;
  }, [db]);

  return { listFolders, createFolder, deleteFolder, renameFolder, updateFolderSettings, reorderFolders, getFolder, getFolderByCategoryId };
}

export function useCategoryRepository() {
  const db = useSQLiteContext();

  const listCategories = useCallback(async (folderId?: number | null): Promise<Category[]> => {
    if (folderId !== undefined) {
      const result = await db.getAllAsync<Category>(
        'SELECT id, name, order_index, folder_id FROM categories WHERE folder_id IS ? ORDER BY order_index ASC, id ASC',
        folderId === null ? null : folderId
      );
      return result;
    }
    const result = await db.getAllAsync<Category>('SELECT id, name, order_index, folder_id FROM categories ORDER BY order_index ASC, id ASC');
    return result;
  }, [db]);

  const createCategory = useCallback(async (name: string, folderId?: number | null): Promise<number> => {
    const result = await db.runAsync(
      'INSERT INTO categories (name, order_index, folder_id) VALUES (?, ?, ?)',
      name,
      Date.now(),
      folderId ?? null
    );
    return result.lastInsertRowId as number;
  }, [db]);

  const deleteCategory = useCallback(async (id: number): Promise<void> => {
    await db.runAsync('DELETE FROM categories WHERE id = ?', id);
  }, [db]);

  const renameCategory = useCallback(async (id: number, name: string): Promise<void> => {
    await db.runAsync('UPDATE categories SET name = ? WHERE id = ?', name, id);
  }, [db]);

  const reorderCategories = useCallback(async (orderedIds: number[]): Promise<void> => {
    let index = 0;
    for (const id of orderedIds) {
      await db.runAsync('UPDATE categories SET order_index = ? WHERE id = ?', index, id);
      index += 1;
    }
  }, [db]);

  const moveCategoryToFolder = useCallback(async (categoryId: number, folderId: number | null): Promise<void> => {
    await db.runAsync('UPDATE categories SET folder_id = ? WHERE id = ?', folderId, categoryId);
  }, [db]);

  return { listCategories, createCategory, deleteCategory, renameCategory, reorderCategories, moveCategoryToFolder };
}

export function useCardRepository() {
  const db = useSQLiteContext();

  const listCardsByCategory = useCallback(async (categoryId: number): Promise<Card[]> => {
    const result = await db.getAllAsync<Card>(
      'SELECT id, category_id, title, description, created_at, options_json, correct, order_index FROM cards WHERE category_id = ? ORDER BY order_index ASC, id DESC',
      categoryId
    );
    return result;
  }, [db]);

  const createCard = useCallback(async (input: { categoryId: number; title: string; description?: string | null; options?: Record<string, string> | null; correct?: string | null }): Promise<number> => {
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
  }, [db]);

  const updateCard = useCallback(async (id: number, updates: { title?: string; description?: string | null; options?: Record<string, string> | null; correct?: string | null; order_index?: number }): Promise<void> => {
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
  }, [db]);

  const deleteCard = useCallback(async (id: number): Promise<void> => {
    await db.runAsync('DELETE FROM cards WHERE id = ?', id);
  }, [db]);

  const reorderCards = useCallback(async (categoryId: number, orderedIds: number[]): Promise<void> => {
    let index = 0;
    for (const id of orderedIds) {
      await db.runAsync('UPDATE cards SET order_index = ? WHERE id = ? AND category_id = ?', index, id, categoryId);
      index += 1;
    }
  }, [db]);

  return { listCardsByCategory, createCard, updateCard, deleteCard, reorderCards };
}

export function useAnswerRepository() {
  const db = useSQLiteContext();

  const saveAnswer = useCallback(async (input: { categoryId?: number | null; categoryName?: string | null; title: string; selected: string | null; correct: string | null; isCorrect: boolean }): Promise<number> => {
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
  }, [db]);

  const getStatsByCategory = useCallback(async (): Promise<Array<{ category_name: string | null; total: number; acertos: number; erros: number; order_index: number }>> => {
    const rows = await db.getAllAsync<any>(
      `SELECT category_name, COUNT(*) as total, SUM(is_correct) as acertos, COUNT(*) - SUM(is_correct) as erros, MIN(order_index) as order_index
       FROM answers
       GROUP BY category_name
       ORDER BY order_index ASC, total DESC`
    );
    return rows;
  }, [db]);

  const reorderStats = useCallback(async (orderedCategoryNames: (string | null)[]): Promise<void> => {
    let index = 0;
    for (const categoryName of orderedCategoryNames) {
      await db.runAsync('UPDATE answers SET order_index = ? WHERE category_name = ?', index, categoryName);
      index += 1;
    }
  }, [db]);

  return { saveAnswer, getStatsByCategory, reorderStats };
}

export function useEssayRepository() {
  const db = useSQLiteContext();

  const listEssays = useCallback(async (): Promise<Essay[]> => {
    const result = await db.getAllAsync<Essay>('SELECT * FROM essays ORDER BY created_at DESC');
    return result;
  }, [db]);

  const saveEssay = useCallback(async (
    title: string | null,
    essayText: string | null,
    imageUri: string | null,
    analysis: string,
    score: number | null
  ): Promise<number> => {
    const result = await db.runAsync(
      'INSERT INTO essays (title, essay_text, image_uri, analysis, score) VALUES (?, ?, ?, ?, ?)',
      title,
      essayText,
      imageUri,
      analysis,
      score
    );
    return result.lastInsertRowId as number;
  }, [db]);

  const getEssay = useCallback(async (id: number): Promise<Essay | null> => {
    const result = await db.getFirstAsync<Essay>('SELECT * FROM essays WHERE id = ?', id);
    return result || null;
  }, [db]);

  const deleteEssay = useCallback(async (id: number): Promise<void> => {
    await db.runAsync('DELETE FROM essays WHERE id = ?', id);
  }, [db]);

  return { listEssays, saveEssay, getEssay, deleteEssay };
}

export function useStudyRepository() {
  const db = useSQLiteContext();

  const generateEventsForPlan = useCallback(async (planId: number, folderId: number, examDate: string, studyDays: number[], maxTopics: number = 1) => {
    // garante FK ativo nesta conexão
    try { await db.runAsync('PRAGMA foreign_keys = ON'); } catch {}
    const categories = await db.getAllAsync<Category>('SELECT * FROM categories WHERE folder_id = ? ORDER BY order_index ASC', folderId);
    if (categories.length === 0) return;

    const start = startOfDay(new Date());
    const end = startOfDay(new Date(examDate));
    
    if (end < start) return;

    const allDates = eachDayOfInterval({ start, end });
    const validDates = allDates.filter(d => studyDays.includes(d.getDay()));

    if (validDates.length === 0) return;
    
    // AI Generation via Gemini logic (calling helper)
    // We will pass the available topics and dates, and let it distribute, or use smart distribution
    // For now, let's implement the "Smart Distribution" locally but respecting maxTopics
    // OR better: Call the AI function if we really want "AI" to decide, but pure algorithm is faster and reliable for simple distribution.
    // The user asked "passa isso para que a IA monte". Let's implement a new AI function in lib/ai.ts and call it here.
    
    const categoryNames = categories.map(c => ({ id: c.id, name: c.name }));
    
    try {
        // Tentar gerar via IA
        const schedule = await generateStudySchedule({
            examDate,
            availableDays: validDates.length, // just count or we pass the specific dates
            topics: categoryNames.map(c => c.name),
            maxTopicsPerDay: maxTopics
        });

        if (schedule && schedule.length > 0) {
            // Map AI results back to DB
            // The AI returns a list of { dayIndex: 0...N, topics: ["Topic A", "Topic B"] }
            // We need to map dayIndex to actual dates in validDates
            for (const item of schedule) {
                if (item.dayIndex < validDates.length) {
                   const date = validDates[item.dayIndex];
                   for (const topicName of item.topics) {
                       // Find category ID
                       // Fuzzy match or exact match? AI might hallucinate slightly. 
                       // Let's assume it returns exact strings or close enough.
                       const cat = categories.find(c => c.name.toLowerCase() === topicName.toLowerCase()) || categories.find(c => topicName.toLowerCase().includes(c.name.toLowerCase()));
                       
                       if (cat) {
                           try {
                             await db.runAsync(
                               'INSERT INTO study_events (plan_id, category_id, date, completed) VALUES (?, ?, ?, ?)',
                               planId, cat.id, date.toISOString(), 0
                             );
                           } catch (e) {
                             console.warn('Failed to insert study_event (AI schedule)', { planId, categoryId: cat.id, date: date.toISOString(), error: String(e) });
                           }
                       }
                   }
                }
            }
            return;
        }
    } catch (e) {
        console.log("AI Schedule failed, falling back to algorithm", e);
    }

    // Fallback Algorithm (Smart Distribution)
    let categoryIndex = 0;
    for (let i = 0; i < validDates.length; i++) {
       const date = validDates[i];
       // Add up to maxTopics events for this day
       for (let k = 0; k < maxTopics; k++) {
           const category = categories[categoryIndex % categories.length];
           try {
             await db.runAsync(
                 'INSERT INTO study_events (plan_id, category_id, date, completed) VALUES (?, ?, ?, ?)',
                 planId, category.id, date.toISOString(), 0
             );
           } catch (e) {
             console.warn('Failed to insert study_event (fallback)', { planId, categoryId: category.id, date: date.toISOString(), error: String(e) });
           }
           categoryIndex++;
           
           // If we cycled through all categories, maybe stop adding for this day if we want to spread them out?
           // But the user asked for "max topics", implying they want to study MORE.
       }
    }

  }, [db]);

  const listPlans = useCallback(async (): Promise<StudyPlan[]> => {
    return await db.getAllAsync<StudyPlan>('SELECT * FROM study_plans ORDER BY created_at DESC');
  }, [db]);

  const getPlan = useCallback(async (id: number): Promise<StudyPlan | null> => {
    return await db.getFirstAsync<StudyPlan>('SELECT * FROM study_plans WHERE id = ?', id) || null;
  }, [db]);

  const createPlan = useCallback(async (input: { folderId: number; goal: string; examDate: string; dailyMinutes: number; studyDays: number[]; maxTopics: number }): Promise<number> => {
    const { folderId, goal, examDate, dailyMinutes, studyDays, maxTopics } = input;
    
    const result = await db.runAsync(
      'INSERT INTO study_plans (folder_id, goal, exam_date, daily_minutes, study_days, max_topics) VALUES (?, ?, ?, ?, ?, ?)',
      folderId, goal, examDate, dailyMinutes, JSON.stringify(studyDays), maxTopics
    );
    const planId = result.lastInsertRowId as number;

    await generateEventsForPlan(planId, folderId, examDate, studyDays, maxTopics);

    return planId;
  }, [db, generateEventsForPlan]);

  const updatePlanEvents = useCallback(async (planId: number): Promise<void> => {
    const plan = await getPlan(planId);
    if (!plan) return;
    
    await db.runAsync('DELETE FROM study_events WHERE plan_id = ? AND completed = 0 AND date >= ?', planId, new Date().toISOString());
    
    const studyDays = JSON.parse(plan.study_days);
    await generateEventsForPlan(planId, plan.folder_id, plan.exam_date, studyDays, plan.max_topics || 1);
  }, [db, getPlan, generateEventsForPlan]);

  const getEvents = useCallback(async (start: Date, end: Date): Promise<StudyEvent[]> => {
    return await db.getAllAsync<StudyEvent>(
        `SELECT e.*, c.name as category_name, 'blue' as folder_color 
         FROM study_events e 
         LEFT JOIN categories c ON e.category_id = c.id 
         WHERE e.date >= ? AND e.date <= ?`,
        start.toISOString(), end.toISOString()
    );
  }, [db]);
  
  const toggleEvent = useCallback(async (id: number, completed: boolean): Promise<void> => {
    await db.runAsync('UPDATE study_events SET completed = ? WHERE id = ?', completed ? 1 : 0, id);
  }, [db]);

  const deletePlan = useCallback(async (id: number): Promise<void> => {
    await db.runAsync('DELETE FROM study_plans WHERE id = ?', id);
  }, [db]);

  return { listPlans, getPlan, createPlan, updatePlanEvents, getEvents, toggleEvent, deletePlan };
}
