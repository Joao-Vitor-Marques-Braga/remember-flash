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
  const model = "gemini-2.5-flash";
  
  // Log da versão do Gemini sendo usada
  console.log(`🤖 Gerando questões com Gemini: ${model}`);
  
  // Gera a URL base para o modelo
  let modelName = model;
  let url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

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
    const fallbackModel = 'gemini-1.5-flash';
    if (modelName !== fallbackModel && res.status === 404) {
      console.log(`⚠️ Modelo ${modelName} não disponível, usando fallback: ${fallbackModel}`);
      // Regenera URL com modelo fallback
      url = `https://generativelanguage.googleapis.com/v1beta/models/${fallbackModel}:generateContent?key=${apiKey}`;
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

// Gerar questões/flashcards a partir de um PDF (base64) usando Gemini
export async function generateFlashcardsFromPdf(pdfBase64: string, num: number = 5): Promise<GeneratedQA[]> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error('API key não configurada. Abra o modal e salve a chave.');

  const prompt = `Você receberá um arquivo PDF com conteúdo para estudo.\n\nTarefa: Gere ${num} flashcards (formato frente/verso) que resumam os pontos principais da maneira mais objetiva e eficiente possível.\n\nRegras:\n- Cada item deve ter: título (pergunta ou tópico curto) e descrição (resumo objetivo).\n- Não crie alternativas de múltipla escolha.\n- Responda SOMENTE com JSON válido, sem texto adicional e sem markdown.\n- Formato exato: [{"title": string, "description": string}]`;

  // Usa modelo configurável; fallback para 1.5 se 2.5 não suportar
  const model = 'gemini-2.5-flash';

  console.log(`🤖 Gerando flashcards de PDF com Gemini: ${model}`);

  let modelName = model;
  let url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const body: any = {
    generationConfig: {
      response_mime_type: 'application/json',
    },
    contents: [
      {
        parts: [
          { text: prompt },
          { inline_data: { mime_type: 'application/pdf', data: pdfBase64 } },
        ],
      },
    ],
  };

  let res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const fallbackModel = 'gemini-1.5-flash';
    if (modelName !== fallbackModel && res.status === 404) {
      console.log(`⚠️ Modelo ${modelName} não disponível, usando fallback: ${fallbackModel}`);
      url = `https://generativelanguage.googleapis.com/v1beta/models/${fallbackModel}:generateContent?key=${apiKey}`;
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
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

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

  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    const alt = tryParse(fencedMatch[1]);
    if (alt) return normalize(alt);
  }

  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch?.[0]) {
    const alt = tryParse(arrayMatch[0]);
    if (alt) return normalize(alt);
  }

  return [];
}

// Analisar redação com prompt específico da UNIRV
export async function analyzeEssay(essayText: string, imageUri?: string | null): Promise<string> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error('API key não configurada. Abra o modal e salve a chave.');

  const prompt = `Você é um corretor experiente de redações de concursos públicos. Faça uma análise completa e detalhada da redação fornecida.

ESTRUTURA DA RESPOSTA (obrigatória):

1. ACOLHIMENTO
- Parabenize o candidato por fazer o texto
- Destaque aspectos positivos gerais (letra legível, seguir o tema, etc.)

2. TRANSCRIÇÃO DA REDAÇÃO
- Transcreva exatamente o texto da redação, preservando a formatação original
- Inclua o título se houver

3. ANÁLISE DETALHADA NOS 3 PILARES:

A) ESTRUTURA (Forma)
- Pontos Fortes: estrutura do texto, parágrafos, introdução, desenvolvimento, conclusão
- Ponto Principal a Melhorar: sugestões específicas para melhoria estrutural

B) CONTEÚDO (Argumentação)
- Pontos Fortes: adequação ao tema, argumentação, repertório sociocultural
- Ponto Principal a Melhorar: sugestões para fortalecer a argumentação

C) EXPRESSÃO (Gramática e Coesão)
- Análise completa dos aspectos linguísticos
- Principais Pontos a Corrigir: liste erros específicos com correções
- Inclua: crase, concordância, vírgula, regência, ortografia, pontuação

4. NOTA E CONSIDERAÇÕES FINAIS
- Nota de 0 a 10 com justificativa
- Potencial de melhoria
- Motivação para continuar estudando

Seja detalhado, educativo e motivador. Use linguagem clara e didática.`;

  const model = 'gemini-2.5-flash';
  console.log(`🤖 Analisando redação com Gemini: ${model}`);

  let modelName = model;
  let url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const contents: any[] = [
    {
      parts: [{ text: prompt }],
    },
  ];

  // Se há texto da redação, adiciona ao prompt
  if (essayText.trim()) {
    console.log('📝 Enviando texto da redação:', essayText.substring(0, 100) + '...');
    contents[0].parts.push({ text: `\n\nREDAÇÃO PARA ANÁLISE:\n${essayText}` });
  } else {
    console.log('⚠️ Nenhum texto de redação fornecido');
  }

  // Se há imagem, adiciona à análise
  if (imageUri) {
    try {
      console.log('📷 Processando imagem da redação...');
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      
      const base64Data = base64.split(',')[1];
      
      contents[0].parts.push({
        inline_data: {
          mime_type: 'image/jpeg',
          data: base64Data,
        },
      });
      
      contents[0].parts.push({ 
        text: `\n\nEsta é uma imagem de uma redação manuscrita. Por favor, analise o texto visível na imagem e forneça uma avaliação completa.` 
      });
      
      console.log('✅ Imagem processada e adicionada à análise');
    } catch (error) {
      console.warn('Erro ao processar imagem:', error);
      // Fallback: adicionar nota sobre imagem
      contents[0].parts.push({ 
        text: `\n\nIMAGEM ANEXADA: O usuário enviou uma imagem da redação para análise. Por favor, considere que esta é uma redação manuscrita e analise conforme os critérios da UNIRV.` 
      });
    }
  }

  const body = {
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
    contents,
  };

  let res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const fallbackModel = 'gemini-1.5-flash';
    if (modelName !== fallbackModel && res.status === 404) {
      console.log(`⚠️ Modelo ${modelName} não disponível, usando fallback: ${fallbackModel}`);
      url = `https://generativelanguage.googleapis.com/v1beta/models/${fallbackModel}:generateContent?key=${apiKey}`;
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
  console.log('📥 Resposta da IA:', JSON.stringify(data, null, 2));
  
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  
  if (!text.trim()) {
    console.error('❌ Resposta vazia da IA. Dados recebidos:', data);
    throw new Error('Resposta vazia da IA. Verifique os logs para mais detalhes.');
  }

  console.log('✅ Análise recebida:', text.substring(0, 100) + '...');
  return text;
}


