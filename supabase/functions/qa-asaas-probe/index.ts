import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

/**
 * qa-asaas-probe — FUNÇÃO TEMPORÁRIA DE QA (sandbox).
 *
 * Existe apenas para montar cenários de teste no Asaas sandbox (criar customer,
 * assinatura, confirmar cobrança em dinheiro) e validar `manage-subscription`
 * com chamadas reais. DEVE SER REMOVIDA depois dos testes.
 *
 * Proteção: exige o header `x-qa-token` igual ao ASAAS_WEBHOOK_TOKEN.
 */

const ASAAS_BASE_URL = "https://sandbox.asaas.com/api/v3";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const expected = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
  if (!expected || req.headers.get("x-qa-token") !== expected) {
    return json(401, { error: "Unauthorized" });
  }

  const body = (await req.json().catch(() => ({}))) as {
    path?: string;
    method?: string;
    payload?: unknown;
  };
  if (!body.path || !body.path.startsWith("/")) return json(400, { error: "path inválido" });

  const res = await fetch(`${ASAAS_BASE_URL}${body.path}`, {
    method: body.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      "access_token": Deno.env.get("ASAAS_API_KEY_SANDBOX") ?? "",
    },
    body: body.payload ? JSON.stringify(body.payload) : undefined,
  });
  const text = await res.text();
  return json(200, { status: res.status, body: text ? JSON.parse(text) : null });
});
