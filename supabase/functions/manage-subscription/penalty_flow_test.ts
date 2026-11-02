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
  /** HTTP forçado no DELETE da assinatura (limpeza não confirmada). */
  deleteSubStatus?: number;
  /** A gravação 'cancelado' falha por erro de banco. */
  cancelWriteFails?: boolean;
  /** P27: o webhook SUBSCRIPTION_DELETED desvincula e cancela a linha logo antes da gravação do cancel. */
  webhookWinsOnCancel?: boolean;
  /** P27: com raceOnCancel, a outra chamada também grava asaas_subscription_id_anterior = sub_test. */
  raceAnterior?: boolean;
  /** P27: quantas gravações da correção pós-webhook falham por erro de banco. */
  raceWriteFailures?: number;
  /** P27: número de gravações da correção pós-webhook recebidas. */
  raceWrites?: number;
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
  return (await callMany(w, [body]))[0];
}

/** Executa os pedidos em paralelo sobre o mesmo mundo simulado. */
async function callMany(w: World, bodies: Record<string, unknown>[]) {
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
          if (w.raceAnterior) Object.assign(w.row, { asaas_subscription_id: null, asaas_subscription_id_anterior: "sub_test" });
        }
        // P27: webhook SUBSCRIPTION_DELETED (subscriptionRemovalPatch) chega antes da gravação do cancel.
        if (w.webhookWinsOnCancel && url.searchParams.get("status") === "neq.cancelado" && w.row.status !== "cancelado" && w.row.asaas_subscription_id) {
          Object.assign(w.row, { status: "cancelado", carencia_ate: null, asaas_subscription_id: null, asaas_subscription_id_anterior: w.row.asaas_subscription_id });
        }
        if (url.searchParams.has("multa_ultimo_payment_id")) {
          w.raceWrites = (w.raceWrites ?? 0) + 1;
          if ((w.raceWriteFailures ?? 0) > 0) {
            w.raceWriteFailures = (w.raceWriteFailures ?? 0) - 1;
            return reply({ message: "db down", code: "XX000" }, 500);
          }
        }
        if (w.cancelWriteFails && reqBody?.status === "cancelado") return reply({ message: "db down", code: "XX000" }, 500);
...
  try {
    const token = `${btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${btoa(JSON.stringify({ sub: "test-user", exp: 4102444800 }))}.c2ln`;
    assert(handler);
    return await Promise.all(bodies.map(async (body) => {
      const res = await handler!(new Request("https://function.invalid", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }));
      return { status: res.status, data: await res.json() };
    }));
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

// ── P26-fix1: cancelamento repetido ainda limpa o Asaas ──────────────────────
const UNVERIFIED = { error: "Não conseguimos confirmar o cancelamento agora e, por isso, nada foi alterado. Tente de novo em instantes.", code: "cancel_unverified" };
const deletes = (w: World) => w.calls.filter((c) => c.method === "DELETE" && c.path.startsWith("/subscriptions/")).map((c) => c.path.split("/").pop());

Deno.test("fix1: já cancelada com assinatura viva sobrando no Asaas → removida, sem nova cobrança, multa gravada devolvida", async () => {
  const w = world(pendingRow("pay_x"));
  charge(w, "pay_x");
  const before = structuredClone(w.row);
  const r = await cancel(w);
  assertEquals(r.status, 200);
  assertEquals(deletes(w), ["sub_test"]);
  assertEquals(r.data.cleaned, ["sub_test"]);
  assertEquals(r.data.reused, true);
  assertEquals(r.data.multa, { value: MULTA, ciclos: 3, invoiceUrl: "https://invoice.invalid/pay_x" });
  assertEquals(posts(w).length, 0, "multa nunca cobrada de novo");
  const { __subDeleted: _, ...after } = w.row;
  assertEquals(after, before, "linha não muda");
});

Deno.test("fix1: já cancelada sem nada a limpar → nada removido, sem cobrança, sem 'cleaned'", async () => {
  const w = world({ ...pendingRow("pay_x"), __subDeleted: true });
  const before = structuredClone(w.row);
  const r = await cancel(w);
  assertEquals(r.status, 200);
  assertEquals(r.data.reused, true);
  assertEquals("cleaned" in r.data, false);
  assertEquals(deletes(w), []);
  assertEquals(posts(w).length, 0);
  assertEquals(w.row, before);
});

Deno.test("fix1: já cancelada e limpeza não confirmada → mesmo 502 do 1º cancelamento, linha intacta", async () => {
  const first = await cancel(world({}, { deleteSubStatus: 503 }));
  const w = world(pendingRow("pay_x"), { deleteSubStatus: 503 });
  const before = structuredClone(w.row);
  const r = await cancel(w);
  assertEquals(r.status, 502);
  assertEquals(r.data, UNVERIFIED);
  assertEquals(first.status, 502);
  assertEquals(r.data, first.data, "mesmo resultado do primeiro cancelamento");
  assertEquals(posts(w).length, 0);
  assertEquals(w.row, before);
});

Deno.test("fix1 B: gravação do cancelamento falha depois de criar a multa → cobrança removida, erro devolvido, linha não cancelada", async () => {
  const w = world({}, { cancelWriteFails: true });
  const r = await cancel(w);
  assertEquals(r.status, 500);
  assert(r.data.error, "resposta de erro");
  assertEquals(posts(w).length, 1);
  assertEquals(w.charges.get("pay_m1")?.deleted, true, "nenhuma cobrança órfã");
  assertEquals(w.row.status, "ativo");
  assertEquals(w.row.multa_pendente_valor, null);
});

// ── P26-fix2: prévia do cancelamento = o que o cancelamento grava ───────────
const CLIENTE71 = { plano: "influencia", ciclos_pagos: 2, counted_payment_ids: ["p1", "p2"], compromisso_inicio: new Date(Date.now() - 8 * DAY).toISOString(), desconto_acumulado: 200, ciclos_no_upgrade: 2 };

Deno.test("preview_cancel (caso cliente71): 200 { ok, multa: { valor: 200, ciclos: 2 } } sem gravar nada e sem chamar o Asaas", async () => {
  const w = world(CLIENTE71);
  const before = structuredClone(w.row);
  const r = await call(w, { action: "preview_cancel" });
  assertEquals(r.status, 200);
  assertEquals(r.data, { ok: true, multa: { valor: 200, ciclos: 2 }, emCompromisso: true });
  assertEquals(w.calls.length, 0, "nenhuma chamada ao Asaas");
  assertEquals(w.row, before, "nenhuma gravação");
});

for (const [label, row] of [["cliente71 (snapshot)", CLIENTE71], ["linha antiga sem snapshot", { plano: "influencia", ciclos_pagos: 2, counted_payment_ids: ["p1", "p2"] }], ["Presença 1 ciclo", { ciclos_pagos: 1, counted_payment_ids: ["p1"] }]] as const) {
  Deno.test(`preview_cancel == cancel (${label}): mesmo valor e mesmos ciclos gravados`, async () => {
    const w = world(row as Row);
    const prev = await call(w, { action: "preview_cancel" });
    const r = await cancel(w);
    assertEquals(r.status, 200);
    assertEquals(w.row.multa_pendente_valor, prev.data.multa.valor);
    assertEquals(w.row.multa_pendente_ciclos, prev.data.multa.ciclos);
    assertEquals(posts(w)[0].body.value, prev.data.multa.valor);
  });
}

Deno.test("cancel: 2 ciclos pagos em 8 dias contam os 2 (sem trava de calendário)", async () => {
  const w = world({ plano: "influencia", ciclos_pagos: 2, counted_payment_ids: ["p1", "p2"], compromisso_inicio: new Date(Date.now() - 8 * DAY).toISOString() });
  await cancel(w);
  assertEquals(w.row.multa_pendente_valor, 360);
  assertEquals(w.row.multa_pendente_ciclos, 2);
});

Deno.test("preview_cancel sem assinatura viva → 200 ok:false em português", async () => {
  const w = world({ status: "expirado" });
  const r = await call(w, { action: "preview_cancel" });
  assertEquals(r.status, 200);
  assertEquals(r.data, { ok: false, reason: "sem_assinatura", message: "Não encontramos uma assinatura ativa para cancelar." });
  assertEquals(w.calls.length, 0);
});

Deno.test("preview_cancel mensal → valor 0, sem compromisso", async () => {
  const w = world({ ciclo_contratado: "mensal" });
  const r = await call(w, { action: "preview_cancel" });
  assertEquals(r.data, { ok: true, multa: { valor: 0, ciclos: 0 }, emCompromisso: false });
});

// ── P27: webhook SUBSCRIPTION_DELETED cancela a linha antes da gravação do cancel ──
const P27_UPGRADE = {
  upgrade_pendente_plano: "influencia", upgrade_pendente_ciclo: "anual", upgrade_pendente_valor_novo: 897,
  upgrade_pendente_diferenca: 50, upgrade_pendente_payment_id: "pay_up", upgrade_pendente_invoice_url: "https://invoice.invalid/pay_up",
  upgrade_pendente_em: new Date(Date.now() - DAY).toISOString(), upgrade_ultimo_payment_id: null,
};

Deno.test("P27 webhook vence com multa: multa gravada, cobrança mantida, resposta normal com multa e link", async () => {
  const w = world({}, { webhookWinsOnCancel: true });
  const r = await cancel(w);
  assertEquals(r.status, 200);
  assertEquals(r.data.reused, undefined, "resposta normal, não reused");
  assertEquals(r.data.multa, { value: MULTA, ciclos: 3, invoiceUrl: "https://invoice.invalid/pay_m1" });
  assertEquals(posts(w).length, 1);
  assertEquals(w.charges.get("pay_m1")?.deleted, undefined, "cobrança NÃO removida");
  assertEquals(w.row.status, "cancelado");
  assertEquals(w.row.asaas_subscription_id, null);
  assertEquals(w.row.asaas_subscription_id_anterior, "sub_test");
  assertEquals(w.row.multa_pendente_valor, MULTA);
  assertEquals(w.row.multa_pendente_ciclos, 3);
  assertEquals(w.row.multa_pendente_payment_id, "pay_m1");
  assertEquals(w.row.multa_pendente_invoice_url, "https://invoice.invalid/pay_m1");
  assert(w.row.multa_pendente_em, "multa_pendente_em gravado");
  assertEquals(w.raceWrites, 1);
});

Deno.test("P27 webhook vence: patch completo aplicado (upgrade pendente limpo, upgrade_ultimo_payment_id, carência)", async () => {
  const w = world({ ...P27_UPGRADE, carencia_ate: new Date(Date.now() + DAY).toISOString() }, { webhookWinsOnCancel: true });
  charge(w, "pay_up");
  const r = await cancel(w);
  assertEquals(r.status, 200);
  assertEquals(r.data.multa.value, MULTA);
  for (const k of ["upgrade_pendente_plano", "upgrade_pendente_ciclo", "upgrade_pendente_valor_novo", "upgrade_pendente_diferenca", "upgrade_pendente_payment_id", "upgrade_pendente_invoice_url", "upgrade_pendente_em"]) {
    assertEquals(w.row[k], null, k);
  }
  assertEquals(w.row.upgrade_ultimo_payment_id, "pay_up");
  assertEquals(w.row.carencia_ate, null);
  assertEquals(w.row.multa_pendente_payment_id, "pay_m1");
  assertEquals(w.charges.get("pay_up")?.deleted, true, "cobrança do upgrade removida como antes");
  assertEquals(w.charges.get("pay_m1")?.deleted, undefined);
});

Deno.test("P27 webhook vence sem multa (mensal): sem cobrança, campos de upgrade ainda gravados", async () => {
  const w = world({ ciclo_contratado: "mensal", ...P27_UPGRADE }, { webhookWinsOnCancel: true });
  charge(w, "pay_up");
  const r = await cancel(w);
  assertEquals(r.status, 200);
  assertEquals(r.data.reused, undefined);
  assertEquals(r.data.multa, null);
  assertEquals(posts(w).length, 0);
  assertEquals(w.row.upgrade_pendente_payment_id, null);
  assertEquals(w.row.upgrade_ultimo_payment_id, "pay_up");
  assertEquals(w.row.multa_pendente_valor, null);
  assertEquals(w.row.status, "cancelado");
});

Deno.test("P27 webhook vence sem multa (teste grátis): data_vencimento = fim do teste ainda gravado", async () => {
  const trialEnd = new Date(Date.now() + 4 * DAY).toISOString();
  const w = world({ status: "trial", ciclos_pagos: 0, counted_payment_ids: [], trial_ends_at: trialEnd, data_vencimento: null }, { webhookWinsOnCancel: true });
  const r = await cancel(w);
  assertEquals(r.status, 200);
  assertEquals(r.data.reused, undefined);
  assertEquals(r.data.isTrial, true);
  assertEquals(r.data.accessUntil, trialEnd);
  assertEquals(r.data.multa, null);
  assertEquals(posts(w).length, 0);
  assertEquals(w.row.data_vencimento, trialEnd);
  assertEquals(w.row.status, "cancelado");
});

Deno.test("P27 webhook vence sem multa e nada a completar: sem gravação extra, resposta normal", async () => {
  const w = world({ ciclo_contratado: "mensal" }, { webhookWinsOnCancel: true });
  const r = await cancel(w);
  assertEquals(r.status, 200);
  assertEquals(r.data.reused, undefined);
  assertEquals(r.data.multa, null);
  assertEquals(w.raceWrites ?? 0, 0);
  assertEquals(w.row.status, "cancelado");
});

Deno.test("P27 duplo clique: as duas chamadas perdem a gravação principal; só uma multa fica, a outra cobrança é removida", async () => {
  const w = world({}, { webhookWinsOnCancel: true });
  const [a, b] = await callMany(w, [{ action: "cancel", motivo: "a" }, { action: "cancel", motivo: "b" }]);
  assertEquals(a.status, 200);
  assertEquals(b.status, 200);
  assertEquals(posts(w).length, 2, "as duas chamadas chegaram a criar cobrança");
  const alive = [...w.charges.values()].filter((c) => !c.deleted);
  assertEquals(alive.length, 1, "exatamente uma cobrança permanece");
  assertEquals(w.row.multa_pendente_payment_id, alive[0].id);
  assertEquals(w.row.multa_pendente_valor, MULTA);
  const reused = [a, b].filter((r) => r.data.reused === true);
  assertEquals(reused.length, 1, "uma resposta reused");
  assertEquals(reused[0].data.multa.invoiceUrl, alive[0].invoiceUrl);
  const normal = [a, b].find((r) => r.data.reused !== true)!;
  assertEquals(normal.data.multa.invoiceUrl, alive[0].invoiceUrl);
});

Deno.test("P27 duplicata genuína (multa já gravada por outra chamada, mesmo anterior): cobrança desta removida, reused", async () => {
  const w = world({}, { raceOnCancel: true, raceAnterior: true });
  const r = await cancel(w);
  assertEquals(r.status, 200);
  assertEquals(r.data.reused, true);
  assertEquals(w.charges.get("pay_m1")?.deleted, true);
  assertEquals(w.row.multa_pendente_payment_id, "pay_other");
  assertEquals(r.data.multa.invoiceUrl, "https://invoice.invalid/pay_other");
  assertEquals(w.raceWrites ?? 0, 0);
});

Deno.test("P27 erro de banco na correção pós-webhook: 1 nova tentativa resolve", async () => {
  const w = world({}, { webhookWinsOnCancel: true, raceWriteFailures: 1 });
  const r = await cancel(w);
  assertEquals(r.status, 200);
  assertEquals(w.raceWrites, 2);
  assertEquals(w.row.multa_pendente_payment_id, "pay_m1");
  assertEquals(w.charges.get("pay_m1")?.deleted, undefined);
  assertEquals(w.errors.some((e) => e.includes("ALERTA cancel")), false);
});

Deno.test("P27 erro de banco persistente na correção pós-webhook: ALERTA, cobrança mantida, 200 com a multa", async () => {
  const w = world({}, { webhookWinsOnCancel: true, raceWriteFailures: 2 });
  const r = await cancel(w);
  assertEquals(r.status, 200);
  assertEquals(w.raceWrites, 2, "uma tentativa + uma nova tentativa");
  assertEquals(r.data.reused, undefined);
  assertEquals(r.data.multa, { value: MULTA, ciclos: 3, invoiceUrl: "https://invoice.invalid/pay_m1" });
  assertEquals(w.charges.get("pay_m1")?.deleted, undefined, "cobrança NÃO removida");
  assert(w.errors.some((e) => e.includes("ALERTA cancel: multa criada mas não gravada") && e.includes("pay_m1") && e.includes(String(MULTA))), w.errors.join("\n"));
  assertEquals(w.row.multa_pendente_valor, null, "não gravada (banco fora)");
});
