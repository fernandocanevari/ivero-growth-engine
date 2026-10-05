import { type ActionDraft, LIMITS, type Target, validateDraft } from "./logic.ts";

export const MODEL = "openai/gpt-6-astra";
const LLM_TIMEOUT_MS = 25_000;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["acoes"],
  properties: {
    acoes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["pilar", "titulo", "descricao", "impacto_estimado"],
        properties: {
          pilar: { type: "string" },
          titulo: { type: "string" },
          descricao: { type: "string" },
          impacto_estimado: { type: "string" },
        },
      },
    },
  },
};

type Brand = { nome: string; setor: string; descricao: string };

export function buildPrompt(brand: Brand, targets: Target[], retry = false) {
  const pilares = targets.map((t) => ({
    pilar: t.pillar, score: t.score, tipo: t.consolidacao ? "consolidacao" : "correcao",
    subcriterios_fracos: t.weak.map((c) => ({ nome: c.nome, score: c.score, justificativa: c.justificativa ?? "" })),
  }));
  const limites = retry
    ? `ATENÇÃO: a resposta anterior ficou longa demais. Seja MUITO mais curto: título com até 50 caracteres; descrição em 1 frase com até 160 caracteres; impacto em 1 frase com até 90 caracteres.`
    : `Limites OBRIGATÓRIOS: título imperativo com no máximo ${LIMITS.titulo} caracteres; descrição com no máximo ${LIMITS.descricaoFrases} frases e ${LIMITS.descricao} caracteres no total; "impacto_estimado" com 1 frase de no máximo ${LIMITS.impacto} caracteres.`;
  return `Você gera o Plano de Ação da Ivero (auditoria de presença de marcas em IAs generativas). O leitor é um cliente leigo.
Marca: ${brand.nome}
Setor: ${brand.setor || "não informado"}
Descrição: ${brand.descricao || "não informada"}

Para CADA pilar abaixo gere exatamente 1 ação prática e específica para esta marca, baseada nos sub-critérios fracos e nas justificativas reais.
${limites}
Tom direto, orientado a ação, sem jargão técnico (evite termos como SEO, backlinks, schema, semântica). Português do Brasil. "impacto_estimado" é orientação qualitativa, SEM números, porcentagens ou promessa de pontos. Não invente fatos, números, prêmios, clientes ou produtos que não estejam nos dados. Tipo "consolidacao" = manter e reforçar um pilar que já está bom. Use em "pilar" exatamente o nome recebido.

Pilares: ${JSON.stringify(pilares)}`;
}

async function callOnce(prompt: string, key: string): Promise<Array<Record<string, unknown>>> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), LLM_TIMEOUT_MS);
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: MODEL,
        input: prompt,
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        text: { format: { type: "json_schema", name: "plano_de_acao", strict: true, schema: SCHEMA } },
      }),
    });
    if (!res.ok || !res.body) throw new Error(`gateway ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", out = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        try {
          const ev = JSON.parse(line.slice(5));
          if (ev.type === "response.output_text.delta") out += ev.delta ?? "";
          if (ev.type === "response.completed" && ev.response?.usage) lastUsage = ev.response.usage;
          if (ev.type === "response.failed" || ev.type === "error") throw new Error("resposta falhou");
        } catch (e) {
          if (e instanceof Error && e.message === "resposta falhou") throw e;
        }
      }
    }
    return (JSON.parse(out) as { acoes?: Array<Record<string, unknown>> }).acoes ?? [];
  } finally {
    clearTimeout(timer);
  }
}

export let lastUsage: unknown = null;

/** Valida cada ação; os pilares que estourarem limite ganham 1 nova tentativa com instrução mais curta. Quem falhar de novo fica de fora (o chamador usa o texto padrão). */
export async function generateWithLlm(
  brand: Brand,
  targets: Target[],
  apiKey = Deno.env.get("LOVABLE_API_KEY"),
  call: (prompt: string, key: string) => Promise<Array<Record<string, unknown>>> = callOnce,
): Promise<Map<string, ActionDraft>> {
  const key = apiKey;
  if (!key) throw new Error("LOVABLE_API_KEY ausente");
  const map = new Map<string, ActionDraft>();
  const collect = (acoes: Array<Record<string, unknown>>, allowed: Target[]) => {
    for (const a of acoes) {
      const d = validateDraft(a);
      if (d && typeof a.pilar === "string" && allowed.some((t) => t.pillar === a.pilar)) map.set(a.pilar, d);
    }
  };
  collect(await call(buildPrompt(brand, targets), key), targets);
  const missing = targets.filter((t) => !map.has(t.pillar));
  if (missing.length) {
    try {
      collect(await call(buildPrompt(brand, missing, true), key), missing);
    } catch (e) {
      console.warn("[generate-action-plan] nova tentativa falhou:", e instanceof Error ? e.message : e);
    }
  }
  return map;
}
