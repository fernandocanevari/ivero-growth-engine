import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

/**
 * Teste de integração do binding por externalReference.
 *
 * Só roda quando ASAAS_WEBHOOK_TOKEN, SUPABASE_URL e WEBHOOK_TEST_USER_ID
 * estiverem disponíveis no ambiente — caso contrário é ignorado.
 */
Deno.test("asaas-webhook vincula assinatura pelo externalReference", async () => {
  const token = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
  const baseUrl = Deno.env.get("SUPABASE_URL");
  const userId = Deno.env.get("WEBHOOK_TEST_USER_ID");
  if (!token || !baseUrl || !userId) {
    console.log("skip: env incompleto");
    return;
  }

  const res = await fetch(`${baseUrl}/functions/v1/asaas-webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "asaas-access-token": token },
    body: JSON.stringify({
      event: "PAYMENT_CONFIRMED",
      payment: {
        id: "pay_test_binding",
        subscription: "sub_test_binding",
        customer: "cus_test_binding",
        externalReference: userId,
      },
    }),
  });
  const body = await res.json();
  console.log("webhook response", res.status, JSON.stringify(body));
  assertEquals(res.status, 200);
});
