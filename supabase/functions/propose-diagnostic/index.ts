// Edge function leve para o funil /propostacomercial.
// Roda apenas Gemini + Claude em paralelo (chaves próprias, custo baixo)
// e retorna apenas o score geral + 5 pilares — sem nuvem de percepção, sem sub-critérios.
// Mantém o MESMO prompt da simulate-ai para consistência de avaliação.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `SISTEMA — RADAR ESTRATÉGICO IVERO

Pergunta-guia: "Esse site tem sinais suficientes para ser recomendado por uma IA?"

Avalie os 5 pilares: clareza, autoridade, posicionamento, conversao, relevancia.
Para cada pilar, dê um score 0–100 e uma justificativa curta (máx. 2 frases, em português).

Retorne APENAS JSON válido, sem markdown, exatamente:
{
  "clareza": { "score": 0, "justificativa": "" },
  "autoridade": { "score": 0, "justificativa": "" },
  "posicionamento": { "score": 0, "justificativa": "" },
  "conversao": { "score": 0, "justificativa": "" },
  "relevancia": { "score": 0, "justificativa": "" }
}`;

type PillarKey =
  | "clareza"
  | "autoridade"
  | "posicionamento"
  | "conversao"
  | "relevancia";

interface PillarResult {
  score: number;
  justificativa: string;
}

type Pillars = Record<PillarKey, PillarResult>;

const EMPTY_PILLAR: PillarResult = { score: 0, justificativa: "" };
const EMPTY_PILLARS: Pillars = {
  clareza: { ...EMPTY_PILLAR },
  autoridade: { ...EMPTY_PILLAR },
  posicionamento: { ...EMPTY_PILLAR },
  conversao: { ...EMPTY_PILLAR },
  relevancia: { ...EMPTY_PILLAR },
};

function clamp(n: unknown): number {
  if (typeof n !== "number" || !isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function tryParseJson(content: string): any | null {
  if (!content) return null;
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}

function normalizePillars(raw: any): Pillars {
  const out: Pillars = { ...EMPTY_PILLARS };
  if (!raw || typeof raw !== "object") return out;
  for (const k of Object.keys(out) as PillarKey[]) {
    const v = raw[k];
    if (v && typeof v === "object") {
      out[k] = {
        score: clamp(v.score),
        justificativa:
          typeof v.justificativa === "string" ? v.justificativa : "",
      };
    }
  }
  return out;
}

async function callGemini(prompt: string): Promise<Pillars | null> {
  const key = Deno.env.get("Key_gemini");
  if (!key) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${SYSTEM_PROMPT}\n\nUser query: ${prompt}` }],
            },
          ],
          generationConfig: { maxOutputTokens: 1500 },
        }),
      },
    );
    if (!res.ok) {
      console.error("Gemini error", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const parsed = tryParseJson(content);
    return parsed ? normalizePillars(parsed) : null;
  } catch (e) {
    console.error("Gemini failed:", e);
    return null;
  }
}

async function callClaude(prompt: string): Promise<Pillars | null> {
  const key = Deno.env.get("Key_antropic_claude");
  if (!key) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-latest",
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      console.error("Claude error", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const content = data.content?.[0]?.text || "";
    const parsed = tryParseJson(content);
    return parsed ? normalizePillars(parsed) : null;
  } catch (e) {
    console.error("Claude failed:", e);
    return null;
  }
}

function averagePillars(results: (Pillars | null)[]): Pillars {
  const valid = results.filter((r): r is Pillars => !!r);
  if (valid.length === 0) return { ...EMPTY_PILLARS };
  const out: Pillars = { ...EMPTY_PILLARS };
  for (const k of Object.keys(out) as PillarKey[]) {
    const scores = valid.map((v) => v[k].score).filter((n) => n > 0);
    const justs = valid.map((v) => v[k].justificativa).filter(Boolean);
    out[k] = {
      score: scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0,
      justificativa: justs[0] || "",
    };
  }
  return out;
}

function statusLabel(score: number): string {
  if (score >= 80) return "Referência";
  if (score >= 60) return "Sólido";
  if (score >= 40) return "Insuficiente";
  return "Crítico";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const { url, brandName } = await req.json().catch(() => ({}));
    const targetUrl = typeof url === "string" ? url.trim() : "";
    if (!targetUrl) {
      return new Response(
        JSON.stringify({ error: "URL é obrigatória" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const brand =
      typeof brandName === "string" && brandName.trim()
        ? brandName.trim()
        : targetUrl
            .replace(/^https?:\/\//i, "")
            .replace(/^www\./i, "")
            .split("/")[0]
            .split(".")[0];

    const userPrompt = `Avalie o site "${targetUrl}" (marca aproximada: "${brand}") nos 5 pilares descritos no sistema. Considere o que tipicamente aparece no domínio. Devolva apenas o JSON solicitado.`;

    const [g, c] = await Promise.all([
      callGemini(userPrompt),
      callClaude(userPrompt),
    ]);

    const pillars = averagePillars([g, c]);
    const overall = Math.round(
      (pillars.clareza.score +
        pillars.autoridade.score +
        pillars.posicionamento.score +
        pillars.conversao.score +
        pillars.relevancia.score) /
        5,
    );

    return new Response(
      JSON.stringify({
        url: targetUrl,
        brandName: brand,
        overall,
        status_label: statusLabel(overall),
        pillars,
        models_used: [g && "Gemini", c && "Claude"].filter(Boolean),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("propose-diagnostic fatal:", e);
    return new Response(
      JSON.stringify({ error: "Falha ao gerar diagnóstico" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
