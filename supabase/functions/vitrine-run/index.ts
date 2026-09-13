// =====================================================================
// vitrine-run — executa UMA pergunta de compra nos 3 motores com busca
// =====================================================================
// Isolado do simulate-ai: nenhum score de pilar é calculado aqui.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  runAllEngines,
  marcaCitada,
  isMarcaDoCliente,
  normalizeDomain,
  type QueryContext,
} from "../_shared/vitrine-engines.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Teto de segurança de custo: consultas por conta por dia.
const MAX_RUNS_PER_DAY = 30;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Não autenticado" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    const user = userData?.user;
    if (userErr || !user) return json({ error: "Não autenticado" }, 401);

    const body = await req.json().catch(() => ({}));
    const queryId = typeof body.query_id === "string" ? body.query_id : null;
    if (!queryId) return json({ error: "query_id é obrigatório" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: query, error: qErr } = await admin
      .from("vitrine_queries")
      .select("*")
      .eq("id", queryId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (qErr) return json({ error: qErr.message }, 500);
    if (!query) return json({ error: "Pergunta não encontrada" }, 404);

    // Teto diário por conta.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("vitrine_runs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("executado_em", since);
    if ((count ?? 0) >= MAX_RUNS_PER_DAY) {
      return json({ error: "limite_diario", message: "Limite diário de consultas atingido. Tente novamente amanhã." }, 429);
    }

    const { data: brand } = await admin
      .from("brand_settings")
      .select("brand_name, website, coverage_city, coverage_state, coverage_type")
      .eq("user_id", user.id)
      .maybeSingle();

    const marcaDominio = brand?.website
      ? normalizeDomain(brand.website.startsWith("http") ? brand.website : `https://${brand.website}`)
      : null;

    const ctx: QueryContext = {
      pergunta: query.pergunta,
      pais: query.pais || "BR",
      idioma: query.idioma || "pt-BR",
      regiao:
        query.regiao ||
        (brand?.coverage_type === "regional" && brand?.coverage_city
          ? `${brand.coverage_city}/${brand.coverage_state ?? ""}`.replace(/\/$/, "")
          : null),
      marcaNome: brand?.brand_name ?? null,
      marcaDominio,
    };

    const results = await runAllEngines(ctx);

    const inserted: Array<{ engine: string; status: string; citacoes: number; erro: string | null }> = [];

    for (const r of results) {
      const { data: run, error: runErr } = await admin
        .from("vitrine_runs")
        .insert({
          user_id: user.id,
          query_id: query.id,
          engine: r.engine,
          status: r.status,
          resposta_texto: r.resposta_texto,
          dominios: r.citations.map((c) => c.dominio),
          marca_citada: marcaCitada(r, ctx),
          custo_usd: r.custo_usd,
          duracao_ms: r.duracao_ms,
          erro_msg: r.erro_msg,
        })
        .select("id")
        .single();

      if (runErr || !run) {
        console.error("vitrine-run insert falhou:", runErr?.message);
        continue;
      }

      if (r.citations.length > 0) {
        const rows = r.citations.map((c) => ({
          user_id: user.id,
          run_id: run.id,
          query_id: query.id,
          engine: r.engine,
          dominio: c.dominio,
          loja_nome: c.loja_nome,
          produto_nome: c.produto_nome,
          preco_texto: c.preco_texto,
          url: c.url,
          url_mascarada: c.url_mascarada,
          tipo_fonte: c.tipo_fonte,
          is_marca_do_cliente: isMarcaDoCliente(c.dominio, ctx),
          posicao: c.posicao,
        }));
        const { error: cErr } = await admin.from("vitrine_citations").insert(rows);
        if (cErr) console.error("vitrine_citations insert falhou:", cErr.message);
      }

      inserted.push({
        engine: r.engine,
        status: r.status,
        citacoes: r.citations.length,
        erro: r.erro_msg,
      });
    }

    const proxima = new Date();
    proxima.setDate(proxima.getDate() + (query.frequencia === "mensal" ? 30 : 7));
    await admin
      .from("vitrine_queries")
      .update({ last_run_at: new Date().toISOString(), next_run_at: proxima.toISOString() })
      .eq("id", query.id);

    return json({ ok: true, resultados: inserted });
  } catch (e) {
    console.error("vitrine-run erro:", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
