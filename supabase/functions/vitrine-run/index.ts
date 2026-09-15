// =====================================================================
// vitrine-run — executa UMA pergunta de compra nos 3 motores com busca
// =====================================================================
// Isolado do simulate-ai: nenhum score de pilar é calculado aqui.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { executeVitrineQuery, type VitrineQueryRow } from "../_shared/vitrine-execute.ts";
import { resolveVitrineQuota } from "../_shared/vitrine-quota.ts";

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

// Tetos de custo: agora vêm da cota do plano (ver _shared/vitrine-quota.ts).

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
      .select("id, user_id, pergunta, pais, idioma, regiao, frequencia")
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
      return json(
        { error: "limite_diario", message: "Limite diário de consultas atingido. Tente novamente amanhã." },
        429,
      );
    }

    const resultados = await executeVitrineQuery(admin, query as VitrineQueryRow);
    return json({ ok: true, resultados });
  } catch (e) {
    console.error("vitrine-run erro:", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
