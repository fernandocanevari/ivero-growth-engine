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
const EMAIL = "cliente@teste.com.br";
const OTHER_USER = "0f5b2b8e-8c55-4c39-9a3a-2a0f2f6f9d11";
const UNVERIFIED = "Não conseguimos confirmar o cancelamento agora e, por isso, nada foi alterado. Tente de novo em instantes.";

type Sub = { nextDueDate?: unknown; billingType?: string | null; id: string; customer: string; status: string; externalReference?: string; dateCreated?: string; deleted?: boolean; value?: number; cycle?: string };
interface Provider {
  lookupBody?: unknown;
  lookupNetworkDown?: boolean;
  /** Clientes do Asaas com o e-mail da conta (paginados de 1 em 1 no mock). */
  customers?: { id: string; email: string; cpfCnpj?: string }[];
  /** HTTP forçado no GET /subscriptions/{id}. */
  lookupStatus?: Record<string, number>;
  /** Simula queda de rede (timeout) em qualquer chamada ao Asaas. */
  networkDown?: boolean;
  subs?: Sub[];
  /** status HTTP forçado no DELETE de uma assinatura. */
  deleteStatus?: Record<string, number>;
  /** DELETE responde 200 mas a assinatura continua ACTIVE. */
  deleteIgnored?: Set<string>;
  /** HTTP forçado na busca de clientes. */
  customersStatus?: number;
  /** Cobranças da assinatura (GET /subscriptions/{id}/payments, filtra ?status=). */
  payments?: Record<string, unknown>[];
  /** INVOICE-HISTORY: cobranças por assinatura (sobrepõe `payments` para o id listado). */
  paymentsBySub?: Record<string, Record<string, unknown>[]>;
  /** INVOICE-HISTORY: cobranças do cliente (GET /payments?customer=). */
  customerPayments?: Record<string, unknown>[];
  /** INVOICE-HISTORY: HTTP forçado em GET /payments?customer=. */
  customerPaymentsStatus?: number;
}

async function call(action: string, row: Record<string, unknown>, provider: Provider = {}) {
  const originalFetch = globalThis.fetch;
  const envNames = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "ASAAS_API_KEY_SANDBOX", "ASAAS_ENV"];
  const previous = envNames.map((key) => Deno.env.get(key));
  const values = ["https://database.invalid", "test-anon", "test-service", "test-provider", "sandbox"];
  envNames.forEach((key, i) => Deno.env.set(key, values[i]));
  const calls: { url: string; method: string; body: any }[] = [];
  const originalLog = console.log;
  const originalError = console.error;
  console.log = () => {};
  const errors: string[] = [];
  console.error = (...args) => { errors.push(args.join(" ")); };
  const subs = (provider.subs ?? []).map((s) => ({ ...s }));
  const customers = provider.customers ?? [];
  const assinatura = {
    id: "local-sub", plano: "presenca", status: "trial", asaas_subscription_id: "sub_test", asaas_subscription_id_anterior: null,
    asaas_customer_id: "cus_test", asaas_checkout_id: null, asaas_checkout_created_at: null,
    data_vencimento: inDays(28), trial_ends_at: inDays(5), ciclo_contratado: "mensal",
    ciclos_pagos: 0, counted_payment_ids: [], compromisso_inicio: null, compromisso_meses: 12,
    ...row,
  };
  const page = <T>(list: T[], url: URL) => {
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const data = list.slice(offset, offset + 1); // página de 1 item: força paginação
    return { object: "list", hasMore: offset + 1 < list.length, totalCount: list.length, data };
  };
  globalThis.fetch = async (input, init) => {
    const req = new Request(input, init);
    const url = new URL(req.url);
    const body = ["POST", "PUT", "PATCH"].includes(req.method) ? await req.json() : null;
    calls.push({ url: req.url, method: req.method, body });
    let data: unknown = null;
    let status = 200;
    if (url.hostname === "database.invalid") {
      if (url.pathname === "/auth/v1/user") data = { id: "test-user", aud: "authenticated", role: "authenticated" };
      // PATCH com return=representation (gravação condicional) devolve a linha casada.
      else if (req.method === "PATCH") data = (req.headers.get("Prefer") ?? "").includes("return=representation") ? [{ id: assinatura.id }] : null;
      // boundElsewhereIn: nenhuma outra linha segura a assinatura.
      else if (url.pathname === "/rest/v1/assinaturas" && url.search.includes("neq.")) data = [];
      else if (url.pathname === "/rest/v1/assinaturas") data = assinatura;
      else if (url.pathname === "/rest/v1/profiles") data = { email: EMAIL };
      else throw new Error(`Unexpected mocked database path: ${url.pathname}`);
    } else if (url.hostname === "sandbox.asaas.com") {
      if (provider.networkDown) throw new TypeError("network timeout");
      const p = url.pathname.replace("/api/v3", "");
      const subMatch = p.match(/^\/subscriptions\/([^/]+)$/);
      if (subMatch && req.method === "GET" && provider.lookupNetworkDown) throw new TypeError("private-provider-details");
      const custMatch = p.match(/^\/customers\/([^/]+)$/);
      if (custMatch && req.method === "GET") {
        const c = customers.find((x) => x.id === decodeURIComponent(custMatch[1]));
        if (!c) { status = 404; data = { errors: [] }; } else data = c;
      } else if (p === "/payments" && req.method === "GET" && url.searchParams.has("customer") && (provider.customerPayments || provider.customerPaymentsStatus)) {
        if (provider.customerPaymentsStatus) { status = provider.customerPaymentsStatus; data = { errors: [] }; }
        else data = { object: "list", hasMore: false, data: (provider.customerPayments ?? []).filter((x) => x.customer === url.searchParams.get("customer")) };
      } else if (p === "/payments" && req.method === "GET") {
        // Cobrança recorrente real não traz checkoutSession: lista vazia.
        data = page([], url);
      } else if (p === "/customers" && req.method === "GET") {
        if (provider.customersStatus) { status = provider.customersStatus; data = { errors: [{ description: "boom" }] }; }
        else if (url.searchParams.has("cpfCnpj")) {
          const list = customers.filter((c) => c.cpfCnpj === url.searchParams.get("cpfCnpj"));
          data = { object: "list", hasMore: false, totalCount: list.length, data: list };
        }
        else data = page(customers.filter((c) => c.email === url.searchParams.get("email")), url);
      } else if (p === "/subscriptions" && req.method === "GET") {
        data = page(subs.filter((s) => s.customer === url.searchParams.get("customer") && !s.deleted), url);
      } else if (subMatch && req.method === "DELETE") {
        const id = decodeURIComponent(subMatch[1]);
        const forced = provider.deleteStatus?.[id];
        const sub = subs.find((s) => s.id === id);
        if (forced) { status = forced; data = { errors: [{ description: "provider down" }] }; }
        else if (!sub) { status = 404; data = { errors: [{ description: "not found" }] }; }
        else { if (!provider.deleteIgnored?.has(id)) sub.deleted = true; data = { deleted: true, id }; }
      } else if (subMatch && req.method === "GET" && provider.lookupStatus?.[decodeURIComponent(subMatch[1])]) {
        status = provider.lookupStatus[decodeURIComponent(subMatch[1])]; data = { errors: [{ description: "provider down" }] };
      } else if (subMatch && req.method === "GET") {
        const sub = provider.lookupBody !== undefined ? provider.lookupBody : subs.find((s) => s.id === decodeURIComponent(subMatch[1]));
        if (!sub) { status = 404; data = { errors: [] }; } else data = sub;
      } else if (/^\/subscriptions\/[^/]+\/payments$/.test(p) && req.method === "GET") {
        const st = url.searchParams.get("status");
        const sid = decodeURIComponent(p.split("/")[2]);
        data = { object: "list", hasMore: false, data: (provider.paymentsBySub?.[sid] ?? provider.payments ?? []).filter((x) => !st || x.status === st) };
      } else if (p === "/payments" && req.method === "POST") data = { id: "pay_multa", invoiceUrl: "https://invoice.invalid/multa" };
      else throw new Error(`Unexpected mocked provider path: ${req.method} ${url.pathname}`);
    } else throw new Error("Network escape forbidden");
    return new Response(data === null ? null : JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
  };
  try {
    const token = `${btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${btoa(JSON.stringify({ sub: "test-user", exp: 4102444800 }))}.c2ln`;
    assert(handler);
    const response = await handler(new Request("https://function.invalid", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action, motivo: "teste" }),
    }));
    const patchIndex = calls.findIndex((c) => c.method === "PATCH" && c.url.includes("/rest/v1/assinaturas"));
    const patch = patchIndex >= 0 ? calls[patchIndex].body : undefined;
    const deletes = calls.filter((c) => c.method === "DELETE").map((c) => decodeURIComponent(new URL(c.url).pathname.split("/").pop() ?? ""));
    const lastDeleteIndex = calls.map((c) => c.method).lastIndexOf("DELETE");
    const asaasCalls = calls.filter((c) => c.url.includes("sandbox.asaas.com"));
    const charges = asaasCalls.filter((c) => c.method === "POST" && c.url.includes("/payments")).length;
    return { errors, status: response.status, data: await response.json(), patch, patchIndex, deletes, lastDeleteIndex, deleted: deletes.includes("sub_test"), charges, asaasCalls, calls, subs };
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;
    console.error = originalError;
    envNames.forEach((key, i) => { const value = previous[i]; if (value === undefined) Deno.env.delete(key); else Deno.env.set(key, value); });
  }
}

const SUB = { id: "sub_test", customer: "cus_test", status: "ACTIVE", nextDueDate: "2099-12-10", value: 497, billingType: "CREDIT_CARD" };
const PAID = { id: "pay_paid", status: "CONFIRMED", dueDate: "2026-11-10", value: 497, billingType: "BOLETO", invoiceUrl: "https://invoice.invalid/paid" };
const ROW = { status: "ativo", ciclos_pagos: 1, trial_ends_at: null };
const getSubCalls = (r: Awaited<ReturnType<typeof call>>) => r.asaasCalls.filter((c) => c.method === "GET" && new URL(c.url).pathname === "/api/v3/subscriptions/sub_test");
const list = (provider: Provider = {}, row: Record<string, unknown> = ROW) => call("list_invoices", row, { subs: [SUB], payments: [PAID], ...provider });

Deno.test("NEXT-CHARGE a) paid active subscription supplies next, never history or payment links", async () => {
  const r = await list();
  assertEquals(r.status, 200);
  assertEquals(getSubCalls(r).length, 1);
  assertEquals(r.data.next, { id: "subscription:sub_test", dueDate: "2099-12-10", value: 497, status: "PENDING", invoiceUrl: null, receiptUrl: null, billingType: "CREDIT_CARD", kind: "monthly", scheduled: true });
  assertEquals(r.data.invoices, [{ id: "pay_paid", dueDate: "2026-11-10", value: 497, status: "CONFIRMED", invoiceUrl: "https://invoice.invalid/paid", receiptUrl: null, billingType: "BOLETO", kind: "monthly" }]);
  assertEquals(r.data.overdue, null);
});
for (const status of ["PENDING", "AWAITING_RISK_ANALYSIS"]) {
  Deno.test(`NEXT-CHARGE b) ${status} skips subscription GET`, async () => {
    const r = await list({ payments: [{ ...PAID, id: "pay_pending", status }] });
    assertEquals(getSubCalls(r).length, 0);
    assertEquals(r.data.next.id, "pay_pending");
    assertEquals(r.data.next.scheduled, undefined);
  });
}
Deno.test("NEXT-CHARGE b) trial with pending charge skips fallback", async () => {
  const r = await list({ payments: [{ ...PAID, status: "PENDING" }] }, { status: "trial", trial_ends_at: inDays(5) });
  assertEquals(getSubCalls(r).length, 0);
  assertEquals(r.data.next.id, PAID.id);
});
Deno.test("NEXT-CHARGE c) overdue skips fallback and preserves overdue", async () => {
  const r = await list({ payments: [{ ...PAID, status: "OVERDUE" }] });
  assertEquals(getSubCalls(r).length, 0);
  assertEquals(r.data.next, null);
  assertEquals(r.data.overdue.id, PAID.id);
});
for (const [name, patch] of [
  ["past day", { nextDueDate: "2000-01-01" }], ["null day", { nextDueDate: null }],
  ["malformed day", { nextDueDate: "tomorrow" }], ["timestamp not calendar day", { nextDueDate: "2099-12-10T00:00:00Z" }],
  ["impossible day", { nextDueDate: "2099-02-30" }], ["zero value", { value: 0 }],
  ["nonfinite value", { value: "Infinity" }], ["nonactive status", { status: "INACTIVE" }],
] as const) {
  Deno.test(`NEXT-CHARGE d) ${name} leaves next null and returns history with 200`, async () => {
    const r = await list({ lookupBody: { ...SUB, ...patch } });
    assertEquals(r.status, 200);
    assertEquals(r.data.next, null);
    assertEquals(r.data.invoices.length, 1);
  });
}
for (const [name, provider, error] of [
  ["HTTP 500", { lookupStatus: { sub_test: 500 } }, "500"],
  ["network error", { lookupNetworkDown: true }, "network-or-body-error"],
  ["bad body", { lookupBody: [] }, "200"],
  ["non-JSON body", { lookupBody: "not-json" }, "200"],
] as const) {
  Deno.test(`NEXT-CHARGE d) ${name} is nonfatal and logs once without personal data`, async () => {
    const r = await list(provider);
    assertEquals(r.status, 200);
    assertEquals(r.data.next, null);
    assertEquals(r.data.invoices.length, 1);
    assertEquals(r.errors, [`list_invoices next-from-subscription error: ${error}`]);
  });
}
Deno.test("NEXT-CHARGE e) cancelled previous subscription is history only, no subscription GET", async () => {
  const r = await list({ paymentsBySub: { sub_old: [PAID] } }, { ...ROW, status: "cancelado", asaas_subscription_id: null, asaas_subscription_id_anterior: "sub_old" });
  assertEquals(r.status, 200);
  assertEquals(r.data.next, null);
  assertEquals(r.data.invoices.length, 1);
  assertEquals(r.asaasCalls.filter((c) => /^\/api\/v3\/subscriptions\/[^/]+$/.test(new URL(c.url).pathname)).length, 0);
});
Deno.test("NEXT-CHARGE f) subscription billing type wins over newest invoice", async () => {
  const r = await list({ lookupBody: { ...SUB, billingType: "PIX" } });
  assertEquals(r.data.next.billingType, "PIX");
});
Deno.test("NEXT-CHARGE f) missing subscription billing type uses newest sorted invoice", async () => {
  const r = await list({ lookupBody: { ...SUB, billingType: null }, payments: [PAID, { ...PAID, id: "pay_new", paymentDate: "2026-11-20", billingType: "CREDIT_CARD" }] });
  assertEquals(r.data.next.billingType, "CREDIT_CARD");
});
Deno.test("NEXT-CHARGE f) no billing type anywhere remains null", async () => {
  const r = await list({ lookupBody: { ...SUB, billingType: null }, payments: [] });
  assertEquals(r.data.next.billingType, null);
});
Deno.test("NEXT-CHARGE g) provider value, not plan price, is the truth", async () => {
  const r = await list({ lookupBody: { ...SUB, value: "612.34" } });
  assertEquals(r.data.next.value, 612.34);
  assertEquals(r.data.invoices[0].value, 497);
});
Deno.test("NEXT-CHARGE today in Brasilia is eligible even when UTC day is tomorrow", async () => {
  const OriginalDate = globalThis.Date;
  class Clock extends OriginalDate { constructor(value?: string | number) { super(value ?? "2026-11-26T01:00:00Z"); } }
  globalThis.Date = Clock as DateConstructor;
  try {
    const r = await list({ lookupBody: { ...SUB, nextDueDate: "2026-11-25" } });
    assertEquals(r.data.next.dueDate, "2026-11-25");
  } finally { globalThis.Date = OriginalDate; }
});
