import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ASAAS_BASE_URL = "https://sandbox.asaas.com/api/v3";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * reconcile-asaas — rede de segurança para quando o webhook do Asaas não chega.
 *
 * Consulta o Asaas diretamente (Checkout Session salva em
 * assinaturas.asaas_checkout_id e, como reforço, assinaturas por
 * externalReference = user_id). Se o pagamento já foi processado lá,
 * libera o acesso local (status='ativo') e grava os IDs do Asaas.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(401, { error: "Unauthorized" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json(401, { error: "Unauthorized" });
    const userId = claimsData.claims.sub as string;

    const asaasKey = Deno.env.get("ASAAS_API_KEY_SANDBOX");
    if (!asaasKey) return json(500, { error: "ASAAS_API_KEY_SANDBOX não configurada." });
    const asaasHeaders = { "Content-Type": "application/json", "access_token": asaasKey };

    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });

    const LIVE_STATUSES = ["ativo", "trial", "pendente", "inadimplente", "atrasado"];
    const { data: row } = await supabase
      .from("assinaturas")
      .select("id, status, plano, asaas_checkout_id, asaas_subscription_id, asaas_customer_id")
      .eq("user_id", userId)
      .in("status", LIVE_STATUSES)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) return json(200, { reconciled: false, reason: "no_subscription" });
    if (row.status === "ativo") return json(200, { reconciled: false, status: "ativo" });

    let paid = false;
    let subscriptionId: string = (row.asaas_subscription_id as string) ?? "";
    let customerId: string = (row.asaas_customer_id as string) ?? "";
    let checkoutStatus = "";

    // 1) Checkout Session
    if (row.asaas_checkout_id) {
      const res = await fetch(`${ASAAS_BASE_URL}/checkouts/${row.asaas_checkout_id}`, {
        headers: asaasHeaders,
      });
      const text = await res.text();
      let data: Record<string, any> | null = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch { /* ignore */ }
      checkoutStatus = data?.status ?? "";
      console.log("[reconcile-asaas] checkout", row.asaas_checkout_id, res.status, checkoutStatus);
      if (["PAID", "ACTIVE", "RECEIVED", "CONFIRMED"].includes(checkoutStatus)) paid = true;
      const sub = data?.subscription;
      subscriptionId = (typeof sub === "string" ? sub : sub?.id) || subscriptionId;
      const cus = data?.customer;
      customerId = (typeof cus === "string" ? cus : cus?.id) || customerId;
    }

    // 2) Reforço: assinaturas do Asaas por externalReference (user_id)
    if (!paid) {
      const res = await fetch(
        `${ASAAS_BASE_URL}/subscriptions?externalReference=${encodeURIComponent(userId)}`,
        { headers: asaasHeaders },
      );
      const text = await res.text();
      let data: Record<string, any> | null = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch { /* ignore */ }
      const sub = data?.data?.[0];
      console.log("[reconcile-asaas] subscriptions lookup", res.status, sub?.id, sub?.status);
      if (sub?.id) {
        subscriptionId = sub.id;
        customerId = sub.customer || customerId;
        if (sub.status === "ACTIVE") {
          // Confirma se há pagamento efetivamente recebido/confirmado.
          const payRes = await fetch(
            `${ASAAS_BASE_URL}/payments?subscription=${sub.id}&limit=10`,
            { headers: asaasHeaders },
          );
          const payText = await payRes.text();
          let payJson: Record<string, any> | null = null;
          try {
            payJson = payText ? JSON.parse(payText) : null;
          } catch { /* ignore */ }
          paid = (payJson?.data ?? []).some((p: Record<string, any>) =>
            ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(p?.status)
          );
        }
      }
    }

    if (!paid) {
      // Mesmo sem pagamento, aproveitamos para gravar os IDs já conhecidos.
      if (subscriptionId || customerId) {
        await supabase
          .from("assinaturas")
          .update({
            ...(subscriptionId ? { asaas_subscription_id: subscriptionId } : {}),
            ...(customerId ? { asaas_customer_id: customerId } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);
      }
      return json(200, { reconciled: false, status: row.status, checkoutStatus });
    }

    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + 30);
    const { error } = await supabase
      .from("assinaturas")
      .update({
        status: "ativo",
        carencia_ate: null,
        trial_ends_at: null,
        data_vencimento: nextDue.toISOString(),
        ...(subscriptionId ? { asaas_subscription_id: subscriptionId } : {}),
        ...(customerId ? { asaas_customer_id: customerId } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (error) {
      console.error("[reconcile-asaas] update error:", error);
      return json(500, { error: error.message });
    }

    console.log("[reconcile-asaas] assinatura liberada via reconciliação:", row.id);
    return json(200, { reconciled: true, status: "ativo" });
  } catch (err) {
    console.error("[reconcile-asaas] unexpected error:", err);
    return json(500, { error: (err as Error).message });
  }
});
