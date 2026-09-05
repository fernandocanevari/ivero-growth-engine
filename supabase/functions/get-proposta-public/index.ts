import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");
    if (!slug) {
      return new Response(JSON.stringify({ error: "slug obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: proposta, error } = await supabase
      .from("propostas")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !proposta) {
      return new Response(JSON.stringify({ error: "Proposta não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const expired = new Date(proposta.expires_at) < now;
    let status = proposta.status;

    // Marca expirada se vencido
    if (expired && !["aceita", "recusada", "expirada"].includes(status)) {
      await supabase.from("propostas").update({ status: "expirada" }).eq("id", proposta.id);
      status = "expirada";
    }

    // Marca visualizada (primeira leitura)
    if (status === "enviada") {
      await supabase
        .from("propostas")
        .update({ status: "visualizada", viewed_at: now.toISOString() })
        .eq("id", proposta.id);
      status = "visualizada";
    }

    // Sanitiza: remove campos internos
    const publicProposta = {
      slug: proposta.slug,
      empresa_nome: proposta.empresa_nome,
      empresa_site: proposta.empresa_site,
      contato_nome: proposta.contato_nome,
      // Link secreto por slug: devolver e-mail/telefone permite pré-preencher o
      // cadastro (o lead já informou esses dados no preview).
      contato_email: proposta.contato_email,
      contato_telefone: proposta.contato_telefone,
      origem: proposta.origem,
      diagnostico_snapshot: proposta.diagnostico_snapshot,
      score_geral: proposta.score_geral,
      plano_sugerido: proposta.plano_sugerido,
      valor_proposto: proposta.valor_proposto,
      status,
      expires_at: proposta.expires_at,
      created_at: proposta.created_at,
    };

    return new Response(JSON.stringify(publicProposta), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[get-proposta-public] error", err);
    return new Response(JSON.stringify({ error: err?.message || "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
