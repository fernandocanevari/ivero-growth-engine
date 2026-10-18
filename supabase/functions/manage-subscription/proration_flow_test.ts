import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

// Real entrypoints, intercepted HTTP only: no provider/database request can escape.
const handlers: Record<string, (req: Request) => Promise<Response>> = {};
const originalServe = Deno.serve;
for (const name of ["manage-subscription", "agency-manage-brand"]) {
  Object.defineProperty(Deno, "serve", { configurable: true, value: (handler: (req: Request) => Promise<Response>) => { handlers[name] = handler; } });
  await import(`../${name}/index.ts`);
}
Object.defineProperty(Deno, "serve", { configurable: true, value: originalServe });

async function run(name: string, options: { due?: string; account?: string; duplicate?: boolean; lookupFail?: boolean; noNextDue?: boolean } = {}) {
  const originalFetch = globalThis.fetch;
  const originalSetInterval = globalThis.setInterval;
  const intervals: number[] = [];
  globalThis.setInterval = ((...args: Parameters<typeof setInterval>) => {
    const id = originalSetInterval(...args);
    intervals.push(id);
    return id;
  }) as typeof setInterval;
  const envNames = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "ASAAS_API_KEY_SANDBOX", "ASAAS_ENV"];
  const previous = envNames.map((key) => Deno.env.get(key));
  const values = ["https://database.invalid", "test-anon", "test-service", "test-provider", "sandbox"];
  envNames.forEach((key, i) => Deno.env.set(key, values[i]));
  const calls: { url: string; method: string; body: any }[] = [];
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (...args) => logs.push(args.join(" "));
  const subscription = { id: "local-sub", plano: "presenca", status: "ativo", asaas_subscription_id: "sub_test", asaas_customer_id: "cus_test", ciclo_contratado: "mensal", ciclos_pagos: 1 };
  const brandId = "11111111-1111-4111-8111-111111111111";
  globalThis.fetch = async (input, init) => {
    const req = new Request(input, init);
    const url = new URL(req.url);
    const body = req.method === "POST" || req.method === "PUT" || req.method === "PATCH" ? await req.json() : null;
    calls.push({ url: req.url, method: req.method, body });
    let data: unknown;
    let status = 200;
    if (url.hostname === "database.invalid") {
      if (url.pathname === "/auth/v1/user") data = { id: "test-user", aud: "authenticated", role: "authenticated" };
      else if (req.method === "PATCH") data = null;
      else if (url.pathname === "/rest/v1/profiles") data = { account_type: options.account ?? (name === "agency-manage-brand" ? "agency" : "individual") };
      else if (url.pathname === "/rest/v1/assinaturas") data = subscription;
      else if (url.pathname === "/rest/v1/agency_brands") data = [
        { id: "existing", brand_id: "22222222-2222-4222-8222-222222222222", plano: "presenca", status: "ativo" },
        { id: "new", brand_id: brandId, plano: null, status: "rascunho" },
      ];
      else throw new Error(`Unexpected mocked database path: ${url.pathname}`);
    } else if (url.hostname === "sandbox.asaas.com") {
      if (url.pathname.endsWith("/subscriptions/sub_test")) data = { value: 497, cycle: "MONTHLY", customer: "cus_test", nextDueDate: options.noNextDue ? null : "2099-11-17" };
      else if (url.pathname.endsWith("/subscriptions/sub_test/payments")) data = { data: [{ status: "PENDING", dueDate: options.due ?? "2099-11-17" }], hasMore: false };
      else if (url.pathname === "/api/v3/payments" && req.method === "GET") {
        status = options.lookupFail ? 503 : 200;
        data = { data: options.duplicate ? [{ externalReference: url.searchParams.get("externalReference"), customer: "cus_test", value: name === "agency-manage-brand" ? 497 : 400, status: "PENDING", invoiceUrl: "https://invoice.invalid/existing" }] : [] };
      } else if (url.pathname === "/api/v3/payments" && req.method === "POST") data = { invoiceUrl: "https://invoice.invalid/new" };
      else throw new Error(`Unexpected mocked provider path: ${url.pathname}`);
    } else throw new Error("Network escape forbidden");
    return new Response(data === null ? null : JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
  };
  try {
    const token = `${btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${btoa(JSON.stringify({ sub: "test-user", exp: 4102444800 }))}.c2ln`;
    const handler = handlers[name];
    assert(handler);
    const response = await handler(new Request("https://function.invalid", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(name === "agency-manage-brand" ? { action: "add_brand", brand_id: brandId, plano: "presenca" } : { action: "change_plan", plano: "influencia" }) }));
    return { status: response.status, data: await response.json(), calls, logs };
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.setInterval = originalSetInterval;
    intervals.forEach((id) => clearInterval(id));
    console.log = originalLog;
    envNames.forEach((key, i) => { const value = previous[i]; if (value === undefined) Deno.env.delete(key); else Deno.env.set(key, value); });
  }
}

for (const name of ["manage-subscription", "agency-manage-brand"]) {
  Deno.test(`${name}: future pending permits invoice and immediate local update`, async () => {
    const result = await run(name);
    assertEquals(result.status, 200);
    assertEquals(result.data.proRata.value, name === "agency-manage-brand" ? 497 : 400);
    assertEquals(result.data.proRata.invoiceUrl, "https://invoice.invalid/new");
    assertEquals(result.calls.filter((c) => c.method === "POST" && c.url.includes("/api/v3/payments")).length, 1);
    assert(result.calls.some((c) => c.method === "PATCH" && c.url.includes("/rest/v1/assinaturas")));
  });
  Deno.test(`${name}: current open invoice suppresses proration`, async () => {
    const result = await run(name, { due: "2000-01-01" });
    assertEquals(result.status, 200);
    assertEquals(result.data.proRata, null);
    assertEquals(result.calls.filter((c) => c.method === "POST" && c.url.includes("/api/v3/payments")).length, 0);
  });
  Deno.test(`${name}: identical invoice reused without POST`, async () => {
    const result = await run(name, { duplicate: true });
    assertEquals(result.data.proRata.invoiceUrl, "https://invoice.invalid/existing");
    assertEquals(result.calls.filter((c) => c.method === "POST" && c.url.includes("/api/v3/payments")).length, 0);
  });
  Deno.test(`${name}: failed duplicate lookup preserves access without POST`, async () => {
    const result = await run(name, { lookupFail: true });
    assertEquals(result.status, 200);
    assertEquals(result.data.proRata, null);
    assert(result.logs.some((l) => l.includes('"invoiceStatus":"lookup_failed"')));
    assertEquals(result.calls.filter((c) => c.method === "POST" && c.url.includes("/api/v3/payments")).length, 0);
  });
  Deno.test(`${name}: absent next due explicitly logged`, async () => {
    const result = await run(name, { noNextDue: true });
    assertEquals(result.data.proRata, null);
    assert(result.logs.some((l) => l.includes('"reason":"no_next_due"')));
  });
}
Deno.test("manage-subscription: agency 409 guard preserved without provider calls", async () => {
  const result = await run("manage-subscription", { account: "agency" });
  assertEquals(result.status, 409);
  assertEquals(result.data.error, "agencia_usa_faturamento_consolidado");
  assertEquals(result.calls.filter((c) => c.url.includes("asaas.com")).length, 0);
});