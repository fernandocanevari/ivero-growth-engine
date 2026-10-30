// P26 — multa de cancelamento pendente bloqueia nova contratação. Entrada real
// da função; todo HTTP é interceptado. Rode em uma invocação própria de `deno test`.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
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

const DAY = 86_400_000;
const at = (ms: number) => new Date(Date.now() + ms).toISOString();
const REQ = { plano: "presenca", nome: "Cliente Teste", email: "cliente@example.test", ciclo: "mensal" };

async function run(rows: Record<string, unknown>[], accountType = "individual") {
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  console.log = () => {};
  envNames.forEach((key, i) => Deno.env.set(key, envValues[i]));
  const calls: { url: string; method: string }[] = [];
  globalThis.fetch = async (input, init) => {
    const req = new Request(input, init);
    const url = new URL(req.url);
    if (req.method !== "GET") await req.text();
    calls.push({ url: req.url, method: req.method });
    let data: unknown = null;
    if (url.hostname === "database.invalid") {
      if (url.pathname === "/auth/v1/user") data = { id: "user-1", aud: "authenticated", role: "authenticated" };
      else if (url.pathname.startsWith("/rest/v1/rpc/")) data = true;
      else if (url.pathname === "/rest/v1/profiles") data = [{ account_type: accountType }];
      else if (url.pathname === "/rest/v1/agency_brands") data = req.method === "GET" ? [] : null;
      else if (url.pathname === "/rest/v1/assinaturas") {
        if (req.method !== "GET") data = null;
        else if (url.searchParams.get("asaas_subscription_id") === "not.is.null") data = [];
        else data = rows;
      } else throw new Error(`Unexpected mocked database path: ${url.pathname}`);
    } else if (url.hostname === "sandbox.asaas.com") {
      if (url.pathname === "/api/v3/checkouts" && req.method === "POST") data = { id: "chk_new", link: "https://checkout.invalid/chk_new" };
      else if (/^\/api\/v3\/checkouts\/[^/]+\/cancel$/.test(url.pathname)) data = {};
      else throw new Error(`Unexpected mocked provider path: ${req.method} ${url.pathname}`);
    } else throw new Error("Network escape forbidden");
    return new Response(data === null ? null : JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const b64url = (v: unknown) => btoa(JSON.stringify(v)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
    const token = `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({ sub: "user-1", exp: 4102444800 })}.c2ln`;
    assert(handler);
    const response = await handler!(new Request("https://function.invalid", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(REQ),
    }));
    const checkoutCreated = calls.some((c) => c.method === "POST" && c.url.endsWith("/api/v3/checkouts"));
    const lockTaken = calls.some((c) => c.url.includes("/rpc/claim_checkout_creation"));
    return { status: response.status, data: await response.json(), checkoutCreated, lockTaken };
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;
  }
}

/** Assinatura anual paga e cancelada (sessão antiga concluída). */
function cancelledRow(extra: Record<string, unknown> = {}) {
  return {
    id: "row-1", user_id: "user-1", status: "cancelado", plano: "presenca", ciclo_contratado: "anual",
    trial_ends_at: null, data_vencimento: at(10 * DAY), data_inicio: at(-90 * DAY),
    ciclos_pagos: 3, counted_payment_ids: ["p1", "p2", "p3"], compromisso_inicio: at(-90 * DAY), compromisso_meses: 12,
    asaas_subscription_id: null, asaas_customer_id: "cus_1", asaas_checkout_id: "chk_paid", asaas_checkout_created_at: at(-90 * DAY),
    checkout_context: null,
    multa_pendente_valor: null, multa_pendente_ciclos: null, multa_pendente_payment_id: null,
    multa_pendente_invoice_url: null, multa_pendente_em: null, multa_ultimo_payment_id: null,
    ...extra,
  };
}
const MESSAGE = "Antes de assinar de novo, falta pagar a multa do cancelamento anterior: R$ 600,00.";

Deno.test("multa pendente (cobrança criada) → 200 multa_pendente, sem trava nem sessão de checkout", async () => {
  const r = await run([cancelledRow({ multa_pendente_valor: 600, multa_pendente_ciclos: 3, multa_pendente_payment_id: "pay_multa" })]);
  assertEquals(r.status, 200);
  assertEquals(r.data, { ok: false, reason: "multa_pendente", valor: 600, ciclos: 3, message: MESSAGE });
  assertEquals(r.checkoutCreated, false);
  assertEquals(r.lockTaken, false);
  assertEquals("checkoutUrl" in r.data, false, "o link vem de pay_penalty, nunca daqui");
});

Deno.test("multa pendente sem cobrança criada (payment_id nulo) → bloqueado", async () => {
  const r = await run([cancelledRow({ multa_pendente_valor: 600, multa_pendente_ciclos: 3 })]);
  assertEquals(r.data.reason, "multa_pendente");
  assertEquals(r.checkoutCreated, false);
});

Deno.test("multa em OUTRA linha do usuário (não a mais recente) também bloqueia", async () => {
  const r = await run([cancelledRow({ id: "row-2" }), cancelledRow({ multa_pendente_valor: 600, multa_pendente_ciclos: 3, multa_pendente_payment_id: "pay_multa" })]);
  assertEquals(r.data.reason, "multa_pendente");
});

Deno.test("multa paga/perdoada (colunas limpas, multa_ultimo_payment_id gravado) → checkout liberado", async () => {
  const r = await run([cancelledRow({ multa_ultimo_payment_id: "pay_multa" })]);
  assertEquals(r.status, 200, JSON.stringify(r.data));
  assertEquals(r.data.success, true);
  assert(r.checkoutCreated);
});

Deno.test("payment_id igual ao último tratado → não bloqueia", async () => {
  const r = await run([cancelledRow({ multa_pendente_valor: 600, multa_pendente_payment_id: "pay_multa", multa_ultimo_payment_id: "pay_multa" })]);
  assertEquals(r.data.success, true);
  assert(r.checkoutCreated);
});

Deno.test("linha antiga (cancelada antes da regra, sem dados de multa) → isenta, checkout liberado", async () => {
  const legacy = cancelledRow();
  for (const k of Object.keys(legacy)) if (k.startsWith("multa_")) delete (legacy as Record<string, unknown>)[k];
  const r = await run([legacy]);
  assertEquals(r.data.success, true);
  assert(r.checkoutCreated);
});

Deno.test("restaura o ambiente do processo de teste", () => {
  envNames.forEach((key, i) => {
    const value = previousEnv[i];
    if (value === undefined) Deno.env.delete(key);
    else Deno.env.set(key, value);
  });
});
