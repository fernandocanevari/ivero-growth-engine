// Agência é só mensal: mesmo que o cliente envie ciclo "anual", o servidor cota
// no mensal e grava ciclo_contratado "mensal". Entrada real da função; todo
// HTTP é interceptado — nenhuma chamada sai para banco ou Asaas.
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { GoTrueClient } from "npm:@supabase/auth-js";

GoTrueClient.prototype.startAutoRefresh = async () => {};

const envNames = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "ASAAS_API_KEY_SANDBOX", "ASAAS_ENV"];
const envValues = ["https://database.invalid", "test-anon", "test-service", "test-provider", "sandbox"];
const previousEnv = envNames.map((key) => Deno.env.get(key));
envNames.forEach((key, i) => Deno.env.set(key, envValues[i]));

let handler: ((req: Request) => Promise<Response>) | null = null;
const originalServe = Deno.serve;
Object.defineProperty(Deno, "serve", { configurable: true, value: (h: (req: Request) => Promise<Response>) => { handler = h; } });
await import("./index.ts");
Object.defineProperty(Deno, "serve", { configurable: true, value: originalServe });

const BRANDS = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
];

async function run(body: Record<string, unknown>) {
  const originalFetch = globalThis.fetch;
  envNames.forEach((key, i) => Deno.env.set(key, envValues[i]));
  const calls: { url: string; method: string; body: any }[] = [];
  globalThis.fetch = async (input, init) => {
    const req = new Request(input, init);
    const url = new URL(req.url);
    const text = req.method === "GET" ? "" : await req.text();
    const parsed = text ? JSON.parse(text) : null;
    calls.push({ url: req.url, method: req.method, body: parsed });
    let data: unknown = null;
    if (url.hostname === "database.invalid") {
      if (url.pathname === "/auth/v1/user") data = { id: "agency-usr", aud: "authenticated", role: "authenticated" };
      else if (url.pathname.startsWith("/rest/v1/rpc/")) data = true;
      else if (url.pathname === "/rest/v1/profiles") data = { account_type: "agency" };
      else if (url.pathname === "/rest/v1/agency_brands") data = req.method === "GET" ? BRANDS.map((brand_id) => ({ brand_id })) : null;
      else if (url.pathname === "/rest/v1/assinaturas") data = req.method === "GET" ? [] : null;
      else throw new Error(`Unexpected mocked database path: ${url.pathname}`);
    } else if (url.hostname === "sandbox.asaas.com") {
      if (url.pathname === "/api/v3/checkouts" && req.method === "POST") data = { id: "chk_test", link: "https://checkout.invalid/chk_test" };
      else throw new Error(`Unexpected mocked provider path: ${url.pathname}`);
    } else throw new Error("Network escape forbidden");
    return new Response(data === null ? null : JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const b64url = (v: unknown) => btoa(JSON.stringify(v)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
    const token = `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({ sub: "agency-usr", exp: 4102444800 })}.c2ln`;
    assert(handler);
    const response = await handler!(new Request("https://function.invalid", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }));
    return { status: response.status, data: await response.json(), calls };
  } finally {
    globalThis.fetch = originalFetch;
  }
}

const agencyBody = (extra: Record<string, unknown>) => ({
  plano: "presenca", nome: "Agência Teste", email: "agencia@example.test",
  agency: { brands: BRANDS.map((brand_id) => ({ brand_id, plano: "presenca" })) },
  ...extra,
});

for (const extra of [{ ciclo: "anual" }, { billing_cycle: "annual" }]) {
  Deno.test(`agência enviando ${JSON.stringify(extra)} ainda é cotada e gravada no mensal`, async () => {
    const result = await run(agencyBody(extra));
    assertEquals(result.status, 200);
    // 3 × Presença mensal R$497 com 10% de volume = R$1.341,90 (anual seria R$1.071,90).
    assertEquals([result.data.agencyQuote.subtotal, result.data.agencyQuote.discountPct, result.data.agencyQuote.total], [1491, 10, 1341.9]);
    assertEquals(result.data.agencyQuote.items.map((i: { value: number }) => i.value), [497, 497, 497]);
    const checkout = result.calls.find((c) => c.method === "POST" && c.url.endsWith("/api/v3/checkouts"))!;
    assertEquals(checkout.body.items[0].value, 1341.9);
    const insert = result.calls.find((c) => c.method === "POST" && c.url.includes("/rest/v1/assinaturas"))!;
    const row = Array.isArray(insert.body) ? insert.body[0] : insert.body;
    assertEquals([row.ciclo_contratado, row.ciclo_pretendido], ["mensal", "mensal"]);
  });
}

Deno.test("restaura o ambiente do processo de teste", () => {
  envNames.forEach((key, i) => { const v = previousEnv[i]; if (v === undefined) Deno.env.delete(key); else Deno.env.set(key, v); });
});
