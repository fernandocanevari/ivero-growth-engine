// P24b — reconcile-asaas nunca reativa cliente em atraso e nunca usa como
// prova um pagamento já contabilizado. Sem rede real: Supabase e Asaas simulados.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { evaluateCheckoutPayments, evaluateSubscriptionPayments } from "../_shared/reconcile-decision.ts";

let handler: ((req: Request) => Promise<Response>) | undefined;
const originalServe = Deno.serve;
const originalFetch = globalThis.fetch;
const originalGet = Deno.env.get;
const ENV: Record<string, string> = {
  SUPABASE_URL: "https://db.example.test", SUPABASE_ANON_KEY: "fake-anon", SUPABASE_SERVICE_ROLE_KEY: "fake-service",
  ASAAS_ENV: "sandbox", ASAAS_API_KEY_SANDBOX: "fake-asaas",
};
Deno.env.get = (k: string) => ENV[k];
Deno.serve = ((h: (req: Request) => Promise<Response>) => { handler = h; return {} as ReturnType<typeof Deno.serve>; }) as typeof Deno.serve;
await import("./index.ts");
Deno.serve = originalServe;
Deno.env.get = originalGet;

const UID = "11111111-2222-3333-4444-555555555555";
const CK = "ck_test";
const memory = {
  row: null as Record<string, unknown> | null,
  asaasCalls: [] as string[],
  writes: [] as string[],
  payments: [] as Record<string, unknown>[],
};

function b64url(o: unknown) { return btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_"); }
const TOKEN = `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({ sub: UID, role: "authenticated", exp: 4102444800 })}.sig`;

async function run(): Promise<{ status: number; body: Record<string, unknown> }> {
  globalThis.fetch = async (input, init) => {
    const req = input instanceof Request ? input : new Request(input, init);
    const url = new URL(req.url);
    const method = req.method;
    if (url.hostname === "sandbox.asaas.com") {
      memory.asaasCalls.push(`${method} ${url.pathname}${url.search}`);
      if (method !== "GET") throw new Error("asaas_write_forbidden");
      if (url.pathname.endsWith("/payments")) {
        return Response.json({ data: memory.payments, hasMore: false });
      }
      return Response.json({ data: [], hasMore: false });
    }
    if (url.hostname !== "db.example.test") throw new Error(`unexpected_network:${url.href}`);
    if (url.pathname.startsWith("/auth/v1/user")) return Response.json({ id: UID, aud: "authenticated", role: "authenticated" });
    const table = url.pathname.split("/").pop();
    if (method !== "GET" && method !== "HEAD") memory.writes.push(`${method} ${table}`);
    if (table === "assinaturas") {
      if (method === "GET") return memory.row ? Response.json(memory.row) : new Response(null, { status: 406 });
      if (memory.row) Object.assign(memory.row, await req.json());
      return new Response(null, { status: 204 });
    }
    if (table === "record_checkout_payment") {
      const d = await req.json();
      const r = memory.row!;
      const counted = (r.counted_payment_ids as string[]) ?? [];
      if (!counted.includes(d._payment_id)) { r.counted_payment_ids = [...counted, d._payment_id]; r.ciclos_pagos = Number(r.ciclos_pagos ?? 0) + 1; }
      return Response.json(r.ciclos_pagos);
    }
    if (table === "agency_brands" || table === "profiles") return Response.json([]);
    throw new Error(`unexpected_table:${table}`);
  };
  try {
    const res = await handler!(new Request("https://fn.example.test", { method: "POST", headers: { Authorization: `Bearer ${TOKEN}` } }));
    return { status: res.status, body: await res.json() };
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function reset(row: Record<string, unknown>, payments: Record<string, unknown>[] = []) {
  memory.row = { id: "row_1", user_id: UID, plano: "presenca", plano_pretendido: null, ciclo_pretendido: null, ciclos_pagos: 2,
    asaas_checkout_id: CK, asaas_checkout_created_at: "2026-08-20T12:00:00Z", asaas_subscription_id: "sub_1", asaas_customer_id: "cus_1",
    trial_ends_at: null, checkout_context: null, counted_payment_ids: ["pay_m1", "pay_m2"], carencia_ate: "2026-10-24T02:59:59.999Z",
    data_vencimento: "2026-10-20T12:00:00Z", ...row };
  memory.payments = payments;
  memory.asaasCalls.length = 0;
  memory.writes.length = 0;
}
const oldPaid = { id: "pay_m1", status: "CONFIRMED", checkoutSession: CK, subscription: "sub_1", customer: "cus_1", confirmedDate: "2026-08-20" };

for (const status of ["inadimplente", "atrasado"]) {
  Deno.test({ name: `(a) ${status} + pagamento antigo CONFIRMED → reconciled:false, nenhuma chamada ao Asaas, nenhuma gravação`, sanitizeOps: false, sanitizeResources: false, fn: async () => {
    reset({ status }, [oldPaid]);
    const before = JSON.stringify(memory.row);
    const r = await run();
    assertEquals(r.status, 200);
    assertEquals(r.body, { reconciled: false, status, reason: "overdue_requires_webhook" });
    assertEquals(memory.asaasCalls, []);
    assertEquals(memory.writes, []);
    assertEquals(JSON.stringify(memory.row), before);
  } });
}

Deno.test("(b) pagamento já em counted_payment_ids não serve de prova (checkout e assinatura)", () => {
  const at = "2026-08-20T12:00:00Z";
  assertEquals(evaluateCheckoutPayments(CK, at, [oldPaid], ["pay_m1"]).outcome, "link");
  assertEquals(evaluateSubscriptionPayments("sub_1", at, [oldPaid], ["pay_m1"]).outcome, "none");
  // Pagamento novo, não contabilizado, continua ativando.
  const fresh = { ...oldPaid, id: "pay_new" };
  assertEquals(evaluateCheckoutPayments(CK, at, [oldPaid, fresh], ["pay_m1"]).outcome, "activate");
  assertEquals(evaluateSubscriptionPayments("sub_1", at, [oldPaid, fresh], ["pay_m1"]).outcome, "activate");
  // null/vazio = comportamento de antes.
  assertEquals(evaluateCheckoutPayments(CK, at, [oldPaid], null).outcome, "activate");
  assertEquals(evaluateCheckoutPayments(CK, at, [oldPaid], []).outcome, "activate");
  assertEquals(evaluateSubscriptionPayments("sub_1", at, [oldPaid]).outcome, "activate");
});

Deno.test({ name: "(b) handler: linha pendente cujo único pagamento já foi contado não é ativada", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  reset({ status: "pendente", carencia_ate: null, asaas_checkout_created_at: new Date().toISOString() }, [{ ...oldPaid, confirmedDate: new Date().toISOString().slice(0, 10) }]);
  const r = await run();
  assertEquals(r.body.reconciled, false);
  assertEquals(memory.row!.status, "pendente");
  assertEquals(memory.row!.ciclos_pagos, 2);
} });

Deno.test({ name: "(c) regressão: pendente com pagamento novo confirmado do checkout ativa como antes", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const today = new Date().toISOString();
  reset({ status: "pendente", carencia_ate: null, counted_payment_ids: [], ciclos_pagos: 0, plano_pretendido: "influencia", ciclo_pretendido: "mensal", asaas_checkout_created_at: today },
    [{ ...oldPaid, id: "pay_new", confirmedDate: today.slice(0, 10) }]);
  const r = await run();
  assertEquals(r.body, { reconciled: true, status: "ativo" });
  assertEquals(memory.row!.status, "ativo");
  assertEquals(memory.row!.plano, "influencia");
  assertEquals(memory.row!.ciclos_pagos, 1);
  assertEquals(memory.row!.counted_payment_ids, ["pay_new"]);
  assert(memory.asaasCalls.every((c) => c.startsWith("GET ")));
} });

for (const status of ["trial", "expirado"]) {
  Deno.test({ name: `(c) regressão: ${status} com checkout abandonado (>1h, sem cobranças) é restaurado como antes`, sanitizeOps: false, sanitizeResources: false, fn: async () => {
    const prevEnd = new Date(Date.now() + 3 * 86400000).toISOString();
    reset({ status, carencia_ate: null, counted_payment_ids: [], asaas_customer_id: null, asaas_subscription_id: null,
      asaas_checkout_created_at: new Date(Date.now() - 2 * 3600000).toISOString(), trial_ends_at: prevEnd,
      checkout_context: { prev: { status, trial_ends_at: prevEnd, plano: "presenca" }, requested: { value: 497, cycle: "MONTHLY" } } }, []);
    const r = await run();
    assertEquals(r.body.expired, true);
    assertEquals(memory.row!.asaas_checkout_id, null);
    assert(memory.writes.includes("PATCH assinaturas"));
  } });
}
