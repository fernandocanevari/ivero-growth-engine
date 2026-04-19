import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ModelConfig {
  name: string;
  url: string;
  model: string;
  getHeaders: () => Record<string, string>;
  parseResponse: (data: any) => string;
}

function getModelConfigs(): ModelConfig[] {
  const openaiKey = Deno.env.get("key_Open_IA");
  const geminiKey = Deno.env.get("Key_gemini");
  const claudeKey = Deno.env.get("Key_antropic_claude");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");

  const configs: ModelConfig[] = [];

  if (openaiKey) {
    configs.push({
      name: "ChatGPT",
      url: "https://api.openai.com/v1/chat/completions",
      model: "gpt-4o-mini",
      getHeaders: () => ({
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      }),
      parseResponse: (data) => data.choices?.[0]?.message?.content || "",
    });
  }

  if (geminiKey) {
    configs.push({
      name: "Gemini",
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      model: "gemini-2.0-flash",
      getHeaders: () => ({ "Content-Type": "application/json" }),
      parseResponse: (data) => data.candidates?.[0]?.content?.parts?.[0]?.text || "",
    });
  }

  if (claudeKey) {
    configs.push({
      name: "Claude",
      url: "https://api.anthropic.com/v1/messages",
      model: "claude-3-5-haiku-latest",
      getHeaders: () => ({
        "x-api-key": claudeKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      }),
      parseResponse: (data) => data.content?.[0]?.text || "",
    });
  }

  if (lovableKey) {
    configs.push({
      name: "Perplexity",
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      model: "google/gemini-3-flash-preview",
      getHeaders: () => ({
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      }),
      parseResponse: (data) => data.choices?.[0]?.message?.content || "",
    });

    configs.push({
      name: "GPT-5",
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      model: "openai/gpt-5-mini",
      getHeaders: () => ({
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      }),
      parseResponse: (data) => data.choices?.[0]?.message?.content || "",
    });
  }

  return configs;
}

function getErrorMessage(status: number): string {
  if (status === 429) return "Limite atingido";
  if (status === 400) return "Sem créditos";
  if (status === 401 || status === 403) return "Chave inválida";
  return `Erro HTTP ${status}`;
}

const DIAGNOSTICO_SYSTEM_PROMPT = `SISTEMA — RADAR ESTRATÉGICO IVERO

Pergunta-guia: "Esse site tem sinais suficientes para ser recomendado por uma IA?"

Você receberá o conteúdo (ou referência) de um site/marca. Avalie os 5 pilares abaixo. Para CADA pilar, avalie 3 sub-critérios objetivos (cada um com score 0–100 e justificativa em até 1 frase) e depois calcule o score final do pilar como MÉDIA PONDERADA dos 3 critérios usando exatamente os pesos indicados.

Retorne APENAS um JSON válido (sem markdown, sem texto antes ou depois).

--- CLAREZA (Entendimento) ---
Critérios (com pesos):
1. "Proposta de valor no hero" (peso 40) — A proposta de valor está explícita e visível no topo?
2. "Compreensão em <5s" (peso 35) — Um visitante entende em menos de 5 segundos o que a marca faz e para quem?
3. "Linguagem livre de jargão" (peso 25) — A linguagem é livre de jargão e ruído?

--- AUTORIDADE (Credibilidade) ---
Critérios (com pesos):
1. "Provas sociais (cases, números, depoimentos)" (peso 40) — Há provas sociais concretas?
2. "Expertise técnica/conteúdo especializado" (peso 35) — A marca demonstra expertise com conteúdo técnico ou especializado?
3. "Prêmios, certificações e reconhecimentos" (peso 25) — Existem menções a prêmios, certificações ou reconhecimentos externos?

--- POSICIONAMENTO (Identidade) ---
Critérios (com pesos):
1. "Nicho e público-alvo definidos" (peso 40) — O nicho e o público-alvo estão claramente definidos?
2. "Diferencial competitivo declarado" (peso 35) — A marca declara seu diferencial em relação a concorrentes?
3. "Consistência de mensagem" (peso 25) — A mensagem é consistente ao longo de toda a página?

--- CONVERSÃO (Ação) ---
Critérios (com pesos):
1. "CTAs claros e visíveis" (peso 40) — Existem CTAs claros e visíveis que induzem o visitante a agir?
2. "Oferta ou próximo passo definido" (peso 35) — Há uma oferta ou próximo passo bem definido?
3. "Fluxo de navegação lógico" (peso 25) — O fluxo de navegação conduz naturalmente a uma ação?

--- RELEVÂNCIA (Contexto e busca) ---
Critérios (com pesos):
1. "Termos e palavras-chave do nicho" (peso 35) — O conteúdo utiliza termos e contextos relevantes do nicho da marca?
2. "Responde perguntas reais do público" (peso 35) — O site responde perguntas que o público-alvo faria a uma IA?
3. "Cobertura semântica do setor" (peso 30) — Há cobertura semântica suficiente para que sistemas de IA associem a marca ao setor correto?

Para cada pilar, "score" final DEVE ser calculado como: round((c1*p1 + c2*p2 + c3*p3) / 100), onde cN é o score do critério e pN seu peso.

Cada "justificativa" (do pilar e dos critérios) deve estar em português e ter no máximo 2 frases (critérios: 1 frase).

Formato de resposta OBRIGATÓRIO (apenas JSON puro, exatamente esta estrutura):
{
  "clareza": {
    "score": 0,
    "justificativa": "",
    "criterios": [
      { "nome": "Proposta de valor no hero", "score": 0, "peso": 40, "justificativa": "" },
      { "nome": "Compreensão em <5s", "score": 0, "peso": 35, "justificativa": "" },
      { "nome": "Linguagem livre de jargão", "score": 0, "peso": 25, "justificativa": "" }
    ]
  },
  "autoridade": {
    "score": 0,
    "justificativa": "",
    "criterios": [
      { "nome": "Provas sociais (cases, números, depoimentos)", "score": 0, "peso": 40, "justificativa": "" },
      { "nome": "Expertise técnica/conteúdo especializado", "score": 0, "peso": 35, "justificativa": "" },
      { "nome": "Prêmios, certificações e reconhecimentos", "score": 0, "peso": 25, "justificativa": "" }
    ]
  },
  "posicionamento": {
    "score": 0,
    "justificativa": "",
    "criterios": [
      { "nome": "Nicho e público-alvo definidos", "score": 0, "peso": 40, "justificativa": "" },
      { "nome": "Diferencial competitivo declarado", "score": 0, "peso": 35, "justificativa": "" },
      { "nome": "Consistência de mensagem", "score": 0, "peso": 25, "justificativa": "" }
    ]
  },
  "conversao": {
    "score": 0,
    "justificativa": "",
    "criterios": [
      { "nome": "CTAs claros e visíveis", "score": 0, "peso": 40, "justificativa": "" },
      { "nome": "Oferta ou próximo passo definido", "score": 0, "peso": 35, "justificativa": "" },
      { "nome": "Fluxo de navegação lógico", "score": 0, "peso": 25, "justificativa": "" }
    ]
  },
  "relevancia": {
    "score": 0,
    "justificativa": "",
    "criterios": [
      { "nome": "Termos e palavras-chave do nicho", "score": 0, "peso": 35, "justificativa": "" },
      { "nome": "Responde perguntas reais do público", "score": 0, "peso": 35, "justificativa": "" },
      { "nome": "Cobertura semântica do setor", "score": 0, "peso": 30, "justificativa": "" }
    ]
  }
}`;

function extractJsonFromContent(content: string): any | null {
  if (!content) return null;
  // Remove markdown code fences if present
  let cleaned = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to find first { ... } block
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function emptyPillars() {
  return {
    clareza: { score: 0, justificativa: "" },
    autoridade: { score: 0, justificativa: "" },
    posicionamento: { score: 0, justificativa: "" },
    conversao: { score: 0, justificativa: "" },
    relevancia: { score: 0, justificativa: "" },
  };
}

async function callModel(
  config: ModelConfig,
  userPrompt: string,
  systemPrompt: string,
  brandName: string,
  mode: string
): Promise<any> {
  const isDiagnostico = mode === "diagnostico";
  const maxTokens = isDiagnostico ? 1000 : 300;

  try {
    let body: any;

    if (config.name === "Gemini") {
      body = {
        contents: [
          { role: "user", parts: [{ text: `${systemPrompt}\n\nUser query: ${userPrompt}` }] },
        ],
        generationConfig: { maxOutputTokens: maxTokens },
      };
    } else if (config.name === "Claude") {
      body = {
        model: config.model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      };
    } else if (config.name === "GPT-5") {
      body = {
        model: config.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_completion_tokens: maxTokens,
      };
    } else {
      body = {
        model: config.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: maxTokens,
      };
    }

    const response = await fetch(config.url, {
      method: "POST",
      headers: config.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`${config.name} error [${response.status}]:`, errText);
      const errorMessage = getErrorMessage(response.status);
      if (isDiagnostico) {
        return { model: config.name, error: true, errorMessage, pillars: emptyPillars() };
      }
      return {
        model: config.name,
        error: true,
        errorMessage,
        ...(mode === "simulator"
          ? { response: "", mentionsBrand: false }
          : { mentioned: false }),
      };
    }

    const data = await response.json();
    const content = config.parseResponse(data);

    if (isDiagnostico) {
      const parsed = extractJsonFromContent(content);
      if (!parsed) {
        console.error(`${config.name} JSON parse failed. Content:`, content?.slice(0, 500));
        return {
          model: config.name,
          error: true,
          errorMessage: "Resposta inválida",
          pillars: emptyPillars(),
        };
      }
      // Normalize keys & ensure shape
      const normalize = (k: string) => {
        const v = parsed[k];
        if (v && typeof v === "object") {
          return {
            score: typeof v.score === "number" ? Math.max(0, Math.min(100, v.score)) : 0,
            justificativa: typeof v.justificativa === "string" ? v.justificativa : "",
          };
        }
        return { score: 0, justificativa: "" };
      };
      return {
        model: config.name,
        pillars: {
          clareza: normalize("clareza"),
          autoridade: normalize("autoridade"),
          posicionamento: normalize("posicionamento"),
          conversao: normalize("conversao"),
          relevancia: normalize("relevancia"),
        },
      };
    }

    const mentionsBrand = content.toLowerCase().includes(brandName.toLowerCase());
    if (mode === "simulator") {
      return { model: config.name, response: content, mentionsBrand };
    } else {
      return { model: config.name, mentioned: mentionsBrand };
    }
  } catch (e) {
    console.error(`${config.name} call failed:`, e);
    if (isDiagnostico) {
      return { model: config.name, error: true, errorMessage: "Falha na conexão", pillars: emptyPillars() };
    }
    return {
      model: config.name,
      error: true,
      errorMessage: "Falha na conexão",
      ...(mode === "simulator"
        ? { response: "", mentionsBrand: false }
        : { mentioned: false }),
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, brandName, mode } = await req.json();

    if (!prompt || !brandName) {
      return new Response(JSON.stringify({ error: "prompt and brandName are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const configs = getModelConfigs();
    if (configs.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhuma chave de IA configurada." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt =
      mode === "diagnostico"
        ? `${DIAGNOSTICO_SYSTEM_PROMPT}\n\nMarca a ser avaliada: "${brandName}".`
        : `You are an AI assistant. Answer the user's question naturally in Portuguese (Brazil). If the brand "${brandName}" is relevant to the answer, mention it naturally. If not, don't force it. Keep it to 1-3 sentences.`;

    const results = await Promise.all(
      configs.map((config) => callModel(config, prompt, systemPrompt, brandName, mode))
    );

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("simulate-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
