// P26 — multa de fidelidade: cancelamento idempotente e ação pay_penalty.
// Entrada real da função; banco e Asaas simulados em memória (nenhuma rede).
// Rode este arquivo em uma invocação própria de `deno test` (captura Deno.serve).
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { GoTrueClient } from "npm:@supabase/auth-js";
import { multaFidelidade } from "../_shared/pricing.ts";
import { prorationDay } from "../_shared/proration.ts";

GoTrueClient.prototype.startAutoRefresh = async () => {};

let handler: ((req: Request) => Promise<Response>) | null = null;
const originalServe = Deno.serve;
Object.defineProperty(Deno, "serve", { configurable: true, value: (h: (req: Request) => Promise<Response>) => { handler = h; } });
await import("./index.ts");
Object.defineProperty(Deno, "serve", { configurable: true, value: originalServe });

const DAY = 86_400_000;
const ROW_ID = "5b0c2d7e-1f3a-4c8b-9e2d-0a1b2c3d4e5f";
const EMAIL = "cliente@teste.com.br";
const UNAVAILABLE = "Não conseguimos abrir a cobrança agora. Tente de novo em instantes.";
const MULTA = multaFidelidade("presenca", 3);

type Row = Record<string, unknown>;
type Charge = Record<string, unknown>;
interface World {
  row: Row;
  charges: Map<string, Charge>;
  calls: { method: string; path: string; body: any }[];
  errors: string[];
  postStatus?: number;
  postNetworkError?: boolean;
  getPaymentStatus?: number;
  /** Outra chamada de cancelamento grava 'cancelado' entre a leitura e a escrita desta. */
  raceOnCancel?: boolean;
}

function world(row: Row = {}, over: Partial<World> = {}): World {
  return {
    row: {
      id: ROW_ID, user_id: "test-user", plano: "presenca", status: "ativo",
      asaas_subscription_id: "sub_test", asaas_subscription_id_anterior: null, asaas_customer_id: "cus_test",
      asaas_checkout_id: null, asaas_checkout_created_at: null,
      data_vencimento: new Date(Date.now() + 20 * DAY).toISOString(), trial_ends_at: null,
      ciclo_contratado: "anual", ciclos_pagos: 3, counted_payment_ids: ["p1", "p2", "p3"],
      compromisso_inicio: new Date(Date.now() - 90 * DAY).toISOString(), compromisso_meses: 12,
      upgrade_pendente_payment_id: null, upgrade_pendente_em: null,
      multa_pendente_valor: null, multa_pendente_ciclos: null, multa_pendente_payment_id: null,
      multa_pendente_invoice_url: null, multa_pendente_em: null, multa_ultimo_payment_id: null,
      ...row,
    },
    charges: new Map(), calls: [], errors: [], ...over,
  };
}

// ── Filtros PostgREST simulados ──────────────────────────────────────────────
function splitTop(s: string): string[] {
  const out: string[] = []; let depth = 0; let quoted = false; let cur = "";
  for (const ch of s) {
    if (ch === '"') quoted = !quoted;
    if (!quoted && ch === "(") depth++;
    if (!quoted && ch === ")") depth--;
    if (!quoted && depth === 0 && ch === ",") { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}
function cond(row: Row, col: string, op: string, raw: string): boolean {
  const value = raw.replace(/^"|"$/g, "");
  const cell = row[col];
  if (op === "is" && value === "null") return cell === null || cell === undefined;
  if (op === "eq") return cell != null && String(cell) === value;
  if (op === "neq") return cell != null && String(cell) !== value;
  if (op === "lt") return cell != null && Date.parse(String(cell)) < Date.parse(value);
  if (op === "in") return value.slice(1, -1).split(",").map((s) => s.replace(/^"|"$/g, "")).includes(String(cell));
  throw new Error(`filtro não simulado: ${col}.${op}.${raw}`);
}
function matches(row: Row, params: URLSearchParams): boolean {
  for (const [key, val] of params) {
    if (["select", "order", "limit", "offset"].includes(key)) continue;
    if (key === "or") {
      if (!splitTop(val.slice(1, -1)).some((t) => { const [c, o, ...r] = t.split("."); return cond(row, c, o, r.join(".")); })) return false;
      continue;
    }
    const [op, ...rest] = val.split(".");
    if (!cond(row, key, op, rest.join("."))) return false;
  }
  return true;
}

async function call(w: World, body: Record<string, unknown>) {
  const originalFetch = globalThis.fetch;
  const envNames = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "ASAAS_API_KEY_SANDBOX", "ASAAS_ENV"];
  const previous = envNames.map((k) => Deno.env.get(k));
  ["https://database.invalid", "test-anon", "test-service", "test-provider", "sandbox"].forEach((v, i) => Deno.env.set(envNames[i], v));
  const orig = { log: console.log, warn: console.warn, error: console.error };
  console.log = () => {}; console.warn = () => {};
  console.error = (...a: unknown[]) => { w.errors.push(a.map(String).join(" ")); };
  let seq = w.charges.size;
  const reply = (data: unknown, status = 200) =>
    new Response(data === null ? null : JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
  globalThis.fetch = async (input, init) => {
    const req = new Request(input, init);
    const url = new URL(req.url);
    const reqBody = ["POST", "PUT", "PATCH"].includes(req.method) ? await req.json() : null;
    if (url.hostname === "database.invalid") {
      if (url.pathname === "/auth/v1/user") return reply({ id: "test-user", aud: "authenticated", role: "authenticated" });
      if (url.pathname === "/rest/v1/profiles") return reply([{ account_type: "individual", email: EMAIL }]);
      if (url.pathname === "/rest/v1/assinaturas" && req.method === "GET") {
        return reply(matches(w.row, url.searchParams) ? [{ ...w.row }] : []);
      }
      if (url.pathname === "/rest/v1/assinaturas" && req.method === "PATCH") {
        if (w.raceOnCancel && reqBody?.status === "cancelado") {
          Object.assign(w.row, { status: "cancelado", multa_pendente_valor: MULTA, multa_pendente_ciclos: 3, multa_pendente_payment_id: "pay_other", multa_pendente_invoice_url: "https://invoice.invalid/pay_other" });
        }
        const hit = matches(w.row, url.searchParams);
        if (hit) Object.assign(w.row, reqBody);
        return url.searchParams.has("select") ? reply(hit ? [{ id: w.row.id }] : []) : new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected mocked database path: ${req.method} ${url.pathname}`);
    }
    if (url.hostname === "sandbox.asaas.com") {
      const p = url.pathname.replace("/api/v3", "");
      w.calls.push({ method: req.method, path: p, body: reqBody });
      if (p === "/customers" && req.method === "GET") return reply({ object: "list", hasMore: false, data: [{ id: "cus_mail", email: EMAIL }] });
      if (p === "/subscriptions" && req.method === "GET") {
        const live = w.row.__subDeleted ? [] : [{ id: "sub_test", customer: "cus_test", status: "ACTIVE" }];
        return reply({ object: "list", hasMore: false, data: url.searchParams.get("customer") === "cus_test" ? live : [] });
      }
      if (p === "/subscriptions/sub_test" && req.method === "GET") return w.row.__subDeleted ? reply({ errors: [] }, 404) : reply({ id: "sub_test", status: "ACTIVE" });
      if (p === "/subscriptions/sub_test" && req.method === "DELETE") { w.row.__subDeleted = true; return reply({ deleted: true }); }
      if (p === "/payments" && req.method === "POST") {
        if (w.postNetworkError) throw new TypeError("network timeout");
        if (w.postStatus) return reply({ errors: [{ description: "recusado" }] }, w.postStatus);
        const id = `pay_m${++seq}`;
        const charge = { id, status: "PENDING", ...reqBody, invoiceUrl: `https://invoice.invalid/${id}` };
        w.charges.set(id, charge);
        return reply(charge);
      }
      const m = p.match(/^\/payments\/([^/]+)$/);
      if (m && req.method === "GET") {
        if (w.getPaymentStatus) return reply({ errors: [] }, w.getPaymentStatus);
        const c = w.charges.get(decodeURIComponent(m[1]));
        return c ? reply(c) : reply({ errors: [] }, 404);
      }
      if (m && req.method === "DELETE") {
        const id = decodeURIComponent(m[1]);
        if (!w.charges.has(id)) return reply({ errors: [] }, 404);
        w.charges.set(id, { ...w.charges.get(id), deleted: true });
        return reply({ deleted: true, id });
      }
      throw new Error(`Unexpected mocked provider path: ${req.method} ${url.pathname}`);
    }
    throw new Error("Network escape forbidden");
  };
  try {
    const token = `${btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${btoa(JSON.stringify({ sub: "test-user", exp: 4102444800 }))}.c2ln`;
    assert(handler);
    const res = await handler(new Request("https://function.invalid", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }));
    return { status: res.status, data: await res.json() };
  } finally {
    globalThis.fetch = originalFetch;
    Object.assign(console, orig);
    envNames.forEach((k, i) => { const v = previous[i]; if (v === undefined) Deno.env.delete(k); else Deno.env.set(k, v); });
  }
}

const cancel = (w: World) => call(w, { action: "cancel", motivo: "teste" });
const pay = (w: World) => call(w, { action: "pay_penalty" });
const posts = (w: World) => w.calls.filter((c) => c.method === "POST" && c.path === "/payments");
const charge = (w: World, id: string, extra: Charge = {}) => {
  w.charges.set(id, { id, status: "PENDING", invoiceUrl: `https://invoice.invalid/${id}`, ...extra });
};
const pendingRow = (pid: string | null, extra: Row = {}): Row => ({
  status: "cancelado", asaas_subscription_id: null,
  multa_pendente_valor: MULTA, multa_pendente_ciclos: 3, multa_pendente_payment_id: pid,
  multa_pendente_invoice_url: pid ? `https://invoice.invalid/${pid}` : null,
  multa_pendente_em: pid ? new Date(Date.now() - DAY).toISOString() : null, ...extra,
});

// ── cancel ───────────────────────────────────────────────────────────────────
Deno.test("cancel anual pago: cria a cobrança e grava valor, ciclos e cobrança junto com o cancelamento", async () => {
  const w = world();
  const r = await cancel(w);
  assertEquals(r.status, 200);
  assertEquals(posts(w).length, 1);
  const body = posts(w)[0].body;
  assertEquals(body.billingType, "CREDIT_CARD");
  assertEquals(body.value, MULTA);
  assertEquals(body.dueDate, prorationDay(new Date()));
  assertEquals(body.externalReference, `fidelidade:${ROW_ID}:presenca`);
  assertEquals(w.row.status, "cancelado");
  assertEquals(w.row.multa_pendente_valor, MULTA);
  assertEquals(w.row.multa_pendente_ciclos, 3);
  assertEquals(w.row.multa_pendente_payment_id, "pay_m1");
  assertEquals(w.row.multa_pendente_invoice_url, "https://invoice.invalid/pay_m1");
  assert(w.row.multa_pendente_em, "multa_pendente_em gravado");
  assertEquals(r.data.multa, { value: MULTA, ciclos: 3, invoiceUrl: "https://invoice.invalid/pay_m1" });
});

Deno.test("cancel idempotente: segunda chamada não cria outra cobrança e devolve a multa gravada (reused)", async () => {
  const w = world();
  await cancel(w);
  const r = await cancel(w);
  assertEquals(r.status, 200);
  assertEquals(posts(w).length, 1, "só uma cobrança no total");
  assertEquals(r.data.reused, true);
  assertEquals(r.data.multa, { value: MULTA, ciclos: 3, invoiceUrl: "https://invoice.invalid/pay_m1" });
  assertEquals(r.data.accessUntil, w.row.data_vencimento);
});

Deno.test("cancel concorrente: outra chamada vence a gravação → a cobrança desta é removida, resposta reused", async () => {
  const w = world({}, { raceOnCancel: true });
  const r = await cancel(w);
  assertEquals(r.status, 200);
  assertEquals(r.data.reused, true);
  assertEquals(w.charges.get("pay_m1")?.deleted, true, "cobrança duplicada removida");
  assertEquals(w.row.multa_pendente_payment_id, "pay_other");
  assertEquals(r.data.multa.invoiceUrl, "https://invoice.invalid/pay_other");
});

for (const [label, over] of [["HTTP 500", { postStatus: 500 }], ["erro de rede", { postNetworkError: true }]] as const) {
  Deno.test(`cancel com falha ao criar a cobrança (${label}): cancela e grava valor/ciclos com payment_id nulo`, async () => {
    const w = world({}, over);
    const r = await cancel(w);
    assertEquals(r.status, 200);
    assertEquals(w.row.status, "cancelado");
    assertEquals(w.row.multa_pendente_valor, MULTA);
    assertEquals(w.row.multa_pendente_ciclos, 3);
    assertEquals(w.row.multa_pendente_payment_id, null);
    assertEquals(w.row.multa_pendente_em, null);
    assertEquals(r.data.multa, { value: MULTA, ciclos: 3, invoiceUrl: null, error: "cobranca_indisponivel" });
  });
}

Deno.test("cancel mensal (sem compromisso): nenhuma multa gravada nem cobrada", async () => {
  const w = world({ ciclo_contratado: "mensal" });
  const r = await cancel(w);
  assertEquals(r.status, 200);
  assertEquals(posts(w).length, 0);
  assertEquals(w.row.multa_pendente_valor, null);
  assertEquals(r.data.multa, null);
});

// ── pay_penalty ──────────────────────────────────────────────────────────────
Deno.test("pay_penalty sem multa (linha antiga, colunas vazias) → nothing_pending", async () => {
  const w = world({ status: "cancelado" });
  const r = await pay(w);
  assertEquals(r.status, 200);
  assertEquals(r.data, { ok: true, nothing_pending: true });
  assertEquals(w.calls.length, 0);
});

for (const st of ["PENDING", "OVERDUE"]) {
  Deno.test(`pay_penalty com cobrança ${st} → devolve o link atual e atualiza o gravado`, async () => {
    const w = world(pendingRow("pay_x"));
    charge(w, "pay_x", { status: st, invoiceUrl: "https://invoice.invalid/pay_x_novo" });
    const r = await pay(w);
    assertEquals(r.status, 200);
    assertEquals(r.data.ok, true);
    assertEquals(r.data.invoiceUrl, "https://invoice.invalid/pay_x_novo");
    assertEquals(w.row.multa_pendente_invoice_url, "https://invoice.invalid/pay_x_novo");
    assertEquals(w.row.multa_pendente_payment_id, "pay_x", "bloqueio mantido");
    assertEquals(w.row.status, "cancelado");
    assertEquals(posts(w).length, 0);
  });
}

for (const st of ["RECEIVED", "CONFIRMED"]) {
  Deno.test(`pay_penalty com cobrança ${st} → paid, pendência limpa e multa_ultimo_payment_id gravado`, async () => {
    const w = world(pendingRow("pay_x"));
    charge(w, "pay_x", { status: st });
    const r = await pay(w);
    assertEquals(r.data, { ok: true, paid: true });
    assertEquals(w.row.multa_pendente_valor, null);
    assertEquals(w.row.multa_pendente_payment_id, null);
    assertEquals(w.row.multa_ultimo_payment_id, "pay_x");
  });
}

Deno.test("pay_penalty com cobrança removida (deleted) → forgiven e pendência limpa", async () => {
  const w = world(pendingRow("pay_x"));
  charge(w, "pay_x", { deleted: true, status: "PENDING" });
  const r = await pay(w);
  assertEquals(r.data, { ok: true, forgiven: true });
  assertEquals(w.row.multa_pendente_valor, null);
  assertEquals(w.row.multa_ultimo_payment_id, "pay_x");
});

Deno.test("pay_penalty com cobrança inexistente (404) → forgiven", async () => {
  const w = world(pendingRow("pay_sumiu"));
  const r = await pay(w);
  assertEquals(r.data, { ok: true, forgiven: true });
  assertEquals(w.row.multa_ultimo_payment_id, "pay_sumiu");
});

Deno.test("pay_penalty sem cobrança gravada → cria UMA vez; segundo clique reaproveita", async () => {
  const w = world(pendingRow(null));
  const r1 = await pay(w);
  assertEquals(r1.data.ok, true);
  assertEquals(r1.data.invoiceUrl, "https://invoice.invalid/pay_m1");
  const body = posts(w)[0].body;
  assertEquals(body.billingType, "CREDIT_CARD");
  assertEquals(body.value, MULTA);
  assertEquals(body.dueDate, prorationDay(new Date()));
  assertEquals(body.externalReference, `fidelidade:${ROW_ID}:presenca`);
  assertEquals(w.row.multa_pendente_payment_id, "pay_m1");
  const r2 = await pay(w);
  assertEquals(r2.data.invoiceUrl, "https://invoice.invalid/pay_m1");
  assertEquals(posts(w).length, 1, "nunca duas cobranças");
});

Deno.test("pay_penalty com reserva recente (outro clique em curso) → pedido_em_andamento, sem cobrança", async () => {
  const w = world(pendingRow(null, { multa_pendente_em: new Date(Date.now() - 10_000).toISOString() }));
  const r = await pay(w);
  assertEquals(r.status, 200);
  assertEquals(r.data.reason, "pedido_em_andamento");
  assertEquals(posts(w).length, 0);
});

Deno.test("pay_penalty sem cliente gravado → usa o cliente do e-mail da conta", async () => {
  const w = world(pendingRow(null, { asaas_customer_id: null }));
  const r = await pay(w);
  assertEquals(r.data.ok, true);
  assertEquals(posts(w)[0].body.customer, "cus_mail");
});

Deno.test("pay_penalty: Asaas fora ao consultar → 200 cobranca_indisponivel com a mensagem exata", async () => {
  const w = world(pendingRow("pay_x"), { getPaymentStatus: 503 });
  charge(w, "pay_x");
  const r = await pay(w);
  assertEquals(r.status, 200);
  assertEquals(r.data, { ok: false, reason: "cobranca_indisponivel", message: UNAVAILABLE });
  assertEquals(w.row.multa_pendente_payment_id, "pay_x");
});

Deno.test("pay_penalty: Asaas recusa criar a cobrança → cobranca_indisponivel e reserva liberada", async () => {
  const w = world(pendingRow(null), { postStatus: 500 });
  const r = await pay(w);
  assertEquals(r.status, 200);
  assertEquals(r.data, { ok: false, reason: "cobranca_indisponivel", message: UNAVAILABLE });
  assertEquals(w.row.multa_pendente_payment_id, null);
  assertEquals(w.row.multa_pendente_em, null, "novo clique pode tentar de novo");
});
