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

    // Cota do plano: rodadas nas últimas 24h e nos últimos 30 dias.
    const { tier, quota } = await resolveVitrineQuota(admin, user.id);
    if (quota.maxRodadasMes === 0) {
      return json(
        {
          error: "plano_sem_acesso",
          message: "A Vitrine IA está disponível a partir do plano Influência.",
        },
        403,
      );
    }

    const desde24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const desde30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [{ count: dia }, { count: mes }] = await Promise.all([
      admin
        .from("vitrine_runs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("executado_em", desde24h),
      admin
        .from("vitrine_runs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("executado_em", desde30d),
    ]);

    if ((dia ?? 0) >= quota.maxRodadasDia) {
      return json(
        {
          error: "limite_diario",
          message: `Limite de ${quota.maxRodadasDia} consultas por dia atingido no seu plano. Tente amanhã.`,
        },
        429,
      );
    }
    if ((mes ?? 0) >= quota.maxRodadasMes) {
      return json(
        {
          error: "limite_mensal",
          message: `Limite de ${quota.maxRodadasMes} consultas nos últimos 30 dias atingido no seu plano.`,
        },
        429,
      );
    }

    const resultados = await executeVitrineQuery(admin, query as VitrineQueryRow);
    const okCount = resultados.filter((r) => r.status === "ok").length;
    // Resiliência: a rodada só falha quando NENHUM motor respondeu.
    return json({
      ok: okCount > 0,
      tier,
      quota,
      motores_ok: okCount,
      resultados,
      ...(okCount === 0
        ? {
            error: "todos_os_motores_falharam",
            message: "Nenhum motor respondeu nesta rodada. Veja o detalhe por motor.",
          }
        : {}),
    });
  } catch (e) {
    console.error("vitrine-run erro:", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
