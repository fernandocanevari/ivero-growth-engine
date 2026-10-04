import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import {
  type ActionDraft, type Pillar, type Target,
  fallbackAction, isDuplicate, selectTargets, validateDraft,
} from "./logic.ts";

const MODEL = "openai/gpt-6-astra";
const LLM_TIMEOUT_MS = 25_000;
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.object({ auditReportId: z.string().uuid(), brandId: z.string().uuid().nullable().optional() });

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

async function generateWithLlm(
  brand: { nome: string; setor: string; descricao: string },
  targets: Target[],
): Promise<Map<string, ActionDraft>> {
  const key = Deno.env.get("LOVABLE_API_KEY");
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

function planAllows(plano: string | null | undefined) {
  return plano === "autoridade";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
  const url = Deno.env.get("SUPABASE_URL")!;
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: claims, error: authErr } = await userClient.auth.getClaims(auth.slice(7));
  const uid = claims?.claims?.sub as string | undefined;
  if (authErr || !uid) return json({ error: "unauthorized" }, 401);

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
  const { auditReportId } = parsed.data;

  // Lido com o token do cliente: RLS garante que ele tem acesso a este diagnóstico.
  const { data: report } = await userClient
    .from("audit_reports").select("id, user_id, brand_id, pillar_details").eq("id", auditReportId).maybeSingle();
  if (!report) return json({ error: "not_found" }, 404);
  // A marca gravada é sempre a do próprio diagnóstico (nunca a do corpo da requisição).
  const brandId = (report.brand_id as string | null) ?? null;
  if ((parsed.data.brandId ?? null) !== brandId) return json({ error: "brand_mismatch" }, 400);

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Idempotência garantida pelo banco (PK em audit_report_id).
  const { error: lockErr } = await admin.from("action_plan_generations")
    .insert({ audit_report_id: auditReportId, user_id: report.user_id, brand_id: brandId });
  if (lockErr) return json({ status: "already_generated" });
  const finish = (patch: Record<string, unknown>) =>
    admin.from("action_plan_generations").update(patch).eq("audit_report_id", auditReportId);

  try {
    // Plano: individual → assinatura da conta; agência → plano da marca.
    let plano: string | null = null;
    if (brandId) {
      const { data: link } = await admin.from("agency_brands")
        .select("plano, plano_pretendido").eq("brand_id", brandId).eq("status", "ativo").maybeSingle();
      plano = (link?.plano as string | null) ?? (link?.plano_pretendido as string | null) ?? null;
    } else {
      const { data: sub } = await admin.from("assinaturas").select("plano, status").eq("user_id", report.user_id).maybeSingle();
      plano = sub && !["cancelado", "expirado"].includes(sub.status as string) ? (sub.plano as string) : null;
    }
    if (!planAllows(plano)) {
      await finish({ status: "sem_plano", detalhe: plano ?? "sem plano" });
      return json({ status: "skipped_plan" });
    }

    const targets = selectTargets((report.pillar_details ?? []) as Pillar[]);
    if (!targets.length) {
      await finish({ status: "sem_dados" });
      return json({ status: "no_data" });
    }

    const brandQ = admin.from("brand_settings").select("brand_name, sector, description");
    const { data: brand } = brandId
      ? await brandQ.eq("id", brandId).maybeSingle()
      : await brandQ.eq("user_id", report.user_id).maybeSingle();

    let llm = new Map<string, ActionDraft>();
    let llmError: string | null = null;
    try {
      llm = await generateWithLlm(
        { nome: brand?.brand_name ?? "", setor: brand?.sector ?? "", descricao: brand?.description ?? "" },
        targets,
      );
    } catch (e) {
      llmError = e instanceof Error ? e.message : String(e);
      console.warn("[generate-action-plan] IA falhou, usando fallback:", llmError);
    }

    // Ações existentes da MESMA marca (individual: brand_id nulo do usuário).
    const exQ = admin.from("action_plans").select("titulo, categoria, status, origem");
    const { data: existing } = brandId
      ? await exQ.eq("brand_id", brandId)
      : await exQ.eq("user_id", report.user_id).is("brand_id", null);

    const rows: Record<string, unknown>[] = [];
    const known = [...(existing ?? [])] as { titulo: string; categoria: string; status: string; origem: string }[];
    for (const t of targets) {
      const ai = llm.get(t.pillar);
      const draft = ai ?? fallbackAction(t);
      if (isDuplicate(t.categoria, draft.titulo, known)) continue;
      known.push({ titulo: draft.titulo, categoria: t.categoria, status: "pendente", origem: "automatico" });
      rows.push({
        user_id: report.user_id,
        brand_id: brandId,
        audit_report_id: auditReportId,
        catalog_id: null,
        origem: "automatico",
        categoria: t.categoria,
        prioridade: t.prioridade,
        titulo: draft.titulo,
        descricao: draft.descricao,
        impacto_estimado: draft.impacto_estimado,
        geracao: ai ? "ia" : "fallback",
      });
    }
    if (rows.length) {
      const { error } = await admin.from("action_plans").insert(rows);
      if (error) throw error;
    }
    const paths = [...new Set(rows.map((r) => r.geracao))].join("+") || null;
    await finish({ status: "concluido", caminho: paths, acoes_criadas: rows.length, detalhe: llmError });
    return json({ status: "ok", created: rows.length, path: paths });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await finish({ status: "erro", detalhe: msg.slice(0, 500) });
    return json({ error: "generation_failed" }, 500);
  }
});
