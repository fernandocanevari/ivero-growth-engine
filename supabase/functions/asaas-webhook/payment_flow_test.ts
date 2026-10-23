import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

let handler: ((req: Request) => Promise<Response>) | undefined;
const originalServe = Deno.serve;
const originalFetch = globalThis.fetch;
const originalGet = Deno.env.get;
const memory = { row: {} as Record<string, unknown>, brand: {} as Record<string, unknown>, counted: new Set<string>(), claims: [] as string[] };

// No network or real secrets: handlers run with an in-memory Supabase transport.
Deno.env.get = (key: string) => ({ SUPABASE_URL: "https://payments.example.test", SUPABASE_SERVICE_ROLE_KEY: "fake-service", ASAAS_WEBHOOK_TOKEN: "fake-webhook" } as Record<string, string>)[key];
Deno.serve = ((h: (req: Request) => Promise<Response>) => { handler = h; return {} as ReturnType<typeof Deno.serve>; }) as typeof Deno.serve;
await import("./index.ts");
Deno.serve = originalServe;
Deno.env.get = originalGet;

const CK = "272a8eef-c864-415e-8f8e-94310f789fcd";
const UID = "ba97500d-53c6-426b-b5e6-7015bfcf4395";
const AT = "2026-10-17T00:32:11Z";

function reset(status: string, trial: string | null = null, subscriptionId: string | null = null) {
  memory.row = { id: "row_test", user_id: UID, status, plano: "presenca", plano_pretendido: "presenca", ciclo_pretendido: "mensal", ciclo_contratado: "mensal", ciclos_pagos: 0, trial_ends_at: trial, asaas_subscription_id: subscriptionId, asaas_checkout_id: CK, asaas_checkout_created_at: AT };
  memory.brand = { id: "brand_link", brand_id: "brand_test", plano: null, plano_pretendido: "presenca", status: "ativo" };
  memory.counted.clear();
  memory.claims.length = 0;
}

async function event(body: Record<string, unknown>) {
  const h = handler;
  if (!h) throw new Error("handler_not_captured");
  const timers: number[] = [];
  const originalInterval = globalThis.setInterval;
  globalThis.setInterval = ((...args: Parameters<typeof setInterval>) => {
    const timer = originalInterval(...args);
    timers.push(timer);
    return timer;
  }) as typeof setInterval;
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
    } else if (table === "claim_subscription_payment") {
      // Espelha a instrução única do banco: só a 1ª chamada por payment_id altera a linha.
      const id = data._payment_id;
      memory.claims.push(id);
      if (memory.counted.has(id)) {
        out = { ciclos_pagos: memory.row.ciclos_pagos, counted: false };
      } else {
        memory.counted.add(id);
        const r = memory.row;
        const promotes = r.plano_pretendido != null;
        Object.assign(r, {
          ciclos_pagos: Number(r.ciclos_pagos ?? 0) + 1,
          status: "ativo", carencia_ate: null, data_vencimento: data._data_vencimento, trial_ends_at: null, checkout_context: null,
          plano: r.plano_pretendido ?? r.plano,
          ciclo_contratado: promotes && r.ciclo_pretendido ? r.ciclo_pretendido : r.ciclo_contratado,
          ciclo_pretendido: promotes ? null : r.ciclo_pretendido,
          plano_pretendido: null,
          asaas_subscription_id: data._asaas_subscription_id || r.asaas_subscription_id,
          asaas_customer_id: data._asaas_customer_id || r.asaas_customer_id,
        });
        out = { ciclos_pagos: r.ciclos_pagos, counted: true };
      }
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
    const out = await result.json();
    assertEquals(result.status, 200, JSON.stringify(out));
    return out as Record<string, unknown>;
  } finally {
    for (const timer of timers) clearInterval(timer);
    globalThis.setInterval = originalInterval;
    globalThis.fetch = originalFetch;
    Deno.env.get = originalGet;
  }
}

/** Executa fn com o relógio adiantado em offsetMs (new Date() e Date.now()). */
async function at<T>(offsetMs: number, fn: () => Promise<T>): Promise<T> {
  const RealDate = Date;
  class Shifted extends RealDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) super(RealDate.now() + offsetMs);
      // deno-lint-ignore no-explicit-any
      else super(...(args as [any]));
    }
    static override now() { return RealDate.now() + offsetMs; }
  }
  globalThis.Date = Shifted as DateConstructor;
  try { return await fn(); } finally { globalThis.Date = RealDate; }
}

const DAY = 24 * 60 * 60 * 1000;
const SUB = "sub_card";
const payment = (id: string, extra: Record<string, unknown> = {}) =>
  ({ id, subscription: SUB, customer: "cus_card", confirmedDate: "2026-10-17", externalReference: UID, ...extra });
const dueMs = () => new Date(String(memory.row.data_vencimento)).getTime();

Deno.test({ name: "handler: agência expirada, CHECKOUT_PAID → CONFIRMED no mesmo segundo ativa, conta 1 e promove Bimbo", sanitizeOps: false, sanitizeResources: false, fn: async () => {
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
}});

Deno.test({ name: "handler: CHECKOUT_PAID com trial válido vincula, mantém trial e não promove marcas", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  reset("trial", "2099-10-24T12:00:00Z");
  await event({ event: "CHECKOUT_PAID", checkout: { id: CK, subscription: "sub_trial" } });
  assertEquals(memory.row.status, "trial");
  assertEquals(memory.row.trial_ends_at, "2099-10-24T12:00:00Z");
  assertEquals(memory.row.ciclos_pagos, 0);
  assertEquals(memory.brand.plano, null);
}});
Deno.test({ name: "a) CONFIRMED no dia 0 e RECEIVED do mesmo pagamento no dia 30 → nada muda no segundo", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  reset("pendente", null, SUB);
  const first = await event({ event: "PAYMENT_CONFIRMED", payment: payment("pay_a") });
  assertEquals(first, { received: true });
  assertEquals(memory.row.status, "ativo");
  assertEquals(memory.row.ciclos_pagos, 1);
  const due = dueMs();
  assert(Math.abs(due - (Date.now() + 30 * DAY)) < 60_000, "vencimento deve ser dia 0 + 30");
  const before = structuredClone(memory.row);
  const second = await at(30 * DAY, () => event({ event: "PAYMENT_RECEIVED", payment: payment("pay_a") }));
  assertEquals(second, { received: true, ignored: "already_counted" });
  assertEquals(memory.row, before);
  assertEquals(dueMs(), due);
  assertEquals(memory.row.ciclos_pagos, 1);
  assertEquals(memory.row.status, "ativo");
}});

Deno.test({ name: "b) CONFIRMED reenviado 2h depois → ciclos_pagos 1 e vencimento parado", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  reset("pendente", null, SUB);
  await event({ event: "PAYMENT_CONFIRMED", payment: payment("pay_b") });
  const due = dueMs();
  const retry = await at(2 * 60 * 60 * 1000, () => event({ event: "PAYMENT_CONFIRMED", payment: payment("pay_b") }));
  assertEquals(retry, { received: true, ignored: "already_counted" });
  assertEquals(memory.row.ciclos_pagos, 1);
  assertEquals(dueMs(), due);
}});

Deno.test({ name: "c) RECEIVED sozinho (sem CONFIRMED antes) → ativa, conta 1 e promove o plano escolhido", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  reset("pendente", null, SUB);
  memory.row.plano_pretendido = "influencia";
  const res = await event({ event: "PAYMENT_RECEIVED", payment: payment("pay_c") });
  assertEquals(res, { received: true });
  assertEquals(memory.row.status, "ativo");
  assertEquals(memory.row.ciclos_pagos, 1);
  assertEquals(memory.row.plano, "influencia");
  assertEquals(memory.row.plano_pretendido, null);
  assertEquals(memory.brand.plano, "presenca");
  assert(Math.abs(dueMs() - (Date.now() + 30 * DAY)) < 60_000);
}});

for (const later of ["cancelado", "inadimplente"]) {
  Deno.test({ name: `d) assinatura virou ${later} depois do CONFIRMED; RECEIVED atrasado não volta para ativo`, sanitizeOps: false, sanitizeResources: false, fn: async () => {
    reset("pendente", null, SUB);
    await event({ event: "PAYMENT_CONFIRMED", payment: payment("pay_d") });
    memory.row.status = later;
    memory.row.carencia_ate = "2026-11-20T00:00:00.000Z";
    const due = dueMs();
    memory.brand.plano_pretendido = "autoridade";
    const res = await at(30 * DAY, () => event({ event: "PAYMENT_RECEIVED", payment: payment("pay_d") }));
    assertEquals(res, { received: true, ignored: "already_counted" });
    assertEquals(memory.row.status, later);
    assertEquals(memory.row.carencia_ate, "2026-11-20T00:00:00.000Z");
    assertEquals(dueMs(), due);
    assertEquals(memory.row.ciclos_pagos, 1);
    assertEquals(memory.brand.plano_pretendido, "autoridade", "promoção de marcas não roda de novo");
  }});
}

Deno.test({ name: "e) renovação com novo payment.id no mês seguinte → ciclos_pagos 2 e vencimento estendido", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  reset("pendente", null, SUB);
  await event({ event: "PAYMENT_CONFIRMED", payment: payment("pay_m1") });
  const firstDue = dueMs();
  const res = await at(30 * DAY, () => event({ event: "PAYMENT_CONFIRMED", payment: payment("pay_m2", { confirmedDate: "2026-11-16" }) }));
  assertEquals(res, { received: true });
  assertEquals(memory.row.ciclos_pagos, 2);
  assertEquals(memory.row.status, "ativo");
  assert(Math.abs(dueMs() - (firstDue + 30 * DAY)) < 60_000, "vencimento deve andar mais 30 dias");
  // E o RECEIVED tardio da 1ª mensalidade continua sem efeito.
  const late = await at(31 * DAY, () => event({ event: "PAYMENT_RECEIVED", payment: payment("pay_m1") }));
  assertEquals(late, { received: true, ignored: "already_counted" });
  assertEquals(memory.row.ciclos_pagos, 2);
}});

for (const ref of ["prorata:row_test:agency:brand_test", "fidelidade:row_test:presenca"]) {
  for (const ev of ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]) {
    Deno.test({ name: `f) cobrança avulsa ${ref.split(":")[0]} em ${ev} → ignorada, nada muda`, sanitizeOps: false, sanitizeResources: false, fn: async () => {
      reset("atrasado", null, SUB);
      const before = structuredClone(memory.row);
      const brandBefore = structuredClone(memory.brand);
      const res = await event({ event: ev, payment: { id: "pay_avulsa", customer: "cus_card", confirmedDate: "2026-10-20", externalReference: ref } });
      assertEquals(res, { received: true, ignored: "one_off" });
      assertEquals(memory.row, before);
      assertEquals(memory.brand, brandBefore);
      assertEquals(memory.claims.length, 0);
      assertEquals(memory.counted.size, 0);
    }});
  }
}

// ── Recontratação após cancelamento no teste / remoção de assinatura ──────────
const inDays = (n: number) => new Date(Date.now() + n * DAY).toISOString();

Deno.test({ name: "e) SUBSCRIPTION_DELETED depois do cancelamento → id removido não volta; status e data_vencimento intactos", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const trialEnd = inDays(4);
  reset("cancelado", trialEnd, null);
  Object.assign(memory.row, { data_vencimento: trialEnd, asaas_subscription_id_anterior: "sub_removed", checkout_context: { prev: {}, requested: {}, completed: true } });
  const before = structuredClone(memory.row);
  await event({ event: "SUBSCRIPTION_DELETED", subscription: { id: "sub_removed", customer: "cus_card", checkoutSession: CK, externalReference: UID, dateCreated: "2026-10-17" } });
  assertEquals(memory.row, before);
  assertEquals(memory.row.asaas_subscription_id, null);
}});

Deno.test({ name: "e) SUBSCRIPTION_DELETED com a linha cancelada ainda apontando para o id removido → só zera o vínculo", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const trialEnd = inDays(4);
  reset("cancelado", trialEnd, "sub_removed");
  memory.row.data_vencimento = trialEnd;
  await event({ event: "SUBSCRIPTION_DELETED", subscription: { id: "sub_removed" } });
  assertEquals(memory.row.asaas_subscription_id, null);
  assertEquals(memory.row.asaas_subscription_id_anterior, "sub_removed");
  assertEquals(memory.row.status, "cancelado");
  assertEquals(memory.row.data_vencimento, trialEnd);
}});

Deno.test({ name: "e) SUBSCRIPTION_DELETED pelo painel do Asaas em assinatura ativa vinculada → cancelado, vínculo zerado, vencimento mantido", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  reset("ativo", null, SUB);
  const due = inDays(20);
  memory.row.data_vencimento = due;
  await event({ event: "SUBSCRIPTION_DELETED", subscription: { id: SUB } });
  assertEquals(memory.row.status, "cancelado");
  assertEquals(memory.row.asaas_subscription_id, null);
  assertEquals(memory.row.data_vencimento, due);
}});

Deno.test({ name: "e) SUBSCRIPTION_DELETED de assinatura antiga com a linha já em outra assinatura → nada muda", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  reset("ativo", null, "sub_new");
  const before = structuredClone(memory.row);
  await event({ event: "SUBSCRIPTION_DELETED", subscription: { id: "sub_old", checkoutSession: CK, externalReference: UID } });
  assertEquals(memory.row, before);
}});

Deno.test({ name: "b) retomada: CHECKOUT_PAID com cartão registrado → volta a trial com o MESMO trial_ends_at", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const trialEnd = inDays(4);
  reset("cancelado", trialEnd, null);
  Object.assign(memory.row, { data_vencimento: trialEnd, checkout_context: { prev: { status: "cancelado", data_vencimento: trialEnd, trial_ends_at: trialEnd }, requested: { value: 497, cycle: "MONTHLY", plano: "presenca", ciclo: "mensal" }, resumeTrialEndsAt: trialEnd } });
  await event({ event: "CHECKOUT_PAID", checkout: { id: CK, subscription: "sub_resume", customer: "cus_card" } });
  assertEquals(memory.row.status, "trial");
  assertEquals(memory.row.trial_ends_at, trialEnd);
  assertEquals(memory.row.data_vencimento, trialEnd);
  assertEquals(memory.row.asaas_subscription_id, "sub_resume");
  assertEquals(memory.row.ciclos_pagos, 0);
}});

Deno.test({ name: "d) retomada abandonada: CHECKOUT_EXPIRED → linha volta a cancelado, acesso não estendido", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const trialEnd = inDays(4);
  reset("cancelado", trialEnd, null);
  Object.assign(memory.row, { data_vencimento: trialEnd, checkout_context: { prev: { status: "cancelado", data_vencimento: trialEnd, trial_ends_at: trialEnd, plano: "presenca", asaas_subscription_id: null }, requested: { value: 497, cycle: "MONTHLY", plano: "presenca", ciclo: "mensal" }, resumeTrialEndsAt: trialEnd } });
  await event({ event: "CHECKOUT_EXPIRED", checkout: { id: CK } });
  assertEquals(memory.row.status, "cancelado");
  assertEquals(memory.row.data_vencimento, trialEnd);
  assertEquals(memory.row.trial_ends_at, trialEnd);
  assertEquals(memory.row.asaas_checkout_id, null);
  assertEquals(memory.row.checkout_context, null);
}});
