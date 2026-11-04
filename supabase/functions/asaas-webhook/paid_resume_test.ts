// Retomada de assinatura PAGA cancelada (R1–R4 de 03/11): entrada real do
// asaas-webhook com um banco em memória que respeita os filtros da gravação
// condicional. Nenhuma chamada sai para banco ou Asaas.
// Rode este arquivo em uma invocação própria de `deno test` (captura Deno.serve).
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { bindableByUser } from "./matching.ts";
import { resumeSubscriptionPatch } from "./subscription-lifecycle.ts";
import { brDay } from "../_shared/reconcile-decision.ts";

let handler: ((req: Request) => Promise<Response>) | undefined;
const originalServe = Deno.serve;
const originalFetch = globalThis.fetch;
const originalGet = Deno.env.get;
const ENV = { SUPABASE_URL: "https://payments.example.test", SUPABASE_SERVICE_ROLE_KEY: "fake-service", ASAAS_WEBHOOK_TOKEN: "fake-webhook" } as Record<string, string>;
Deno.env.get = (key: string) => ENV[key];
Deno.serve = ((h: (req: Request) => Promise<Response>) => { handler = h; return {} as ReturnType<typeof Deno.serve>; }) as typeof Deno.serve;
await import("./index.ts");
Deno.serve = originalServe;
Deno.env.get = originalGet;

const UID = "ba97500d-53c6-426b-b5e6-7015bfcf4395";
const CK = "chk_resume";
const DAY = 86_400_000;
const inDays = (n: number) => new Date(Date.now() + n * DAY).toISOString();
const today = () => brDay(new Date().toISOString())!;

const db = { row: {} as Record<string, unknown>, resets: 0, patches: [] as Record<string, unknown>[] };

/** Linha cancelada de quem pagou 3 meses e voltou (create-checkout já gravou a marca). */
function paidResumeRow(accessUntil: string, extra: Record<string, unknown> = {}) {
  const prev = {
    status: "cancelado", trial_ends_at: null, plano: "influencia", ciclo_contratado: "anual",
    plano_pretendido: null, ciclo_pretendido: null, data_inicio: inDays(-90), data_vencimento: accessUntil,
    asaas_subscription_id: null, asaas_customer_id: "cus_old", compromisso_inicio: inDays(-90), compromisso_meses: 12,
    ciclos_pagos: 3, desconto_acumulado: 120, ciclos_no_upgrade: 2,
  };
  db.row = {
    id: "row_paid", user_id: UID, ...prev, counted_payment_ids: ["p1", "p2", "p3"], carencia_ate: null,
    plano_pretendido: "influencia", ciclo_pretendido: "anual",
    asaas_subscription_id_anterior: "sub_removed",
    asaas_checkout_id: CK, asaas_checkout_created_at: new Date().toISOString(),
    checkout_context: {
      prev, requested: { value: 797, cycle: "MONTHLY", plano: "influencia", ciclo: "anual" },
      link: "https://checkout.invalid/chk_resume", resumePaidUntil: accessUntil,
    },
    ...extra,
  };
  db.resets = 0;
  db.patches = [];
}

/** Avalia um filtro PostgREST simples (eq / neq / in / is / not.is). */
function passes(value: unknown, filter: string): boolean {
  if (filter === "not.is.null") return value !== null && value !== undefined;
  if (filter === "is.null") return value === null || value === undefined;
  if (filter.startsWith("eq.")) return String(value) === filter.slice(3);
  if (filter.startsWith("neq.")) return String(value) !== filter.slice(4);
  if (filter.startsWith("in.(")) return filter.slice(4, -1).split(",").map((v) => v.replace(/^"|"$/g, "")).includes(String(value));
  throw new Error(`unexpected_filter:${filter}`);
}
function rowMatches(url: URL): boolean {
  for (const [key, filter] of url.searchParams) {
    if (["select", "order", "limit", "offset"].includes(key)) continue;
    const json = /^checkout_context->>(.+)$/.exec(key);
    const value = json ? (db.row.checkout_context as Record<string, unknown> | null)?.[json[1]] ?? null : db.row[key];
    if (!passes(value, filter)) return false;
  }
  return true;
}

/** Banco simulado instalado uma vez por arquivo (eventos simultâneos usam o mesmo). */
const mockedFetch: typeof fetch = async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const url = new URL(request.url);
    if (url.hostname !== "payments.example.test") throw new Error("unexpected_network");
    const table = url.pathname.split("/").pop();
    const method = request.method;
    const data = method === "GET" ? null : await request.json();
    let out: unknown = null;
    if (table === "claim_subscription_payment") {
      // Espelha a instrução SQL: só a 1ª chamada por payment_id altera a linha.
      const r = db.row;
      const ids = (r.counted_payment_ids as string[]) ?? [];
      if (ids.includes(data._payment_id)) out = { ciclos_pagos: r.ciclos_pagos, counted: false };
      else {
        const both = r.plano_pretendido != null && r.ciclo_pretendido != null;
        const novoCiclo = both ? r.ciclo_pretendido : r.ciclo_contratado;
        Object.assign(r, {
          ciclos_pagos: Number(r.ciclos_pagos ?? 0) + 1,
          counted_payment_ids: [...ids, data._payment_id],
          compromisso_inicio: novoCiclo === "anual" ? (r.compromisso_inicio ?? "NOW") : r.compromisso_inicio,
          status: "ativo", carencia_ate: null, data_vencimento: data._data_vencimento, trial_ends_at: null, checkout_context: null,
          plano: r.plano_pretendido ?? r.plano,
          ciclo_contratado: novoCiclo,
          ciclo_pretendido: r.plano_pretendido != null ? null : r.ciclo_pretendido,
          plano_pretendido: null,
          asaas_subscription_id: data._asaas_subscription_id || r.asaas_subscription_id,
          asaas_customer_id: data._asaas_customer_id || r.asaas_customer_id,
        });
        out = { ciclos_pagos: r.ciclos_pagos, counted: true };
      }
    } else if (table === "assinaturas") {
      const ok = rowMatches(url);
      if (method === "GET") out = ok ? structuredClone(db.row) : null;
      else {
        db.patches.push(data);
        if (ok) {
          if (data.ciclos_pagos === 0 && data.status === "ativo") db.resets++;
          Object.assign(db.row, data);
        }
        if ((request.headers.get("Prefer") ?? "").includes("return=representation")) out = ok ? [{ id: db.row.id }] : [];
      }
    } else if (table === "agency_brands") {
      out = method === "GET" ? [] : null;
    } else throw new Error(`unexpected_table:${table}`);
    return new Response(out === null ? null : JSON.stringify(out), { status: 200, headers: { "Content-Type": "application/json" } });
};

async function event(body: Record<string, unknown>) {
  const h = handler;
  if (!h) throw new Error("handler_not_captured");
  const originalLog = console.log;
  console.log = () => {};
  globalThis.fetch = mockedFetch;
  Deno.env.get = (key: string) => ENV[key];
  try {
    const result = await h(new Request("https://function.example.test", { method: "POST", headers: { "asaas-access-token": "fake-webhook", "Content-Type": "application/json" }, body: JSON.stringify(body) }));
    const out = await result.json();
    assertEquals(result.status, 200, JSON.stringify(out));
    return out as Record<string, unknown>;
  } finally {
    console.log = originalLog;
  }
}

/** Eventos simultâneos: mocks ficam instalados até o último terminar. */
async function events(bodies: Record<string, unknown>[]) {
  try { return await Promise.all(bodies.map(event)); } finally { restore(); }
}
function restore() {
  globalThis.fetch = originalFetch;
  Deno.env.get = originalGet;
}

const created = (extra: Record<string, unknown> = {}) => ({ event: "SUBSCRIPTION_CREATED", subscription: { id: "sub_new", customer: "cus_new", checkoutSession: CK, dateCreated: today(), externalReference: UID, ...extra } });
const checkoutPaid = { event: "CHECKOUT_PAID", checkout: { id: CK, subscription: "sub_new", customer: "cus_new", externalReference: UID } };
const confirmed = (id: string, dueDate: string) => ({ event: "PAYMENT_CONFIRMED", payment: { id, subscription: "sub_new", customer: "cus_new", checkoutSession: CK, dueDate, confirmedDate: today(), externalReference: UID } });
const T = { sanitizeOps: false, sanitizeResources: false };

Deno.test({ ...T, name: "a) cartão registrado (SUBSCRIPTION_CREATED): novo contrato — ativo, contagem zerada, plano/ciclo e acesso mantidos, marca apagada", fn: async () => {
  const until = inDays(10);
  paidResumeRow(until);
  await event(created());
  const r = db.row;
  assertEquals(r.status, "ativo");
  assertEquals(r.asaas_subscription_id, "sub_new");
  assertEquals(r.asaas_customer_id, "cus_new");
  assertEquals(r.ciclos_pagos, 0);
  assertEquals(r.compromisso_inicio, null);
  assertEquals(r.desconto_acumulado, null);
  assertEquals(r.ciclos_no_upgrade, null);
  assertEquals(r.plano, "influencia");
  assertEquals(r.ciclo_contratado, "anual");
  assertEquals(r.data_vencimento, until, "acesso atual intacto");
  assertEquals((r.checkout_context as Record<string, unknown>).resumePaidUntil, undefined);
  assertEquals(db.resets, 1);
}});

Deno.test({ ...T, name: "c) SUBSCRIPTION_CREATED → CHECKOUT_PAID duplicado → zera UMA vez; 1ª cobrança conta como ciclo 1", fn: async () => {
  const until = inDays(10);
  paidResumeRow(until);
  await event(created());
  await event(checkoutPaid);
  await event(checkoutPaid);
  await event(created());
  assertEquals(db.resets, 1);
  assertEquals(db.row.ciclos_pagos, 0);
  assertEquals((db.row.checkout_context as Record<string, unknown>).resumePaidUntil, undefined, "marca nunca volta");
  await event(confirmed("pay_new_1", brDay(until)!));
  await event(checkoutPaid);
  assertEquals(db.row.ciclos_pagos, 1);
  assertEquals(db.row.status, "ativo");
  assertEquals(db.resets, 1);
}});

Deno.test({ ...T, name: "c) eventos de vínculo simultâneos (lidos com a marca) → zera uma vez e a marca não é regravada", fn: async () => {
  paidResumeRow(inDays(10));
  await events([created(), checkoutPaid, created()]);
  assertEquals(db.resets, 1);
  assertEquals((db.row.checkout_context as Record<string, unknown> | null)?.resumePaidUntil, undefined);
  assertEquals(db.row.status, "ativo");
}});

Deno.test({ ...T, name: "d) mesmo dia: PAYMENT_CONFIRMED ANTES de SUBSCRIPTION_CREATED → ciclos_pagos fica 1, não é zerado depois", fn: async () => {
  const until = new Date(Date.now() + 60_000).toISOString(); // acesso termina hoje
  paidResumeRow(until);
  await event(confirmed("pay_today", today()));
  assertEquals(db.row.ciclos_pagos, 1, "contrato antigo zerado antes de contar a 1ª cobrança");
  assertEquals(db.row.checkout_context, null);
  assertEquals(db.row.compromisso_inicio, "NOW", "compromisso anual novo começa na 1ª cobrança");
  await event(created());
  await event(checkoutPaid);
  await event(confirmed("pay_today", today())); // reenvio
  assertEquals(db.row.ciclos_pagos, 1);
  assertEquals(db.resets, 1);
}});

Deno.test({ ...T, name: "g) plano diferente: plano atual mantido até a 1ª cobrança, depois promovido", fn: async () => {
  const until = inDays(10);
  paidResumeRow(until, { plano_pretendido: "autoridade", ciclo_pretendido: "mensal" });
  await event(created());
  assertEquals(db.row.plano, "influencia");
  assertEquals(db.row.ciclo_contratado, "anual");
  assertEquals(db.row.plano_pretendido, "autoridade");
  await event(confirmed("pay_first", brDay(until)!));
  assertEquals(db.row.plano, "autoridade");
  assertEquals(db.row.ciclo_contratado, "mensal");
  assertEquals(db.row.plano_pretendido, null);
  assertEquals(db.row.ciclo_pretendido, null);
  assertEquals(db.row.ciclos_pagos, 1);
}});

Deno.test({ ...T, name: "b) abandono (CHECKOUT_EXPIRED) → linha volta exatamente ao estado cancelado anterior", fn: async () => {
  const until = inDays(10);
  paidResumeRow(until);
  const prev = structuredClone((db.row.checkout_context as { prev: Record<string, unknown> }).prev);
  await event({ event: "CHECKOUT_EXPIRED", checkout: { id: CK } });
  for (const [k, v] of Object.entries(prev)) assertEquals(db.row[k], v, k);
  assertEquals(db.row.status, "cancelado");
  assertEquals(db.row.data_vencimento, until);
  assertEquals(db.row.checkout_context, null);
  assertEquals(db.row.asaas_checkout_id, null);
  assertEquals(db.resets, 0);
}});

Deno.test({ ...T, name: "4) vínculo pelo usuário (sem checkoutSession) aceita a linha cancelada com a marca", fn: async () => {
  paidResumeRow(inDays(10));
  await event(created({ checkoutSession: undefined }));
  assertEquals(db.row.status, "ativo");
  assertEquals(db.row.asaas_subscription_id, "sub_new");
  assertEquals(db.resets, 1);
}});

Deno.test("4) bindableByUser: cancelado com marca paga só em evento de vínculo e checkout não concluído", () => {
  const ctx = { resumePaidUntil: inDays(5) };
  assert(bindableByUser("SUBSCRIPTION_CREATED", { status: "cancelado", checkout_context: ctx }, "sub_new"));
  assert(bindableByUser("CHECKOUT_PAID", { status: "cancelado", checkout_context: ctx }, "sub_new"));
  assert(!bindableByUser("PAYMENT_OVERDUE", { status: "cancelado", checkout_context: ctx }, "sub_new"));
  assert(!bindableByUser("SUBSCRIPTION_CREATED", { status: "cancelado", checkout_context: { ...ctx, completed: true } }, "sub_new"));
  assert(!bindableByUser("SUBSCRIPTION_CREATED", { status: "cancelado", checkout_context: null }, "sub_new"));
  assert(!bindableByUser("SUBSCRIPTION_CREATED", { status: "cancelado", checkout_context: ctx, asaas_subscription_id_anterior: "sub_new" }, "sub_new"));
});

Deno.test("5) resumeSubscriptionPatch: só para cancelado com marca; nunca mexe em plano, ciclo nem data_vencimento", () => {
  assertEquals(resumeSubscriptionPatch({ status: "ativo", checkout_context: { prev: {}, requested: { value: 1, cycle: "MONTHLY", plano: "presenca", ciclo: "mensal" }, resumePaidUntil: "x" } }), null);
  assertEquals(resumeSubscriptionPatch({ status: "cancelado", checkout_context: null }), null);
  assertEquals(resumeSubscriptionPatch({ status: "cancelado", checkout_context: { prev: {}, requested: { value: 1, cycle: "MONTHLY", plano: "presenca", ciclo: "mensal" }, resumeTrialEndsAt: "x" } }), null);
  const patch = resumeSubscriptionPatch({ status: "cancelado", checkout_context: { prev: { a: 1 }, requested: { value: 1, cycle: "MONTHLY", plano: "presenca", ciclo: "mensal" }, link: "l", resumePaidUntil: "x" } })!;
  for (const k of ["plano", "ciclo_contratado", "data_vencimento", "plano_pretendido", "ciclo_pretendido", "trial_ends_at"]) assert(!(k in patch), k);
  assertEquals(patch.checkout_context, { prev: { a: 1 }, requested: { value: 1, cycle: "MONTHLY", plano: "presenca", ciclo: "mensal" }, link: "l" });
});

Deno.test("restaura o ambiente do processo de teste", () => restore());
