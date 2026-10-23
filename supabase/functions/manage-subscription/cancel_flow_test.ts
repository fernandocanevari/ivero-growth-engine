import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { GoTrueClient } from "npm:@supabase/auth-js";

// Disable SDK background refresh only in this isolated test process.
GoTrueClient.prototype.startAutoRefresh = async () => {};

// Real entrypoint, intercepted HTTP only: no provider/database request can escape.
// Run this file in its own `deno test` invocation (it captures Deno.serve).
let handler: ((req: Request) => Promise<Response>) | null = null;
const originalServe = Deno.serve;
Object.defineProperty(Deno, "serve", { configurable: true, value: (h: (req: Request) => Promise<Response>) => { handler = h; } });
await import("./index.ts");
Object.defineProperty(Deno, "serve", { configurable: true, value: originalServe });

const day = 86_400_000;
const inDays = (n: number) => new Date(Date.now() + n * day).toISOString();

async function cancel(row: Record<string, unknown>) {
  const originalFetch = globalThis.fetch;
  const envNames = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "ASAAS_API_KEY_SANDBOX", "ASAAS_ENV"];
  const previous = envNames.map((key) => Deno.env.get(key));
  const values = ["https://database.invalid", "test-anon", "test-service", "test-provider", "sandbox"];
  envNames.forEach((key, i) => Deno.env.set(key, values[i]));
  const calls: { url: string; method: string; body: any }[] = [];
  const originalLog = console.log;
  console.log = () => {};
  const assinatura = {
    id: "local-sub", plano: "presenca", status: "trial", asaas_subscription_id: "sub_test",
    asaas_customer_id: "cus_test", asaas_checkout_id: null, asaas_checkout_created_at: null,
    data_vencimento: inDays(28), trial_ends_at: inDays(5), ciclo_contratado: "mensal",
    ciclos_pagos: 0, counted_payment_ids: [], compromisso_inicio: null, compromisso_meses: 12,
    ...row,
  };
  globalThis.fetch = async (input, init) => {
    const req = new Request(input, init);
    const url = new URL(req.url);
    const body = ["POST", "PUT", "PATCH"].includes(req.method) ? await req.json() : null;
    calls.push({ url: req.url, method: req.method, body });
    let data: unknown = null;
    if (url.hostname === "database.invalid") {
      if (url.pathname === "/auth/v1/user") data = { id: "test-user", aud: "authenticated", role: "authenticated" };
      else if (req.method === "PATCH") data = null;
      else if (url.pathname === "/rest/v1/assinaturas") data = assinatura;
      else throw new Error(`Unexpected mocked database path: ${url.pathname}`);
    } else if (url.hostname === "sandbox.asaas.com") {
      if (url.pathname.endsWith("/subscriptions/sub_test") && req.method === "DELETE") data = { deleted: true, id: "sub_test" };
      else if (url.pathname === "/api/v3/payments" && req.method === "POST") data = { invoiceUrl: "https://invoice.invalid/multa" };
      else throw new Error(`Unexpected mocked provider path: ${req.method} ${url.pathname}`);
    } else throw new Error("Network escape forbidden");
    return new Response(data === null ? null : JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const token = `${btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${btoa(JSON.stringify({ sub: "test-user", exp: 4102444800 }))}.c2ln`;
    assert(handler);
    const response = await handler(new Request("https://function.invalid", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", motivo: "teste" }),
    }));
    const patch = calls.find((c) => c.method === "PATCH" && c.url.includes("/rest/v1/assinaturas"))?.body;
    const deleted = calls.some((c) => c.method === "DELETE" && c.url.endsWith("/subscriptions/sub_test"));
    const charges = calls.filter((c) => c.method === "POST" && c.url.includes("/api/v3/payments")).length;
    return { status: response.status, data: await response.json(), patch, deleted, charges };
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;
    envNames.forEach((key, i) => { const value = previous[i]; if (value === undefined) Deno.env.delete(key); else Deno.env.set(key, value); });
  }
}

Deno.test("cancel em trial com fim no futuro: data_vencimento = trial_ends_at, isTrial, sem multa, remove no Asaas", async () => {
  const trialEnd = inDays(5);
  const r = await cancel({ trial_ends_at: trialEnd, data_vencimento: inDays(28) });
  assertEquals(r.status, 200);
  assertEquals(r.patch.status, "cancelado");
  assertEquals(r.patch.data_vencimento, trialEnd);
  assertEquals(r.data.accessUntil, trialEnd);
  assertEquals(r.data.acessoAte, trialEnd);
  assertEquals(r.data.isTrial, true);
  assertEquals(r.data.endsNow, false);
  assertEquals(r.data.multa, null);
  assertEquals(r.charges, 0);
  assert(r.deleted, "remoção da assinatura no Asaas deve continuar");
});

Deno.test("cancel de assinatura paga: data_vencimento intacta, isTrial false (como hoje)", async () => {
  const due = inDays(20);
  const r = await cancel({ status: "ativo", trial_ends_at: null, data_vencimento: due, ciclos_pagos: 2, counted_payment_ids: ["pay_1", "pay_2"] });
  assertEquals(r.status, 200);
  assertEquals(r.patch.status, "cancelado");
  assertEquals("data_vencimento" in r.patch, false);
  assertEquals(r.data.acessoAte, due);
  assertEquals(r.data.accessUntil, due);
  assertEquals(r.data.isTrial, false);
  assert(r.deleted);
});

Deno.test("cancel em trial sem trial_ends_at: acesso termina agora", async () => {
  const before = Date.now();
  const r = await cancel({ trial_ends_at: null, data_vencimento: inDays(28) });
  assertEquals(r.data.isTrial, true);
  assertEquals(r.data.endsNow, true);
  const ms = new Date(r.patch.data_vencimento).getTime();
  assert(ms >= before && ms <= Date.now(), "data_vencimento deve ser agora");
  assertEquals(r.data.accessUntil, r.patch.data_vencimento);
});

Deno.test("cancel em trial já vencido: acesso termina agora", async () => {
  const before = Date.now();
  const r = await cancel({ trial_ends_at: inDays(-2), data_vencimento: inDays(28) });
  assertEquals(r.data.isTrial, true);
  assertEquals(r.data.endsNow, true);
  const ms = new Date(r.patch.data_vencimento).getTime();
  assert(ms >= before && ms <= Date.now());
});

Deno.test("trial em contrato anual (ciclosPagos 0): sem multa de fidelidade", async () => {
  const r = await cancel({ ciclo_contratado: "anual", ciclos_pagos: 0, compromisso_inicio: inDays(-2) });
  assertEquals(r.status, 200);
  assertEquals(r.data.ciclo, "anual");
  assertEquals(r.data.multa, null);
  assertEquals(r.charges, 0);
  assertEquals(r.data.isTrial, true);
});
