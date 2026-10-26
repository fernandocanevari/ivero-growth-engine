import { assert, assertEquals, assertMatch } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { GoTrueClient } from "npm:@supabase/auth-js";
import { prorationDay } from "../_shared/proration.ts";
import { UPGRADE_REF_RE } from "../asaas-webhook/upgrade-payment.ts";

// P25b — upgrade individual só vale depois do pagamento da diferença.
// Entrypoint real, só HTTP interceptado (banco e Asaas simulados, com estado).
// Rode este arquivo em uma invocação própria do `deno test` (captura Deno.serve).
GoTrueClient.prototype.startAutoRefresh = async () => {};
let handler: ((req: Request) => Promise<Response>) | null = null;
const originalServe = Deno.serve;
Object.defineProperty(Deno, "serve", { configurable: true, value: (h: (req: Request) => Promise<Response>) => { handler = h; } });
await import("./index.ts");
Object.defineProperty(Deno, "serve", { configurable: true, value: originalServe });

const ROW_ID = "5d6f1a2b-3c4d-4e5f-8a9b-0c1d2e3f4a5b";
const EMAIL = "cliente@teste.com.br";
const DAY = 86_400_000;
const today = prorationDay(new Date())!;
const plusDays = (n: number) => new Date(Date.parse(`${today}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const UPGRADE_COLS = [
  "upgrade_pendente_plano", "upgrade_pendente_ciclo", "upgrade_pendente_valor_novo", "upgrade_pendente_diferenca",
  "upgrade_pendente_payment_id", "upgrade_pendente_invoice_url", "upgrade_pendente_em",
];

type Row = Record<string, unknown>;
interface World {
  row: Row;
  sub: { id: string; value: number; cycle: string; customer: string | null; nextDueDate: string | null; status: string; deleted?: boolean };
  /** Cobranças da assinatura (GET /subscriptions/{id}/payments). */
  subPayments: Record<string, unknown>[];
  /** Cobranças avulsas no Asaas, por id. */
  charges: Map<string, Record<string, unknown>>;
  postStatus?: number;
  postNetworkError?: boolean;
  deletePaymentStatus?: number;
  /** PATCH que grava a cobrança falha (simula erro de banco). */
  saveFails?: boolean;
  calls: { url: string; method: string; body: any }[];
  patches: Row[];
  errors: string[];
}

function world(row: Row = {}, over: Partial<World> = {}): World {
  return {
    row: {
      id: ROW_ID, plano: "presenca", status: "ativo", asaas_subscription_id: "sub_test", asaas_subscription_id_anterior: null,
      asaas_customer_id: "cus_test", asaas_checkout_id: null, asaas_checkout_created_at: null,
      data_vencimento: new Date(Date.now() + 20 * DAY).toISOString(), trial_ends_at: null, ciclo_contratado: "mensal",
      ciclos_pagos: 1, counted_payment_ids: ["pay_c1"], compromisso_inicio: null, compromisso_meses: 12,
      upgrade_pendente_plano: null, upgrade_pendente_ciclo: null, upgrade_pendente_valor_novo: null, upgrade_pendente_diferenca: null,
      upgrade_pendente_payment_id: null, upgrade_pendente_invoice_url: null, upgrade_pendente_em: null, upgrade_ultimo_payment_id: null,
      ...row,
    },
    sub: { id: "sub_test", value: 497, cycle: "MONTHLY", customer: "cus_test", nextDueDate: plusDays(50), status: "ACTIVE" },
    subPayments: [{ id: "pay_next", status: "PENDING", dueDate: plusDays(20), value: 497 }],
    charges: new Map(),
    calls: [], patches: [], errors: [],
    ...over,
  };
}

// ── Filtros PostgREST (eq / is / lt / or / and) ───────────────────────────────
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
function term(row: Row, t: string): boolean {
  if (t.startsWith("and(")) return splitTop(t.slice(4, -1)).every((x) => term(row, x));
  if (t.startsWith("or(")) return splitTop(t.slice(3, -1)).some((x) => term(row, x));
  const [col, op, ...rest] = t.split(".");
  return cond(row, col, op, rest.join("."));
}
function cond(row: Row, col: string, op: string, raw: string): boolean {
  const value = raw.replace(/^"|"$/g, "");
  const cell = row[col];
  if (op === "is" && value === "null") return cell === null || cell === undefined;
  if (op === "eq") return cell !== null && cell !== undefined && String(cell) === value;
  if (op === "lt") return cell !== null && cell !== undefined && Date.parse(String(cell)) < Date.parse(value);
  throw new Error(`filtro não simulado: ${col}.${op}.${raw}`);
}
function matches(row: Row, params: URLSearchParams): boolean {
  for (const [key, val] of params) {
    if (key === "select") continue;
    if (key === "or") { if (!splitTop(val.slice(1, -1)).some((x) => term(row, x))) return false; continue; }
    const [op, ...rest] = val.split(".");
    if (!cond(row, key, op, rest.join("."))) return false;
  }
  return true;
}

async function call(w: World, body: Record<string, unknown>) {
  const originalFetch = globalThis.fetch;
  const envNames = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "ASAAS_API_KEY_SANDBOX", "ASAAS_ENV"];
  const previous = envNames.map((key) => Deno.env.get(key));
  ["https://database.invalid", "test-anon", "test-service", "test-provider", "sandbox"].forEach((v, i) => Deno.env.set(envNames[i], v));
  const originalLog = console.log; const originalError = console.error; const originalWarn = console.warn;
  console.log = () => {}; console.warn = () => {};
  console.error = (...a: unknown[]) => { w.errors.push(a.map(String).join(" ")); };
  let seq = 0;
  const reply = (data: unknown, status = 200) =>
    new Response(data === null ? null : JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
  globalThis.fetch = async (input, init) => {
    const req = new Request(input, init);
    const url = new URL(req.url);
    const reqBody = ["POST", "PUT", "PATCH"].includes(req.method) ? await req.json() : null;
    w.calls.push({ url: req.url, method: req.method, body: reqBody });
    if (url.hostname === "database.invalid") {
      if (url.pathname === "/auth/v1/user") return reply({ id: "test-user", aud: "authenticated", role: "authenticated" });
      if (url.pathname === "/rest/v1/profiles") return reply({ account_type: "individual", email: EMAIL });
      if (url.pathname === "/rest/v1/assinaturas" && req.method === "GET") return reply({ ...w.row });
      if (url.pathname === "/rest/v1/assinaturas" && req.method === "PATCH") {
        if (w.saveFails && reqBody?.upgrade_pendente_payment_id) return reply({ message: "db down", code: "XX000" }, 500);
        const hit = matches(w.row, url.searchParams);
        if (hit) { Object.assign(w.row, reqBody); w.patches.push(reqBody); }
        return url.searchParams.has("select") ? reply(hit ? [{ id: w.row.id }] : []) : new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected mocked database path: ${req.method} ${url.pathname}`);
    }
    if (url.hostname === "sandbox.asaas.com") {
      const p = url.pathname.replace("/api/v3", "");
      if (p === "/subscriptions/sub_test" && req.method === "GET") return w.sub.deleted ? reply({ errors: [] }, 404) : reply(w.sub);
      if (p === "/subscriptions/sub_test" && req.method === "PUT") return reply({ ...w.sub, value: reqBody.value });
      if (p === "/subscriptions/sub_test" && req.method === "DELETE") { w.sub.deleted = true; return reply({ deleted: true }); }
      if (p === "/subscriptions/sub_test/payments") return reply({ object: "list", hasMore: false, data: w.subPayments });
      if (p === "/subscriptions" && req.method === "GET") {
        const live = !w.sub.deleted && w.sub.customer === url.searchParams.get("customer") ? [w.sub] : [];
        return reply({ object: "list", hasMore: false, data: live });
      }
      if (p === "/customers" && req.method === "GET") return reply({ object: "list", hasMore: false, data: [{ id: "cus_test", email: EMAIL }] });
      if (p === "/payments" && req.method === "POST") {
        if (w.postNetworkError) throw new Error("mocked provider network failure");
        if (w.postStatus) return reply({ errors: [{ description: "recusado" }] }, w.postStatus);
        const id = `pay_up_${++seq}_${w.charges.size}`;
        const charge = { id, status: "PENDING", ...reqBody, invoiceUrl: `https://invoice.invalid/${id}` };
        w.charges.set(id, charge);
        return reply(charge);
      }
      const payMatch = p.match(/^\/payments\/([^/]+)$/);
      if (payMatch && req.method === "GET") {
        const c = w.charges.get(decodeURIComponent(payMatch[1]));
        return c ? reply(c) : reply({ errors: [] }, 404);
      }
      if (payMatch && req.method === "DELETE") {
        if (w.deletePaymentStatus) return reply({ errors: [{ description: "falhou" }] }, w.deletePaymentStatus);
        const id = decodeURIComponent(payMatch[1]);
        if (!w.charges.has(id)) return reply({ errors: [] }, 404);
        w.charges.set(id, { ...w.charges.get(id), deleted: true, status: "DELETED" });
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
    console.log = originalLog; console.error = originalError; console.warn = originalWarn;
    envNames.forEach((key, i) => { const v = previous[i]; if (v === undefined) Deno.env.delete(key); else Deno.env.set(key, v); });
  }
}

const upgrade = (w: World, plano = "influencia", ciclo = "mensal") => call(w, { action: "change_plan", plano, ciclo });
const asaas = (w: World, method: string, path: RegExp) =>
  w.calls.filter((c) => c.method === method && c.url.includes("sandbox.asaas.com") && path.test(new URL(c.url).pathname.replace("/api/v3", "")));
const puts = (w: World) => asaas(w, "PUT", /^\/subscriptions\//);
const posts = (w: World) => asaas(w, "POST", /^\/payments$/);
const pending = (row: Row) => Object.fromEntries(UPGRADE_COLS.map((k) => [k, row[k]]));
const NO_PENDING = Object.fromEntries(UPGRADE_COLS.map((k) => [k, null]));

Deno.test("upgrade cria pedido pendente: plano, ciclo e valor no Asaas intactos (sem PUT)", async () => {
  const w = world();
  const r = await upgrade(w);
  assertEquals(r.status, 200);
  assertEquals(puts(w).length, 0, "nunca chama PUT /subscriptions no pedido");
  assertEquals(posts(w).length, 1);
  const post = posts(w)[0].body;
  assertEquals([post.billingType, post.value, post.dueDate, post.customer], ["CREDIT_CARD", 266.67, plusDays(3), "cus_test"]);
  assertMatch(post.externalReference, new RegExp(`^prorata:${ROW_ID}:influencia:\\d{10}$`));
  assert(UPGRADE_REF_RE.test(post.externalReference), "referência casa com o padrão do webhook");
  assertEquals(post.description, "Ivero — diferença proporcional do upgrade para influencia (20 dia(s) restantes do ciclo atual)");
  assertEquals([w.row.plano, w.row.ciclo_contratado], ["presenca", "mensal"]);
  const chargeId = [...w.charges.keys()][0];
  assertEquals(w.row.upgrade_pendente_plano, "influencia");
  assertEquals(w.row.upgrade_pendente_ciclo, "mensal");
  assertEquals(w.row.upgrade_pendente_valor_novo, 897);
  assertEquals(w.row.upgrade_pendente_diferenca, 266.67);
  assertEquals(w.row.upgrade_pendente_payment_id, chargeId);
  assertEquals(w.row.upgrade_pendente_invoice_url, `https://invoice.invalid/${chargeId}`);
  assert(typeof w.row.upgrade_pendente_em === "string");
  assertEquals(r.data, {
    ok: true, mode: "pending_payment", plano: "presenca", planoPendente: "influencia", ciclo: "mensal",
    diferenca: 266.67, dueDate: plusDays(3), invoiceUrl: `https://invoice.invalid/${chargeId}`,
  });
});

for (const [label, over] of [["HTTP 400", { postStatus: 400 }], ["HTTP 503", { postStatus: 503 }], ["erro de rede", { postNetworkError: true }]] as const) {
  Deno.test(`falha no POST da diferença (${label}): erro e NADA muda`, async () => {
    const w = world({}, over);
    const before = structuredClone(w.row);
    const r = await upgrade(w);
    assertEquals(r.status, 502);
    assertEquals(puts(w).length, 0);
    assertEquals(w.row, before, "linha volta exatamente ao estado anterior (reserva liberada)");
  });
}

Deno.test("falha ao gravar o pedido depois da cobrança: remove a cobrança, libera a reserva e devolve erro", async () => {
  const w = world({}, { saveFails: true });
  const before = structuredClone(w.row);
  const r = await upgrade(w);
  assertEquals(r.status, 500);
  assertEquals(posts(w).length, 1);
  const created = [...w.charges.values()][0];
  assertEquals(created.deleted, true, "cobrança criada é removida");
  assertEquals(puts(w).length, 0);
  assertEquals(w.row, before);
});

Deno.test("pedido duplo simultâneo cria UMA cobrança só", async () => {
  const w = world();
  const [a, b] = await Promise.all([upgrade(w), upgrade(w)]);
  assertEquals(posts(w).length, 1);
  const modes = [a.data.mode ?? a.data.reason, b.data.mode ?? b.data.reason].sort();
  assert(modes.includes("pending_payment"), JSON.stringify([a.data, b.data]));
  assert(modes.every((m) => m === "pending_payment" || m === "pedido_em_andamento"), JSON.stringify(modes));
  assertEquals(puts(w).length, 0);
});

Deno.test("segundo clique logo depois (reserva sem cobrança < 60s) → pedido_em_andamento, nada criado", async () => {
  const w = world({ upgrade_pendente_plano: "influencia", upgrade_pendente_ciclo: "mensal", upgrade_pendente_em: new Date(Date.now() - 5_000).toISOString() });
  const r = await upgrade(w);
  assertEquals(r.data.ok, false);
  assertEquals(r.data.reason, "pedido_em_andamento");
  assertEquals(posts(w).length + puts(w).length, 0);
});

const OPEN_PENDING = {
  upgrade_pendente_plano: "influencia", upgrade_pendente_ciclo: "mensal", upgrade_pendente_valor_novo: 897,
  upgrade_pendente_diferenca: 266.67, upgrade_pendente_payment_id: "pay_old",
  upgrade_pendente_invoice_url: "https://invoice.invalid/pay_old", upgrade_pendente_em: new Date(Date.now() - 3_600_000).toISOString(),
};
const withOldCharge = (w: World, status = "PENDING") => {
  w.charges.set("pay_old", { id: "pay_old", status, dueDate: plusDays(2), value: 266.67, invoiceUrl: "https://invoice.invalid/pay_old" });
  return w;
};

Deno.test("mesmo plano pendente pedido de novo → devolve o pedido existente, nada criado", async () => {
  const w = withOldCharge(world(OPEN_PENDING));
  const before = structuredClone(w.row);
  const r = await upgrade(w);
  assertEquals(r.status, 200);
  assertEquals(r.data, {
    ok: true, mode: "pending_payment", reused: true, plano: "presenca", planoPendente: "influencia", ciclo: "mensal",
    diferenca: 266.67, dueDate: plusDays(2), invoiceUrl: "https://invoice.invalid/pay_old",
  });
  assertEquals(posts(w).length + puts(w).length + asaas(w, "DELETE", /./).length, 0);
  assertEquals(w.row, before);
});

Deno.test("mesmo plano pendente já PAGO aguardando webhook → pedido_em_andamento, nada criado", async () => {
  const w = withOldCharge(world(OPEN_PENDING), "CONFIRMED");
  const r = await upgrade(w);
  assertEquals(r.data.reason, "pedido_em_andamento");
  assertEquals(posts(w).length + asaas(w, "DELETE", /./).length, 0);
});

Deno.test("upgrade diferente com um pendente: remove a cobrança anterior ANTES de criar a nova", async () => {
  const w = withOldCharge(world(OPEN_PENDING));
  const r = await upgrade(w, "autoridade");
  assertEquals(r.data.mode, "pending_payment");
  assertEquals(r.data.planoPendente, "autoridade");
  const del = w.calls.findIndex((c) => c.method === "DELETE" && c.url.endsWith("/payments/pay_old"));
  const post = w.calls.findIndex((c) => c.method === "POST" && c.url.endsWith("/payments"));
  assert(del >= 0 && post > del, "DELETE da anterior vem antes do POST da nova");
  assertEquals(w.charges.get("pay_old")?.deleted, true);
  assertEquals(w.row.upgrade_ultimo_payment_id, "pay_old");
  assertEquals(w.row.upgrade_pendente_plano, "autoridade");
  assertEquals(w.row.upgrade_pendente_valor_novo, 1497);
  assertEquals(w.row.upgrade_pendente_diferenca, 666.67);
  assertEquals(w.row.plano, "presenca");
  assertEquals(puts(w).length, 0);
});

Deno.test("upgrade diferente: anterior já removida no Asaas (404) segue normalmente", async () => {
  const w = world(OPEN_PENDING); // pay_old não existe mais
  const r = await upgrade(w, "autoridade");
  assertEquals(r.data.mode, "pending_payment");
  assertEquals(w.row.upgrade_ultimo_payment_id, "pay_old");
});

Deno.test("upgrade diferente: DELETE da anterior falha (500) → erro e NADA muda", async () => {
  const w = withOldCharge(world(OPEN_PENDING), "PENDING");
  w.deletePaymentStatus = 500;
  const before = structuredClone(w.row);
  const r = await upgrade(w, "autoridade");
  assertEquals(r.status, 502);
  assertEquals(posts(w).length + puts(w).length, 0);
  assertEquals(w.row, before);
});

Deno.test("abaixo do mínimo (< R$ 5): aplica na hora como hoje (PUT e plano/ciclo)", async () => {
  // Anual 397 → mensal 497 no mesmo plano, 1 dia restante: 100 x 1/30 = 3,33.
  const w = world({ ciclo_contratado: "anual" });
  w.sub.value = 397;
  w.subPayments = [{ id: "pay_next", status: "PENDING", dueDate: plusDays(1), value: 397 }];
  const r = await upgrade(w, "presenca", "mensal");
  assertEquals(r.status, 200);
  assertEquals(r.data.mode, "asaas");
  assertEquals(r.data.proRata, null);
  assertEquals(posts(w).length, 0);
  assertEquals(puts(w).length, 1);
  assertEquals(puts(w)[0].body, { value: 497, updatePendingPayments: true, description: "Ivero — Plano presenca" });
  assertEquals([w.row.plano, w.row.ciclo_contratado], ["presenca", "mensal"]);
  assertEquals(pending(w.row), NO_PENDING);
});

Deno.test("diferença exigida sem customer no Asaas → erro e NADA muda (nunca de graça)", async () => {
  const w = world({ asaas_customer_id: null });
  w.sub.customer = null;
  const before = structuredClone(w.row);
  const r = await upgrade(w);
  assertEquals(r.status, 502);
  assertEquals(posts(w).length + puts(w).length, 0);
  assertEquals(w.row, before);
});

Deno.test("trial com vínculo: aplica na hora, SEM cobrança proporcional nem pedido pendente", async () => {
  const w = world({ status: "trial", trial_ends_at: new Date(Date.now() + 5 * DAY).toISOString(), ciclos_pagos: 0, counted_payment_ids: [] });
  w.subPayments = [{ id: "pay_first", status: "PENDING", dueDate: plusDays(5), value: 497 }];
  const r = await upgrade(w);
  assertEquals(r.status, 200);
  assertEquals(r.data.mode, "asaas");
  assertEquals(r.data.proRata, null);
  assertEquals(posts(w).length, 0, "nenhuma cobrança da diferença no trial");
  assertEquals(puts(w).length, 1);
  assertEquals(puts(w)[0].body, { value: 897, updatePendingPayments: true, description: "Ivero — Plano influencia" });
  assertEquals([w.row.plano, w.row.ciclo_contratado], ["influencia", "mensal"]);
  assertEquals(pending(w.row), NO_PENDING);
});

Deno.test("inadimplente: recusado com a mensagem exata e nada muda", async () => {
  const w = world({ status: "inadimplente" });
  const before = structuredClone(w.row);
  const r = await upgrade(w);
  assertEquals(r.status, 200);
  assertEquals(r.data, {
    ok: false, reason: "pagamento_em_atraso",
    message: "Sua mensalidade está em atraso. Pague a fatura vencida para poder mudar de plano.",
  });
  assertEquals(w.calls.filter((c) => c.url.includes("asaas.com")).length, 0);
  assertEquals(w.row, before);
});

Deno.test("downgrade: inalterado (PUT com valor menor e plano na hora, sem cobrança)", async () => {
  const w = world({ plano: "influencia" });
  w.sub.value = 897;
  const r = await upgrade(w, "presenca");
  assertEquals(r.status, 200);
  assertEquals(r.data.mode, "asaas");
  assertEquals(r.data.previousValue, 897);
  assertEquals(r.data.value, 497);
  assertEquals(posts(w).length, 0);
  assertEquals(puts(w)[0].body, { value: 497, updatePendingPayments: true, description: "Ivero — Plano presenca" });
  assertEquals(w.row.plano, "presenca");
});

Deno.test("cancelado: recusa de hoje preservada", async () => {
  const w = world({ status: "cancelado" });
  const r = await upgrade(w);
  assertEquals(r.data.reason, "assinatura_cancelada");
  assertEquals(posts(w).length + puts(w).length, 0);
});

// ── cancel com upgrade pendente ──────────────────────────────────────────────
const cancel = (w: World) => call(w, { action: "cancel", motivo: "teste" });

Deno.test("cancel com upgrade pendente: remove a cobrança, limpa as colunas; resposta igual à de hoje", async () => {
  const base = await cancel(world());
  const w = withOldCharge(world(OPEN_PENDING));
  const r = await cancel(w);
  assertEquals(r.status, 200);
  assertEquals(r.data, base.data, "resultado do cancelamento idêntico ao sem pedido pendente");
  assertEquals(w.charges.get("pay_old")?.deleted, true);
  assertEquals(pending(w.row), NO_PENDING);
  assertEquals(w.row.upgrade_ultimo_payment_id, "pay_old");
  assertEquals(w.row.status, "cancelado");
  assertEquals(w.errors.some((e) => e.startsWith("ALERTA upgrade pendente")), false);
});

Deno.test("cancel com upgrade pendente: DELETE falha → ALERTA no log, cancelamento continua e colunas limpas", async () => {
  const w = withOldCharge(world(OPEN_PENDING));
  w.deletePaymentStatus = 500;
  const r = await cancel(w);
  assertEquals(r.status, 200);
  assertEquals(w.row.status, "cancelado");
  assertEquals(pending(w.row), NO_PENDING);
  assertEquals(w.row.upgrade_ultimo_payment_id, "pay_old");
  assert(w.errors.includes(`ALERTA upgrade pendente não removido no cancelamento ${ROW_ID} pay_old`), w.errors.join("\n"));
});

Deno.test("cancel sem upgrade pendente: não chama DELETE /payments nem mexe nas colunas", async () => {
  const w = world();
  const r = await cancel(w);
  assertEquals(r.status, 200);
  assertEquals(asaas(w, "DELETE", /^\/payments\//).length, 0);
  const cancelPatch = w.patches.find((p) => p.status === "cancelado")!;
  assertEquals(UPGRADE_COLS.some((k) => k in cancelPatch) || "upgrade_ultimo_payment_id" in cancelPatch, false);
});
