import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// FONTE CANÔNICA: src/lib/pricing-rules.ts (PLANOS[k].monthlyPrice / planoFromScore).
// 3 tiers apenas — "dominio" foi descontinuado.
const PLAN_PRICE: Record<string, number> = {
  presenca: 497,
  influencia: 897,
  autoridade: 1497,
};

function planoFromScore(score: number): string {
  if (score < 40) return "presenca";
  if (score < 60) return "influencia";
  return "autoridade";
}

function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      empresa_nome = "",
      empresa_site = "",
      contato_nome = null,
      contato_email = null,
      contato_telefone = null,
      origem = "preview",
      diagnostico_snapshot = {},
      score_geral = 0,
    } = body || {};

    if (typeof score_geral !== "number" || score_geral < 0 || score_geral > 100) {
      return new Response(JSON.stringify({ error: "score_geral inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const plano = planoFromScore(score_geral);
    const valor = PLAN_PRICE[plano];

    // Tenta inserir com slug único (até 5 tentativas)
    let slug = "";
    let proposta = null;
    let lastError: any = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      slug = generateSlug();
      const { data, error } = await supabase
        .from("propostas")
        .insert({
          slug,
          empresa_nome,
          empresa_site,
          contato_nome,
          contato_email,
          contato_telefone,
          origem,
          diagnostico_snapshot,
          score_geral: Math.round(score_geral),
          plano_sugerido: plano,
          valor_proposto: valor,
          status: "enviada",
        })
        .select()
        .single();
      if (!error) {
        proposta = data;
        break;
      }
      lastError = error;
      if (!String(error.message || "").toLowerCase().includes("duplicate")) break;
    }

    if (!proposta) {
      console.error("[gerar-proposta-from-preview] insert error", lastError);
      return new Response(JSON.stringify({ error: "Falha ao criar proposta", detail: lastError?.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ slug: proposta.slug, id: proposta.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[gerar-proposta-from-preview] error", err);
    return new Response(JSON.stringify({ error: err?.message || "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
