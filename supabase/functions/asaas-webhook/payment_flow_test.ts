import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

let handler: ((req: Request) => Promise<Response>) | undefined;
const originalServe = Deno.serve;
const originalFetch = globalThis.fetch;
const originalGet = Deno.env.get;
const memory = { row: {} as Record<string, unknown>, brand: {} as Record<string, unknown>, counted: new Set<string>() };

// No network or real secrets: handlers run with an in-memory Supabase transport.
Deno.env.get = (key: string) => ({ SUPABASE_URL: "https://payments.example.test", SUPABASE_SERVICE_ROLE_KEY: "fake-service", ASAAS_WEBHOOK_TOKEN: "fake-webhook" } as Record<string, string>)[key];
Deno.serve = ((h: (req: Request) => Promise<Response>) => { handler = h; return {} as ReturnType<typeof Deno.serve>; }) as typeof Deno.serve;
await import("./index.ts");
Deno.serve = originalServe;
Deno.env.get = originalGet;

const CK = "272a8eef-c864-415e-8f8e-94310f789fcd";
const UID = "ba97500d-53c6-426b-b5e6-7015bfcf4395";
const AT = "2026-10-17T00:32:11Z";

function reset(status: string, trial: string | null = null) {
  memory.row = { id: "row_test", user_id: UID, status, plano: "presenca", plano_pretendido: "presenca", ciclo_pretendido: "mensal", ciclo_contratado: "mensal", ciclos_pagos: 0, trial_ends_at: trial, asaas_subscription_id: null, asaas_checkout_id: CK, asaas_checkout_created_at: AT };
  memory.brand = { id: "brand_link", brand_id: "brand_test", plano: null, plano_pretendido: "presenca", status: "ativo" };
  memory.counted.clear();
}

async function event(body: Record<string, unknown>) {
  const h = handler;
  if (!h) throw new Error("handler_not_captured");
  globalThis.fetch = async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const url = new URL(request.url);
    if (url.hostname !== "payments.example.test") throw new Error("unexpected_network");
    const table = url.pathname.split("/").pop();
    const method = request.method;
    const data = method === "GET" ? null : await request.json();
    let out: unknown = null;
    if (table === "record_checkout_payment") {
      const id = data._payment_id;
      if (!memory.counted.has(id)) { memory.counted.add(id); memory.row.ciclos_pagos = Number(memory.row.ciclos_pagos ?? 0) + 1; }
      out = memory.row.ciclos_pagos;
    } else if (table === "assinaturas") {
      const sub = url.searchParams.get("asaas_subscription_id");
      const ck = url.searchParams.get("asaas_checkout_id");
      const matches = (!sub || sub === `eq.${memory.row.asaas_subscription_id}`) && (!ck || ck === `eq.${memory.row.asaas_checkout_id}`);
      if (method === "GET") out = matches ? memory.row : null;
      else if (matches) Object.assign(memory.row, data);
    } else if (table === "agency_brands") {
      if (method === "GET") out = [memory.brand];
      else Object.assign(memory.brand, data);
    } else throw new Error(`unexpected_table:${table}`);
    return new Response(out === null ? null : JSON.stringify(out), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  Deno.env.get = (key: string) => ({ SUPABASE_URL: "https://payments.example.test", SUPABASE_SERVICE_ROLE_KEY: "fake-service", ASAAS_WEBHOOK_TOKEN: "fake-webhook" } as Record<string, string>)[key];
  try {
    const result = await h(new Request("https://function.example.test", { method: "POST", headers: { "asaas-access-token": "fake-webhook", "Content-Type": "application/json" }, body: JSON.stringify(body) }));
    assertEquals(result.status, 200, JSON.stringify(await result.json()));
  } finally { globalThis.fetch = originalFetch; Deno.env.get = originalGet; }
}

Deno.test("handler: agência expirada, CHECKOUT_PAID → CONFIRMED no mesmo segundo ativa, conta 1 e promove Bimbo", async () => {
  reset("pendente");
  await event({ event: "CHECKOUT_PAID", checkout: { id: CK, subscription: "sub_new", customer: "cus_shared" } });
  assertEquals(memory.row.status, "pendente");
  assertEquals(memory.row.asaas_subscription_id, "sub_new");
  assertEquals(memory.brand.plano, null);
  const payment = { id: "pay_new", subscription: "sub_new", customer: "cus_shared", confirmedDate: "2026-10-16", externalReference: UID };
  await event({ event: "PAYMENT_CONFIRMED", payment });
  assertEquals(memory.row.status, "ativo");
  assertEquals(memory.row.ciclos_pagos, 1);
  assertEquals(memory.brand.plano, "presenca");
  assertEquals(memory.brand.plano_pretendido, null);
  await event({ event: "PAYMENT_RECEIVED", payment });
  assertEquals(memory.row.ciclos_pagos, 1);
});

Deno.test("handler: CHECKOUT_PAID com trial válido vincula, mantém trial e não promove marcas", async () => {
  reset("trial", "2099-10-24T12:00:00Z");
  await event({ event: "CHECKOUT_PAID", checkout: { id: CK, subscription: "sub_trial" } });
  assertEquals(memory.row.status, "trial");
  assertEquals(memory.row.trial_ends_at, "2099-10-24T12:00:00Z");
  assertEquals(memory.row.ciclos_pagos, 0);
  assertEquals(memory.brand.plano, null);
});