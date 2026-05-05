import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_ACOES = ["aceita", "recusada"];
const VALID_MOTIVOS = ["preco", "momento", "concorrente", "sem_fit", "sem_resposta", "outro"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { slug, acao, motivo_categoria = null, motivo_texto = null } = body || {};

    if (!slug || !VALID_ACOES.includes(acao)) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (motivo_categoria && !VALID_MOTIVOS.includes(motivo_categoria)) {
      return new Response(JSON.stringify({ error: "motivo_categoria inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: proposta, error: fetchErr } = await supabase
      .from("propostas")
      .select("id, status, expires_at")
      .eq("slug", slug)
      .maybeSingle();

    if (fetchErr || !proposta) {
      return new Response(JSON.stringify({ error: "Proposta não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(proposta.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Proposta expirada" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (["aceita", "recusada"].includes(proposta.status)) {
      return new Response(JSON.stringify({ error: "Proposta já respondida" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const update: any = {
      status: acao,
      responded_at: new Date().toISOString(),
    };
    if (acao === "recusada") {
      update.motivo_recusa_categoria = motivo_categoria;
      update.motivo_recusa_texto = motivo_texto ? String(motivo_texto).slice(0, 1000) : null;
    }

    const { error: updErr } = await supabase
      .from("propostas")
      .update(update)
      .eq("id", proposta.id);

    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, status: acao }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[responder-proposta] error", err);
    return new Response(JSON.stringify({ error: err?.message || "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
