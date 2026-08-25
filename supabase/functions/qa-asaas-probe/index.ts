import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

/**
 * qa-asaas-probe — FUNÇÃO TEMPORÁRIA DE QA (sandbox).
 *
 * Existe apenas para montar cenários de teste no Asaas sandbox (criar customer,
 * assinatura, confirmar cobrança em dinheiro) e validar `manage-subscription`
 * com chamadas reais. DEVE SER REMOVIDA depois dos testes.
 *
 * Proteção: exige JWT válido de um usuário com role 'admin'.
 */

const ASAAS_BASE_URL = "https://sandbox.asaas.com/api/v3";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claims, error: claimsError } = await anon.auth.getClaims(
    authHeader.replace("Bearer ", ""),
  );
  if (claimsError || !claims?.claims) return json(401, { error: "Unauthorized" });

  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const { data: isAdmin } = await admin.rpc("has_role", {
    _user_id: claims.claims.sub as string,
    _role: "admin",
  });
  if (!isAdmin) return json(403, { error: "Forbidden" });

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
