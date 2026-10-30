// P26 — webhook da multa de fidelidade. Sem rede real: Supabase e Asaas
// simulados em memória. Rode em uma invocação própria de `deno test`.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseFidelidadeRef } from "./fidelidade-payment.ts";

let handler: ((req: Request) => Promise<Response>) | undefined;
const originalServe = Deno.serve;
const originalFetch = globalThis.fetch;
const originalGet = Deno.env.get;
const ENV = { SUPABASE_URL: "https://multa.example.test", SUPABASE_SERVICE_ROLE_KEY: "fake-service", ASAAS_WEBHOOK_TOKEN: "fake-webhook", ASAAS_ENV: "sandbox", ASAAS_API_KEY_SANDBOX: "fake-asaas" } as Record<string, string>;

Deno.env.get = (key: string) => ENV[key];
Deno.serve = ((h: (req: Request) => Promise<Response>) => { handler = h; return {} as ReturnType<typeof Deno.serve>; }) as typeof Deno.serve;
await import("./index.ts");
Deno.serve = originalServe;
Deno.env.get = originalGet;

const RID = "5b0c2d7e-1f3a-4c8b-9e2d-0a1b2c3d4e5f";
const UID = "ba97500d-53c6-426b-b5e6-7015bfcf4395";
const REF = `fidelidade:${RID}:presenca`;

const memory = {
  row: {} as Record<string, unknown>,
  asaasCalls: [] as string[],
  dbWrites: 0,
  claims: 0,
  readError: null as null | { status: number; code: string },
  updateError: null as null | { status: number; code: string },
};

function reset(extra: Record<string, unknown> = {}) {
  memory.row = {
    id: RID, user_id: UID, status: "cancelado", plano: "presenca", ciclo_contratado: "anual",
    ciclos_pagos: 3, counted_payment_ids: ["a", "b", "c"], data_vencimento: "2026-11-20T12:00:00.000Z",
    carencia_ate: null, trial_ends_at: null, asaas_subscription_id: null, asaas_customer_id: "cus_1",
    multa_pendente_valor: 600, multa_pendente_ciclos: 3, multa_pendente_payment_id: "pay_multa",
    multa_pendente_invoice_url: "https://sandbox.asaas.com/i/pay_multa", multa_pendente_em: "2026-10-30T15:00:00.000Z",
    multa_ultimo_payment_id: null,
    ...extra,
  };
  memory.asaasCalls.length = 0;
  memory.dbWrites = 0;
  memory.claims = 0;
  memory.readError = null;
  memory.updateError = null;
}

function rowMatches(params: URLSearchParams): boolean {
  for (const [col, raw] of params.entries()) {
    if (["select", "order", "limit", "offset"].includes(col)) continue;
    const val = memory.row[col];
    if (raw.startsWith("eq.")) { if (val == null || String(val) !== raw.slice(3)) return false; }
    else if (raw.startsWith("in.(")) {
      const list = raw.slice(4, -1).split(",").map((s) => s.replace(/^"|"$/g, ""));
      if (!list.includes(String(val))) return false;
    }
  }
  return true;
}

async function send(body: Record<string, unknown>) {
  const h = handler;
  if (!h) throw new Error("handler_not_captured");
  const logs: string[] = [];
  const orig = { log: console.log, warn: console.warn, error: console.error };
  const capture = (...a: unknown[]) => { logs.push(a.map(String).join(" ")); };
  console.log = capture; console.warn = capture; console.error = capture;
  globalThis.fetch = async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const url = new URL(request.url);
    if (url.hostname === "sandbox.asaas.com") {
      memory.asaasCalls.push(`${request.method} ${url.pathname}`);
      throw new Error("asaas_must_not_be_called");
    }
    if (url.hostname !== "multa.example.test") throw new Error("unexpected_network");
    const table = url.pathname.split("/").pop();
    const method = request.method;
    const data = method === "GET" ? null : await request.json();
    const fail = method === "GET" ? memory.readError : memory.updateError;
    if (table === "assinaturas" && fail) {
      return new Response(JSON.stringify({ message: "falha simulada", code: fail.code }), { status: fail.status, headers: { "Content-Type": "application/json" } });
    }
    let out: unknown = null;
    if (table === "assinaturas") {
      const matches = rowMatches(url.searchParams);
      if (method === "GET") out = matches ? memory.row : null;
      else {
        if (matches) { Object.assign(memory.row, data); memory.dbWrites++; }
        const wantsRows = (request.headers.get("Prefer") ?? "").includes("return=representation");
        out = wantsRows ? (matches ? [{ id: memory.row.id }] : []) : null;
      }
    } else if (table === "claim_subscription_payment") {
      memory.claims++;
      out = { ciclos_pagos: 3, counted: false };
    } else if (table === "agency_brands") {
      out = method === "GET" ? [] : null;
    } else throw new Error(`unexpected_table:${table}`);
    return new Response(out === null ? null : JSON.stringify(out), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  Deno.env.get = (key: string) => ENV[key];
  try {
    const res = await h(new Request("https://function.example.test", { method: "POST", headers: { "asaas-access-token": "fake-webhook", "Content-Type": "application/json" }, body: JSON.stringify(body) }));
    return { status: res.status, out: await res.json(), logs };
  } finally {
    globalThis.fetch = originalFetch;
    Deno.env.get = originalGet;
    Object.assign(console, orig);
  }
}

const payment = (id = "pay_multa", extra: Record<string, unknown> = {}) =>
  ({ id, customer: "cus_1", value: 600, dueDate: "2026-10-30", externalReference: REF, ...extra });
const ACCESS = ["status", "carencia_ate", "data_vencimento", "ciclos_pagos", "counted_payment_ids", "plano", "trial_ends_at", "asaas_subscription_id"] as const;
const access = () => Object.fromEntries(ACCESS.map((k) => [k, structuredClone(memory.row[k])]));
const CLEARED = { multa_pendente_valor: null, multa_pendente_ciclos: null, multa_pendente_payment_id: null, multa_pendente_invoice_url: null, multa_pendente_em: null };
const opts = { sanitizeOps: false, sanitizeResources: false };

Deno.test({ ...opts, name: "regex: fidelidade com e sem plano casa; agência, prorata e plano inválido não", fn: () => {
  assertEquals(parseFidelidadeRef(REF), { assinaturaId: RID, plano: "presenca" });
  assertEquals(parseFidelidadeRef(`fidelidade:${RID}`), { assinaturaId: RID, plano: null });
  assertEquals(parseFidelidadeRef(`fidelidade:${RID}:dominio`), null);
  assertEquals(parseFidelidadeRef(`prorata:${RID}:presenca`), null);
  assertEquals(parseFidelidadeRef(`prorata:${RID}:agency:${UID}`), null);
}});

for (const ev of ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]) {
  Deno.test({ ...opts, name: `${ev} da multa → limpa a pendência e grava multa_ultimo_payment_id; acesso intacto`, fn: async () => {
    reset();
    const before = access();
    const { status, out } = await send({ event: ev, payment: payment() });
    assertEquals(status, 200);
    assertEquals(out, { received: true, multa: "paid" });
    for (const [k, v] of Object.entries(CLEARED)) assertEquals(memory.row[k], v, k);
    assertEquals(memory.row.multa_ultimo_payment_id, "pay_multa");
    assertEquals(access(), before);
    assertEquals(memory.claims, 0);
    assertEquals(memory.asaasCalls, []);
  }});
}

Deno.test({ ...opts, name: "evento repetido com o mesmo id (RECEIVED depois do CONFIRMED) → 'multa já tratada', nada muda", fn: async () => {
  reset();
  await send({ event: "PAYMENT_CONFIRMED", payment: payment() });
  const snapshot = structuredClone(memory.row);
  const writes = memory.dbWrites;
  const { status, out, logs } = await send({ event: "PAYMENT_RECEIVED", payment: payment() });
  assertEquals(status, 200);
  assertEquals(out, { received: true, ignored: "one_off" });
  assert(logs.includes("multa já tratada pay_multa PAYMENT_RECEIVED"), logs.join("\n"));
  assertEquals(memory.row, snapshot);
  assertEquals(memory.dbWrites, writes);
}});

Deno.test({ ...opts, name: "PAYMENT_DELETED (perdão) → limpa a pendência; acesso intacto", fn: async () => {
  reset();
  const before = access();
  const { status, out } = await send({ event: "PAYMENT_DELETED", payment: payment() });
  assertEquals(status, 200);
  assertEquals(out, { received: true, multa: "forgiven" });
  for (const [k, v] of Object.entries(CLEARED)) assertEquals(memory.row[k], v, k);
  assertEquals(memory.row.multa_ultimo_payment_id, "pay_multa");
  assertEquals(access(), before);
}});

Deno.test({ ...opts, name: "PAYMENT_OVERDUE da multa → nada muda (status, carência, acesso e bloqueio)", fn: async () => {
  reset();
  const snapshot = structuredClone(memory.row);
  const { status, out, logs } = await send({ event: "PAYMENT_OVERDUE", payment: payment() });
  assertEquals(status, 200);
  assertEquals(out, { received: true, multa: "overdue" });
  assertEquals(memory.row, snapshot);
  assertEquals(memory.dbWrites, 0);
  assert(logs.some((l) => l.startsWith("multa vencida, bloqueio mantido")));
}});

for (const ev of ["PAYMENT_REFUNDED", "PAYMENT_CHARGEBACK_REQUESTED"]) {
  Deno.test({ ...opts, name: `${ev} da multa → 'ALERTA multa estornada', nada muda`, fn: async () => {
    reset();
    const snapshot = structuredClone(memory.row);
    const { status, logs } = await send({ event: ev, payment: payment() });
    assertEquals(status, 200);
    assertEquals(memory.row, snapshot);
    assertEquals(memory.dbWrites, 0);
    assert(logs.some((l) => l.startsWith("ALERTA multa estornada")), logs.join("\n"));
  }});
}

Deno.test({ ...opts, name: "linha antiga sem dados de multa → 'multa sem registro, ignorada', 200", fn: async () => {
  reset({ ...CLEARED });
  const snapshot = structuredClone(memory.row);
  const { status, out, logs } = await send({ event: "PAYMENT_CONFIRMED", payment: payment() });
  assertEquals(status, 200);
  assertEquals(out, { received: true, ignored: "one_off" });
  assertEquals(memory.row, snapshot);
  assert(logs.some((l) => l.startsWith("multa sem registro, ignorada")));
}});

Deno.test({ ...opts, name: "assinatura inexistente → 'multa sem registro, ignorada', 200", fn: async () => {
  reset({ id: "00000000-0000-4000-8000-000000000000" });
  const { status, logs } = await send({ event: "PAYMENT_CONFIRMED", payment: payment() });
  assertEquals(status, 200);
  assertEquals(memory.dbWrites, 0);
  assert(logs.some((l) => l.startsWith("multa sem registro, ignorada")));
}});

Deno.test({ ...opts, name: "pagamento de OUTRA cobrança de multa → ALERTA, bloqueio mantido", fn: async () => {
  reset();
  const snapshot = structuredClone(memory.row);
  const { status, logs } = await send({ event: "PAYMENT_CONFIRMED", payment: payment("pay_outra") });
  assertEquals(status, 200);
  assertEquals(memory.row, snapshot);
  assert(logs.some((l) => l.startsWith("ALERTA multa paga sem pendência correspondente")));
}});

Deno.test({ ...opts, name: "falha permanente (erro de dado no banco, 22P02) → 200 + ALERTA multa, nada muda", fn: async () => {
  reset();
  memory.updateError = { status: 400, code: "22P02" };
  const snapshot = structuredClone(memory.row);
  const { status, logs } = await send({ event: "PAYMENT_CONFIRMED", payment: payment() });
  assertEquals(status, 200);
  assertEquals(memory.row, snapshot);
  assert(logs.some((l) => l.startsWith("ALERTA multa não tratada")), logs.join("\n"));
}});

Deno.test({ ...opts, name: "falha permanente: evento sem payment.id → 200 + ALERTA multa", fn: async () => {
  reset();
  const { status, logs } = await send({ event: "PAYMENT_CONFIRMED", payment: payment("") });
  assertEquals(status, 200);
  assertEquals(memory.dbWrites, 0);
  assert(logs.some((l) => l.startsWith("ALERTA multa sem payment.id")));
}});

for (const [label, setup] of [
  ["leitura indisponível (503)", () => { memory.readError = { status: 503, code: "57P01" }; }],
  ["gravação indisponível (503)", () => { memory.updateError = { status: 503, code: "57P01" }; }],
] as const) {
  Deno.test({ ...opts, name: `falha transitória: ${label} → 500, nada muda`, fn: async () => {
    reset();
    setup();
    const snapshot = structuredClone(memory.row);
    const { status } = await send({ event: "PAYMENT_CONFIRMED", payment: payment() });
    assertEquals(status, 500);
    assertEquals(memory.row, snapshot);
  }});
}

for (const ev of ["PAYMENT_CONFIRMED", "PAYMENT_DELETED"]) {
  Deno.test({ ...opts, name: `cobrança de agência (":agency:") em ${ev} → comportamento de antes (one_off)`, fn: async () => {
    reset();
    const snapshot = structuredClone(memory.row);
    const { status, out } = await send({ event: ev, payment: payment("pay_ag", { externalReference: `prorata:${RID}:agency:${UID}` }) });
    assertEquals(status, 200);
    assertEquals(out, { received: true, ignored: "one_off" });
    assertEquals(memory.row, snapshot);
  }});
}

Deno.test({ ...opts, name: "PAYMENT_CREATED da multa → segue como avulsa (one_off), nada muda", fn: async () => {
  reset();
  const snapshot = structuredClone(memory.row);
  const { status, out } = await send({ event: "PAYMENT_CREATED", payment: payment() });
  assertEquals(status, 200);
  assertEquals(out, { received: true, ignored: "one_off" });
  assertEquals(memory.row, snapshot);
}});
