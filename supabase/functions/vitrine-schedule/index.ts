// =====================================================================
// vitrine-schedule — dispara as perguntas vencidas da Vitrine IA
// =====================================================================
// Chamada por agendamento (cron). Não calcula nenhum score de pilar.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { executeVitrineQuery, type VitrineQueryRow } from "../_shared/vitrine-execute.ts";
import { resolveVitrineQuota } from "../_shared/vitrine-quota.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Tetos de segurança de custo.
const MAX_QUERIES_PER_RUN = 20;
const MAX_QUERIES_PER_USER_PER_RUN = 5;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    const { data: due, error } = await admin
      .from("vitrine_queries")
      .select("id, user_id, pergunta, pais, idioma, regiao, frequencia")
      .eq("ativo", true)
      .lte("next_run_at", new Date().toISOString())
      .order("next_run_at", { ascending: true })
      .limit(MAX_QUERIES_PER_RUN);

    if (error) return json({ error: error.message }, 500);
    if (!due || due.length === 0) return json({ ok: true, executadas: 0 });

    const porUsuario = new Map<string, number>();
    const quotaCache = new Map<string, { maxRodadasMes: number; usadas: number }>();
    const desde30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    let executadas = 0;
    let bloqueadasPorCota = 0;

    for (const q of due as VitrineQueryRow[]) {
      const usados = porUsuario.get(q.user_id) ?? 0;
      if (usados >= MAX_QUERIES_PER_USER_PER_RUN) continue;

      // Cota do plano (mensal). Uma rodada = 3 motores.
      let info = quotaCache.get(q.user_id);
      if (!info) {
        const { quota } = await resolveVitrineQuota(admin, q.user_id);
        const { count } = await admin
          .from("vitrine_runs")
          .select("id", { count: "exact", head: true })
          .eq("user_id", q.user_id)
          .gte("executado_em", desde30d);
        info = { maxRodadasMes: quota.maxRodadasMes, usadas: count ?? 0 };
        quotaCache.set(q.user_id, info);
      }
      if (info.usadas + 3 > info.maxRodadasMes) {
        bloqueadasPorCota++;
        continue;
      }

      porUsuario.set(q.user_id, usados + 1);
      try {
        await executeVitrineQuery(admin, q);
        info.usadas += 3;
        executadas++;
      } catch (e) {
        console.error("vitrine-schedule falhou para", q.id, e instanceof Error ? e.message : String(e));
      }
    }

    return json({ ok: true, executadas, pendentes: due.length, bloqueadasPorCota });

    return json({ ok: true, executadas, pendentes: due.length });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
