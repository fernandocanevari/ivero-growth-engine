// P25a — cobrança da diferença de upgrade individual. Sem rede real:
// Supabase e Asaas simulados em memória.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseUpgradeRef } from "./upgrade-payment.ts";

let handler: ((req: Request) => Promise<Response>) | undefined;
const originalServe = Deno.serve;
const originalFetch = globalThis.fetch;
const originalGet = Deno.env.get;

Deno.env.get = (key: string) => ({ SUPABASE_URL: "https://upgrade.example.test", SUPABASE_SERVICE_ROLE_KEY: "fake-service", ASAAS_WEBHOOK_TOKEN: "fake-webhook" } as Record<string, string>)[key];
Deno.serve = ((h: (req: Request) => Promise<Response>) => { handler = h; return {} as ReturnType<typeof Deno.serve>; }) as typeof Deno.serve;
await import("./index.ts");
Deno.serve = originalServe;
Deno.env.get = originalGet;

const RID = "5b0c2d7e-1f3a-4c8b-9e2d-0a1b2c3d4e5f";
const UID = "ba97500d-53c6-426b-b5e6-7015bfcf4395";
const SUB = "sub_live";
const REF = `prorata:${RID}:autoridade`;

const memory = {
  row: {} as Record<string, unknown>,
  asaasCalls: [] as string[],
  asaasBodies: [] as unknown[],
  putStatus: 200,
  deleteStatus: 200,
  claims: [] as string[],
  dbWrites: 0,
  clearOnPut: false,
};

function reset() {
  memory.row = {
    id: RID, user_id: UID, status: "ativo", plano: "influencia", ciclo_contratado: "mensal",
    ciclos_pagos: 3, counted_payment_ids: ["pay_a", "pay_b", "pay_c"],
    data_vencimento: "2026-11-20T12:00:00.000Z", carencia_ate: null, trial_ends_at: null,
    plano_pretendido: null, ciclo_pretendido: null,
    asaas_subscription_id: SUB, asaas_customer_id: "cus_live", asaas_checkout_id: null, asaas_checkout_created_at: null,
    upgrade_pendente_plano: "autoridade", upgrade_pendente_ciclo: "anual",
    upgrade_pendente_valor_novo: 997, upgrade_pendente_diferenca: 120.5,
    upgrade_pendente_payment_id: "pay_up", upgrade_pendente_invoice_url: "https://sandbox.asaas.com/i/pay_up",
    upgrade_pendente_em: "2026-10-26T15:00:00.000Z",
  };
  memory.asaasCalls.length = 0;
  memory.asaasBodies.length = 0;
  memory.putStatus = 200;
  memory.deleteStatus = 200;
  memory.claims.length = 0;
  memory.dbWrites = 0;
  memory.clearOnPut = false;
}

const CLEARED = {
  upgrade_pendente_plano: null, upgrade_pendente_ciclo: null, upgrade_pendente_valor_novo: null,
  upgrade_pendente_diferenca: null, upgrade_pendente_payment_id: null, upgrade_pendente_invoice_url: null,
  upgrade_pendente_em: null,
};

/** Filtros PostgREST simples (eq./in.) contra a única linha em memória. */
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

async function send(body: Record<string, unknown>): Promise<{ status: number; out: Record<string, unknown>; logs: string[] }> {
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
      memory.asaasCalls.push(`${request.method} ${url.pathname.replace("/api/v3", "")}`);
      if (request.method === "PUT" && /^\/api\/v3\/subscriptions\/[^/]+$/.test(url.pathname)) {
        memory.asaasBodies.push(await request.json());
        if (memory.clearOnPut) memory.row.upgrade_pendente_payment_id = null;
        return new Response(JSON.stringify(memory.putStatus === 200 ? { id: SUB } : { errors: [{ description: "falha" }] }), { status: memory.putStatus });
      }
      if (request.method === "DELETE" && /^\/api\/v3\/payments\/[^/]+$/.test(url.pathname)) {
        return new Response(JSON.stringify({ deleted: memory.deleteStatus === 200 }), { status: memory.deleteStatus });
      }
      throw new Error(`unexpected_asaas:${request.method} ${url.pathname}`);
    }
    if (url.hostname !== "upgrade.example.test") throw new Error("unexpected_network");
    const table = url.pathname.split("/").pop();
    const method = request.method;
    const data = method === "GET" ? null : await request.json();
    let out: unknown = null;
    if (table === "claim_subscription_payment") {
      const id = data._payment_id;
      memory.claims.push(id);
      const r = memory.row;
      const counted = r.counted_payment_ids as string[];
      if (counted.includes(id)) out = { ciclos_pagos: r.ciclos_pagos, counted: false };
      else {
        counted.push(id);
        Object.assign(r, { ciclos_pagos: Number(r.ciclos_pagos) + 1, status: "ativo", carencia_ate: null, data_vencimento: data._data_vencimento, trial_ends_at: null, checkout_context: null, plano: r.plano_pretendido ?? r.plano, plano_pretendido: null });
        out = { ciclos_pagos: r.ciclos_pagos, counted: true };
      }
    } else if (table === "assinaturas") {
      const matches = rowMatches(url.searchParams);
      if (method === "GET") out = matches ? memory.row : null;
      else {
        if (matches) { Object.assign(memory.row, data); memory.dbWrites++; }
        const wantsRows = (request.headers.get("Prefer") ?? "").includes("return=representation");
        out = wantsRows ? (matches ? [{ id: memory.row.id }] : []) : null;
      }
    } else if (table === "agency_brands") {
      out = method === "GET" ? [] : null;
    } else throw new Error(`unexpected_table:${table}`);
    return new Response(out === null ? null : JSON.stringify(out), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  Deno.env.get = (key: string) => ({ SUPABASE_URL: "https://upgrade.example.test", SUPABASE_SERVICE_ROLE_KEY: "fake-service", ASAAS_WEBHOOK_TOKEN: "fake-webhook", ASAAS_ENV: "sandbox", ASAAS_API_KEY_SANDBOX: "fake-asaas" } as Record<string, string>)[key];
  try {
    const res = await h(new Request("https://function.example.test", { method: "POST", headers: { "asaas-access-token": "fake-webhook", "Content-Type": "application/json" }, body: JSON.stringify(body) }));
    return { status: res.status, out: await res.json(), logs };
  } finally {
    globalThis.fetch = originalFetch;
    Deno.env.get = originalGet;
    Object.assign(console, orig);
  }
}

const upgradePayment = (id = "pay_up", extra: Record<string, unknown> = {}) =>
  ({ id, customer: "cus_live", value: 120.5, dueDate: "2026-10-26", confirmedDate: "2026-10-26", externalReference: REF, ...extra });

const UNTOUCHED = ["status", "data_vencimento", "ciclos_pagos", "counted_payment_ids", "carencia_ate", "plano_pretendido", "ciclo_pretendido", "trial_ends_at", "asaas_subscription_id"] as const;
const pick = (r: Record<string, unknown>) => Object.fromEntries(UNTOUCHED.map((k) => [k, structuredClone(r[k])]));
const opts = { sanitizeOps: false, sanitizeResources: false };

Deno.test({ ...opts, name: "regex: só upgrade individual casa; agência e fidelidade não", fn: () => {
  assertEquals(parseUpgradeRef(REF), { assinaturaId: RID, plano: "autoridade" });
  assertEquals(parseUpgradeRef(`${REF}:2`), { assinaturaId: RID, plano: "autoridade" });
  assertEquals(parseUpgradeRef(`prorata:${RID}:agency:${UID}`), null);
  assertEquals(parseUpgradeRef(`fidelidade:${RID}:presenca`), null);
  assertEquals(parseUpgradeRef(`prorata:${RID}:dominio`), null);
  assertEquals(parseUpgradeRef(UID), null);
}});

Deno.test({ ...opts, name: "1) CONFIRMED com upgrade pendente: PUT primeiro, depois promove plano e ciclo e limpa as colunas", fn: async () => {
  reset();
  const before = pick(memory.row);
  const { status, out } = await send({ event: "PAYMENT_CONFIRMED", payment: upgradePayment() });
  assertEquals(status, 200);
  assertEquals(out, { received: true, upgrade: "applied" });
  assertEquals(memory.asaasCalls, [`PUT /subscriptions/${SUB}`]);
  assertEquals(memory.asaasBodies[0], { value: 997, updatePendingPayments: true, description: "Ivero — Plano autoridade" });
  assertEquals(memory.row.plano, "autoridade");
  assertEquals(memory.row.ciclo_contratado, "anual");
  for (const [k, v] of Object.entries(CLEARED)) assertEquals(memory.row[k], v, k);
  assertEquals(pick(memory.row), before);
  assertEquals(memory.claims.length, 0);
}});

Deno.test({ ...opts, name: "1b) ciclo pendente nulo mantém ciclo_contratado", fn: async () => {
  reset();
  memory.row.upgrade_pendente_ciclo = null;
  const { status } = await send({ event: "PAYMENT_RECEIVED", payment: upgradePayment() });
  assertEquals(status, 200);
  assertEquals(memory.row.plano, "autoridade");
  assertEquals(memory.row.ciclo_contratado, "mensal");
}});

Deno.test({ ...opts, name: "2) RECEIVED do mesmo pagamento depois do CONFIRMED → nada muda", fn: async () => {
  reset();
  await send({ event: "PAYMENT_CONFIRMED", payment: upgradePayment() });
  const snapshot = structuredClone(memory.row);
  memory.asaasCalls.length = 0;
  const writes = memory.dbWrites;
  const { status, out } = await send({ event: "PAYMENT_RECEIVED", payment: upgradePayment() });
  assertEquals(status, 200);
  assertEquals(out, { received: true, ignored: "one_off" });
  assertEquals(memory.row, snapshot);
  assertEquals(memory.asaasCalls, []);
  assertEquals(memory.dbWrites, writes);
}});

Deno.test({ ...opts, name: "2b) corrida: outra entrega limpa a pendência entre o PUT e o UPDATE → 0 linhas, 200, nada muda", fn: async () => {
  reset();
  memory.clearOnPut = true;
  const { status, out, logs } = await send({ event: "PAYMENT_CONFIRMED", payment: upgradePayment() });
  assertEquals(status, 200);
  assertEquals(out, { received: true, ignored: "upgrade_already_applied" });
  assertEquals(memory.row.plano, "influencia");
  assertEquals(memory.row.ciclo_contratado, "mensal");
  assertEquals(memory.dbWrites, 0);
  assert(logs.some((l) => l.includes("upgrade já processado")));
}});

Deno.test({ ...opts, name: "3) PUT falha → HTTP 500 e linha intacta", fn: async () => {
  reset();
  memory.putStatus = 500;
  const snapshot = structuredClone(memory.row);
  const { status, logs } = await send({ event: "PAYMENT_CONFIRMED", payment: upgradePayment() });
  assertEquals(status, 500);
  assertEquals(memory.row, snapshot);
  assertEquals(memory.dbWrites, 0);
  assert(logs.some((l) => l.includes("PUT /subscriptions falhou")));
}});

Deno.test({ ...opts, name: "3b) sem asaas_subscription_id → 500 sem chamar o Asaas e linha intacta", fn: async () => {
  reset();
  memory.row.asaas_subscription_id = null;
  const snapshot = structuredClone(memory.row);
  const { status } = await send({ event: "PAYMENT_CONFIRMED", payment: upgradePayment() });
  assertEquals(status, 500);
  assertEquals(memory.asaasCalls, []);
  assertEquals(memory.row, snapshot);
}});

for (const ev of ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]) {
  Deno.test({ ...opts, name: `4) ${ev} com payment.id diferente → ALERTA e nada muda`, fn: async () => {
    reset();
    const snapshot = structuredClone(memory.row);
    const { status, out, logs } = await send({ event: ev, payment: upgradePayment("pay_outro") });
    assertEquals(status, 200);
    assertEquals(out, { received: true, ignored: "one_off" });
    assertEquals(memory.row, snapshot);
    assertEquals(memory.asaasCalls, []);
    assert(logs.some((l) => l.includes(`ALERTA: pagamento de upgrade sem pendência correspondente pay_outro ${RID}`)), logs.join("\n"));
  }});
}

Deno.test({ ...opts, name: "4b) colunas vazias (situação atual, dormente) → ALERTA e nada muda", fn: async () => {
  reset();
  Object.assign(memory.row, CLEARED);
  const snapshot = structuredClone(memory.row);
  const { status, out, logs } = await send({ event: "PAYMENT_CONFIRMED", payment: upgradePayment() });
  assertEquals(status, 200);
  assertEquals(out, { received: true, ignored: "one_off" });
  assertEquals(memory.row, snapshot);
  assertEquals(memory.asaasCalls, []);
  assert(logs.some((l) => l.startsWith("ALERTA: pagamento de upgrade sem pendência correspondente")));
}});

for (const deleteStatus of [200, 404, 500]) {
  Deno.test({ ...opts, name: `5) OVERDUE (DELETE ${deleteStatus}) → apaga a cobrança e limpa o upgrade pendente`, fn: async () => {
    reset();
    memory.deleteStatus = deleteStatus;
    const before = pick(memory.row);
    const { status, out, logs } = await send({ event: "PAYMENT_OVERDUE", payment: upgradePayment() });
    assertEquals(status, 200);
    assertEquals(out, { received: true, upgrade: "expired" });
    assertEquals(memory.asaasCalls, ["DELETE /payments/pay_up"]);
    for (const [k, v] of Object.entries(CLEARED)) assertEquals(memory.row[k], v, k);
    assertEquals(memory.row.plano, "influencia");
    assertEquals(memory.row.ciclo_contratado, "mensal");
    assertEquals(pick(memory.row), before);
    assert(logs.some((l) => l === `upgrade expirado ${RID} autoridade`));
  }});
}

Deno.test({ ...opts, name: "6) DELETED → limpa o upgrade pendente sem chamar o Asaas", fn: async () => {
  reset();
  const before = pick(memory.row);
  const { status, out } = await send({ event: "PAYMENT_DELETED", payment: upgradePayment() });
  assertEquals(status, 200);
  assertEquals(out, { received: true, upgrade: "expired" });
  assertEquals(memory.asaasCalls, []);
  for (const [k, v] of Object.entries(CLEARED)) assertEquals(memory.row[k], v, k);
  assertEquals(memory.row.plano, "influencia");
  assertEquals(pick(memory.row), before);
}});

Deno.test({ ...opts, name: "6b) OVERDUE de outro payment.id → nada muda, sem DELETE", fn: async () => {
  reset();
  const snapshot = structuredClone(memory.row);
  const { status, out } = await send({ event: "PAYMENT_OVERDUE", payment: upgradePayment("pay_outro") });
  assertEquals(status, 200);
  assertEquals(out, { received: true, ignored: "one_off" });
  assertEquals(memory.asaasCalls, []);
  assertEquals(memory.row, snapshot);
}});

Deno.test({ ...opts, name: "7) outro evento (PAYMENT_CREATED) da cobrança de upgrade → ignorado como hoje", fn: async () => {
  reset();
  const snapshot = structuredClone(memory.row);
  const { status, out } = await send({ event: "PAYMENT_CREATED", payment: upgradePayment() });
  assertEquals(status, 200);
  assertEquals(out, { received: true, ignored: "one_off" });
  assertEquals(memory.row, snapshot);
  assertEquals(memory.asaasCalls, []);
}});

for (const ref of [`prorata:${RID}:agency:${UID}`, `fidelidade:${RID}:autoridade`]) {
  for (const ev of ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "PAYMENT_OVERDUE", "PAYMENT_DELETED"]) {
    Deno.test({ ...opts, name: `8) ${ref.split(":")[0]}${ref.includes(":agency:") ? " de agência" : ""} em ${ev} → one_off, nada muda`, fn: async () => {
      reset();
      const snapshot = structuredClone(memory.row);
      const { status, out } = await send({ event: ev, payment: upgradePayment("pay_up", { externalReference: ref }) });
      assertEquals(status, 200);
      assertEquals(out, { received: true, ignored: "one_off" });
      assertEquals(memory.row, snapshot);
      assertEquals(memory.asaasCalls, []);
      assertEquals(memory.claims.length, 0);
    }});
  }
}

Deno.test({ ...opts, name: "9) mensalidade normal (com subscription) segue o fluxo de antes e não toca no upgrade pendente", fn: async () => {
  reset();
  const { status, out } = await send({ event: "PAYMENT_CONFIRMED", payment: { id: "pay_mes4", subscription: SUB, customer: "cus_live", confirmedDate: "2026-10-26", externalReference: UID } });
  assertEquals(status, 200);
  assertEquals(out, { received: true });
  assertEquals(memory.claims, ["pay_mes4"]);
  assertEquals(memory.row.ciclos_pagos, 4);
  assertEquals(memory.row.plano, "influencia");
  assertEquals(memory.row.upgrade_pendente_payment_id, "pay_up");
  assertEquals(memory.row.upgrade_pendente_plano, "autoridade");
  assertEquals(memory.asaasCalls, []);
}});
