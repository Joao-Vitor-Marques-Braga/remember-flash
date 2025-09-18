import { getApiKey, getModelName } from '@/lib/secure';

type GeneratedQA = {
  title: string;
  description: string;
  options?: { a: string; b: string; c: string; d: string };
  correct?: 'a' | 'b' | 'c' | 'd';
};

// Gerar questões a partir de uma categoria usando Gemini (via fetch)
// Obs.: O usuário deve ter a variável GEMINI_API_KEY salva via modal
export async function generateQuestionsByCategory(categoryName: string, num: number = 5): Promise<GeneratedQA[]> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error('API key não configurada. Abra o modal e salve a chave.');

  const prompt = `Gere ${num} perguntas de múltipla escolha no padrão da banca UNIRV, em graus médio e difícil, para a categoria "${categoryName}".
Regras:
- Cada item deve ter: título (pergunta), quatro alternativas (a, b, c, d) e a letra correta.
- Inclua também uma explicação/justificativa curta como descrição (resposta).
- Responda SOMENTE com JSON válido, sem texto adicional e sem markdown.
- Formato exato: [{"title": string, "description": string, "options": {"a": string, "b": string, "c": string, "d": string}, "correct": "a"|"b"|"c"|"d"}]`;

  // Usa modelo configurável; fallback para 1.5 se 2.5 não suportar
  const model = (await getModelName()) || 'gemini-1.5-flash-latest';
  const makeUrl = (m: string) => 'https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent?key=' + encodeURIComponent(apiKey);
  let url = makeUrl(model);

  const body = {
    generationConfig: {
      response_mime_type: 'application/json',
    },
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
  };

  let res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    // fallback automático para 1.5-flash se o modelo atual não suportar
    const fallbackModel = 'gemini-1.5-flash-latest';
    if (model !== fallbackModel && res.status === 404) {
      url = makeUrl(fallbackModel);
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error('Falha na requisição à IA: ' + text);
    }
  }

  const data = await res.json();
  // Pega o primeiro candidate e o texto
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  // Tenta parse direto (esperado com response_mime_type JSON)
  const tryParse = (s: string): GeneratedQA[] | null => {
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed as GeneratedQA[];
      if (parsed && Array.isArray((parsed as any).items)) return (parsed as any).items as GeneratedQA[];
      if (parsed && Array.isArray((parsed as any).flashcards)) return (parsed as any).flashcards as GeneratedQA[];
      return null;
    } catch {
      return null;
    }
  };

  let result = tryParse(text);
  if (result) return normalize(result);

  // Fallback: tentar extrair bloco entre crases ```json ... ```
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    const alt = tryParse(fencedMatch[1]);
    if (alt) return normalize(alt);
  }

  // Fallback: extrair primeiro array aparente
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch?.[0]) {
    const alt = tryParse(arrayMatch[0]);
    if (alt) return normalize(alt);
  }

  return [];
}

function normalize(items: any[]): GeneratedQA[] {
  return items
    .map((it) => ({
      title: String(it.title ?? it.pergunta ?? ''),
      description: String(it.description ?? it.resposta ?? ''),
      options: it.options ?? it.alternativas ?? undefined,
      correct: it.correct ?? it.correta ?? undefined,
    }))
    .filter((it) => it.title.trim().length > 0);
}


