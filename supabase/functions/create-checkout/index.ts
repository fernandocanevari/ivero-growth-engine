import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ASAAS_BASE_URL = "https://sandbox.asaas.com/api/v3";

const PLAN_VALUES: Record<string, number> = {
  presenca: 397,
  influencia: 717,
  autoridade: 1197,
};

interface CheckoutBody {
  plano: "presenca" | "influencia" | "autoridade";
  nome: string;
  email: string;
  cpfCnpj: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("create-checkout started");
    // 1. Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // 2. Parse + validate body
    const body = (await req.json()) as CheckoutBody;
    const { plano, nome, email, cpfCnpj } = body || ({} as CheckoutBody);
    console.log("create-checkout body:", JSON.stringify({ plano, nome, email }));

    if (!plano || !PLAN_VALUES[plano]) {
      return new Response(
        JSON.stringify({ error: "Plano inválido. Use: presenca, influencia ou autoridade." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!nome || !email || !cpfCnpj) {
      return new Response(
        JSON.stringify({ error: "nome, email e cpfCnpj são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Asaas credentials
    const asaasKey = Deno.env.get("ASAAS_API_KEY_SANDBOX");
    if (!asaasKey) {
      return new Response(
        JSON.stringify({ error: "ASAAS_API_KEY_SANDBOX não configurada." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const asaasHeaders = {
      "Content-Type": "application/json",
      "access_token": Deno.env.get("ASAAS_API_KEY_SANDBOX")!,
    };

    // 4. Create customer
    const customerRes = await fetch(`${ASAAS_BASE_URL}/customers`, {
      method: "POST",
      headers: asaasHeaders,
      body: JSON.stringify({ name: nome, email, cpfCnpj }),
    });
    const customerJson = await customerRes.json();
    console.log("create-checkout asaas customer response:", JSON.stringify(customerJson));
    if (!customerRes.ok || !customerJson?.id) {
      console.error("create-checkout asaas customer error:", customerJson);
      const msg =
        customerJson?.errors?.[0]?.description ||
        customerJson?.message ||
        "Erro ao criar cliente no Asaas.";
      return new Response(JSON.stringify({ error: msg, details: customerJson }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const asaas_customer_id: string = customerJson.id;

    // 5. Create subscription — first charge after 7-day trial
    const today = new Date();
    const trialEndsAt = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextDueDate = trialEndsAt.toISOString().slice(0, 10);
    const value = PLAN_VALUES[plano];

    const subRes = await fetch(`${ASAAS_BASE_URL}/subscriptions`, {
      method: "POST",
      headers: asaasHeaders,
      body: JSON.stringify({
        customer: asaas_customer_id,
        billingType: "UNDEFINED",
        cycle: "MONTHLY",
        value,
        nextDueDate,
        description: `Ivero — Plano ${plano}`,
        redirectUrl: "https://ivero.com.br/bem-vindo",
      }),
    });
    const subJson = await subRes.json();
    console.log("create-checkout asaas subscription response:", JSON.stringify(subJson));
    if (!subRes.ok || !subJson?.id) {
      console.error("create-checkout asaas subscription error:", subJson);
      const msg =
        subJson?.errors?.[0]?.description ||
        subJson?.message ||
        "Erro ao criar assinatura no Asaas.";
      return new Response(JSON.stringify({ error: msg, details: subJson }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const asaas_subscription_id: string = subJson.id;

    // 5b. Fetch first payment (cobrança) generated for this subscription
    let checkoutUrl: string =
      subJson.invoiceUrl || subJson.bankSlipUrl || subJson.paymentLink || "";
    try {
      const paymentsRes = await fetch(
        `${ASAAS_BASE_URL}/payments?subscription=${asaas_subscription_id}`,
        { method: "GET", headers: asaasHeaders },
      );
      const paymentsData = await paymentsRes.json();
      console.log("create-checkout payments response:", JSON.stringify(paymentsData));
      const firstPayment = paymentsData?.data?.[0];
      if (firstPayment?.invoiceUrl) {
        checkoutUrl = firstPayment.invoiceUrl;
      }
    } catch (paymentsErr) {
      console.error("create-checkout payments fetch error:", paymentsErr);
    }
    if (!checkoutUrl) {
      checkoutUrl = `https://sandbox.asaas.com/i/${asaas_subscription_id}`;
    }

    // 6. Persist in assinaturas (service role to bypass RLS for insert)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const dataInicio = new Date();
    const dataVencimento = new Date(dataInicio.getTime() + 30 * 24 * 60 * 60 * 1000);

    const { error: insertError } = await supabaseAdmin.from("assinaturas").insert({
      user_id: userId,
      asaas_customer_id,
      asaas_subscription_id,
      plano,
      status: "trial",
      data_inicio: dataInicio.toISOString(),
      data_vencimento: dataVencimento.toISOString(),
      trial_ends_at: trialEndsAt.toISOString(),
    });

    if (insertError) {
      console.error("create-checkout insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Falha ao registrar assinatura.", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 7. Return checkout URL
    return new Response(JSON.stringify({ success: true, checkoutUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-checkout error:", err instanceof Error ? err.message : String(err));
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Erro inesperado." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
