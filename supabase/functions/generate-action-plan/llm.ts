import { type ActionDraft, type Target, validateDraft } from "./logic.ts";

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

export async function generateWithLlm(
  brand: { nome: string; setor: string; descricao: string },
  targets: Target[],
  apiKey = Deno.env.get("LOVABLE_API_KEY"),
): Promise<Map<string, ActionDraft>> {
  const key = apiKey;
  if (!key) throw new Error("LOVABLE_API_KEY ausente");
  const pilares = targets.map((t) => ({
    pilar: t.pillar, score: t.score, tipo: t.consolidacao ? "consolidacao" : "correcao",
    subcriterios_fracos: t.weak.map((c) => ({ nome: c.nome, score: c.score, justificativa: c.justificativa ?? "" })),
  }));
  const prompt = `Você gera o Plano de Ação da Ivero (auditoria de presença de marcas em IAs generativas).
Marca: ${brand.nome}
Setor: ${brand.setor || "não informado"}
Descrição: ${brand.descricao || "não informada"}

Para CADA pilar abaixo gere exatamente 1 ação prática e específica para esta marca, baseada nos sub-critérios fracos e nas justificativas reais.
Regras: português do Brasil; título imperativo com até 90 caracteres; descrição de 2 a 4 frases com o que fazer; "impacto_estimado" é orientação qualitativa curta, SEM números, porcentagens ou promessa de pontos; não invente fatos, números, prêmios, clientes ou produtos que não estejam nos dados; tipo "consolidacao" = manter e reforçar um pilar que já está bom. Use em "pilar" exatamente o nome recebido.

Pilares: ${JSON.stringify(pilares)}`;

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
          if (ev.type === "response.failed" || ev.type === "error") throw new Error("resposta falhou");
        } catch (e) {
          if (e instanceof Error && e.message === "resposta falhou") throw e;
        }
      }
    }
    const parsed = JSON.parse(out) as { acoes?: Array<Record<string, unknown>> };
    const map = new Map<string, ActionDraft>();
    for (const a of parsed.acoes ?? []) {
      const d = validateDraft(a);
      if (d && typeof a.pilar === "string") map.set(a.pilar, d);
    }
    return map;
  } finally {
    clearTimeout(timer);
  }
}

