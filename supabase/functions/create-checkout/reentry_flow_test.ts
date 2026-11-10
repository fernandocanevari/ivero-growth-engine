// Recontratação a partir de uma linha 'cancelado'. Entrada real da função;
// todo HTTP é interceptado — nenhuma chamada sai para banco ou Asaas.
// Rode este arquivo em uma invocação própria de `deno test` (captura Deno.serve).
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { GoTrueClient } from "npm:@supabase/auth-js";
import { brDay } from "../_shared/reconcile-decision.ts";
import { restoreCheckoutState, type CheckoutContext } from "../_shared/checkout-state.ts";

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
const LIVE = ["ativo", "trial", "inadimplente", "pendente"];
const REQ = { plano: "presenca", nome: "Cliente Teste", email: "cliente@example.test", ciclo: "mensal" };

type Call = { url: string; method: string; body: any };

async function run(row: Record<string, unknown>, opts: { cancelOk?: boolean; body?: Record<string, unknown> } = {}) {
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  console.log = () => {};
  envNames.forEach((key, i) => Deno.env.set(key, envValues[i]));
  const calls: Call[] = [];
  globalThis.fetch = async (input, init) => {
    const req = new Request(input, init);
    const url = new URL(req.url);
    const text = req.method === "GET" ? "" : await req.text();
    calls.push({ url: req.url, method: req.method, body: text ? JSON.parse(text) : null });
    let data: unknown = null;
    let status = 200;
    if (url.hostname === "database.invalid") {
      if (url.pathname === "/auth/v1/user") data = { id: "user-1", aud: "authenticated", role: "authenticated" };
      else if (url.pathname.startsWith("/rest/v1/rpc/")) data = true;
      else if (url.pathname === "/rest/v1/profiles") data = [{ account_type: "individual" }];
      else if (url.pathname === "/rest/v1/assinaturas") {
        if (req.method !== "GET") data = null;
        else if (url.searchParams.get("asaas_subscription_id") === "not.is.null") {
          data = LIVE.includes(String(row.status)) && row.asaas_subscription_id ? [row] : [];
        } else data = [row];
      } else throw new Error(`Unexpected mocked database path: ${url.pathname}`);
    } else if (url.hostname === "sandbox.asaas.com") {
      if (url.pathname === "/api/v3/checkouts" && req.method === "POST") data = { id: "chk_new", link: "https://checkout.invalid/chk_new" };
      else if (/^\/api\/v3\/checkouts\/[^/]+\/cancel$/.test(url.pathname)) { status = opts.cancelOk === false ? 500 : 200; data = {}; }
      else if (url.pathname === "/api/v3/payments" && req.method === "GET") data = { data: [] };
      else throw new Error(`Unexpected mocked provider path: ${req.method} ${url.pathname}`);
    } else throw new Error("Network escape forbidden");
    return new Response(data === null ? null : JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
  };
  try {
    const b64url = (v: unknown) => btoa(JSON.stringify(v)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
    const token = `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({ sub: "user-1", exp: 4102444800 })}.c2ln`;
    assert(handler);
    const response = await handler!(new Request("https://function.invalid", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(opts.body ?? REQ),
    }));
    const checkout = calls.find((c) => c.method === "POST" && c.url.endsWith("/api/v3/checkouts"));
    const patch = calls.find((c) => c.method === "PATCH" && c.url.includes("/rest/v1/assinaturas"))?.body;
    const cancelCalls = calls.filter((c) => c.url.includes("/cancel")).length;
    return { status: response.status, data: await response.json(), checkout, patch, cancelCalls, calls };
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;
  }
}

// Linha como fica depois do cancelamento no teste (P15): teste com cartão,
// sessão antiga concluída (completed:true), data_vencimento = fim do teste e o
// id da assinatura removida regravado (dado real de cliente69).
function cancelledTrialRow(trialEnd: string) {
  return {
    id: "row-1", user_id: "user-1", status: "cancelado", plano: "presenca", ciclo_contratado: "mensal",
    trial_ends_at: trialEnd, data_vencimento: trialEnd, data_inicio: at(-5 * DAY),
    ciclos_pagos: 0, counted_payment_ids: [], compromisso_inicio: null, compromisso_meses: 12,
    asaas_subscription_id: "sub_deleted", asaas_customer_id: "cus_1",
    asaas_checkout_id: "chk_old", asaas_checkout_created_at: at(-5 * DAY),
    checkout_context: {
      prev: { status: "trial", trial_ends_at: trialEnd, plano: "presenca" },
      requested: { value: 497, cycle: "MONTHLY", plano: "presenca", ciclo: "mensal" },
      link: "https://checkout.invalid/chk_old", completed: true,
    },
  };
}

Deno.test("a) teste cancelado com checkout_context.completed=true → checkout novo liberado (sem 409) e sem teste novo", async () => {
  const r = await run(cancelledTrialRow(at(4 * DAY)));
  assertEquals(r.status, 200, JSON.stringify(r.data));
  assertEquals(r.data.trialConcedido, false);
  assert(r.checkout, "nova Checkout Session criada");
  assertEquals(r.cancelCalls, 0, "sessão antiga concluída não é encerrada no Asaas");
});

Deno.test("b) volta antes do fim do teste → 1ª cobrança no dia do trial_ends_at original; linha segue cancelada", async () => {
  const trialEnd = at(4 * DAY);
  const r = await run(cancelledTrialRow(trialEnd));
  assertEquals(r.status, 200);
  assertEquals(r.checkout!.body.subscription.nextDueDate, brDay(trialEnd));
  assertEquals(r.data.retomaTeste, true);
  assertEquals(r.data.primeiraCobranca, brDay(trialEnd));
  assert(!("status" in r.patch), "status continua 'cancelado' durante o checkout");
  assert(!("data_vencimento" in r.patch), "acesso não é estendido");
  assert(!("trial_ends_at" in r.patch), "fim do teste não muda");
  assertEquals(r.patch.asaas_subscription_id, null);
  assertEquals(r.patch.checkout_context.resumeTrialEndsAt, trialEnd);
  assertEquals(r.patch.checkout_context.prev.status, "cancelado");
  assertEquals(r.patch.checkout_context.prev.data_vencimento, trialEnd);
});

Deno.test("c) volta depois do fim do teste → cobrança hoje, sem teste, linha pendente", async () => {
  const r = await run(cancelledTrialRow(at(-2 * DAY)));
  assertEquals(r.status, 200, JSON.stringify(r.data));
  assertEquals(r.data.trialConcedido, false);
  assertEquals(r.data.retomaTeste, undefined);
  assertEquals(r.checkout!.body.subscription.nextDueDate, brDay(new Date().toISOString()));
  assertEquals(r.patch.status, "pendente");
  assertEquals(r.patch.checkout_context.resumeTrialEndsAt, undefined);
});

Deno.test("d) recheckout abandonado → linha volta a 'cancelado' com o mesmo fim de acesso", async () => {
  const trialEnd = at(4 * DAY);
  const row = cancelledTrialRow(trialEnd);
  const r = await run(row);
  const afterCheckout = { ...row, ...r.patch } as typeof row & { checkout_context: CheckoutContext };
  const restored = restoreCheckoutState(afterCheckout);
  assertEquals(restored.status, "cancelado");
  assertEquals(restored.data_vencimento, trialEnd);
  assertEquals(restored.trial_ends_at, trialEnd);
  assertEquals(restored.asaas_checkout_id, null);
  assertEquals(restored.asaas_subscription_id, null);
});

Deno.test("f) checkout em andamento (pendente, recente, contexto incompleto, encerramento não confirmado) → 409", async () => {
  const r = await run({
    ...cancelledTrialRow(at(4 * DAY)), status: "pendente", asaas_subscription_id: null, asaas_checkout_created_at: at(-5 * 60_000),
    checkout_context: { prev: { status: "trial" }, requested: { value: 997, cycle: "MONTHLY", plano: "influencia", ciclo: "mensal" }, link: "https://checkout.invalid/chk_old" },
  }, { cancelOk: false });
  assertEquals(r.status, 409);
  assertEquals(r.data.error, "checkout_anterior_ativo");
  assertEquals(r.checkout, undefined);
});

Deno.test("f) pendente com sessão concluída (pagamento sendo conferido) → 409, como antes", async () => {
  const r = await run({ ...cancelledTrialRow(at(4 * DAY)), status: "pendente", asaas_subscription_id: null });
  assertEquals(r.status, 409);
  assertEquals(r.data.error, "checkout_anterior_ativo");
});

Deno.test("f) cancelado com sessão AINDA aberta (recente, incompleta) e encerramento não confirmado → 409", async () => {
  const r = await run({
    ...cancelledTrialRow(at(4 * DAY)), asaas_subscription_id: null, asaas_checkout_created_at: at(-5 * 60_000),
    checkout_context: { prev: { status: "cancelado" }, requested: { value: 997, cycle: "MONTHLY", plano: "influencia", ciclo: "mensal" }, link: "https://checkout.invalid/chk_old" },
  }, { cancelOk: false });
  assertEquals(r.status, 409);
});

function paidCancelledRow(extra: Record<string, unknown> = {}) {
  return {
    id: "row-2", user_id: "user-1", status: "cancelado", plano: "influencia", ciclo_contratado: "mensal",
    trial_ends_at: null, data_vencimento: at(10 * DAY), data_inicio: at(-90 * DAY),
    ciclos_pagos: 3, counted_payment_ids: ["pay_1", "pay_2", "pay_3"], compromisso_inicio: at(-90 * DAY), compromisso_meses: 12,
    asaas_subscription_id: null, asaas_customer_id: "cus_2",
    asaas_checkout_id: "chk_paid", asaas_checkout_created_at: at(-90 * DAY), checkout_context: null,
    ...extra,
  };
}

Deno.test("g) pagou → cancelou → volta com dias restantes: 1ª cobrança no dia do data_vencimento, linha segue cancelada, nada cobrado hoje", async () => {
  const row = paidCancelledRow();
  const r = await run(row);
  assertEquals(r.status, 200, JSON.stringify(r.data));
  assertEquals(r.data.trialConcedido, false);
  assertEquals(r.data.retomaTeste, undefined);
  assertEquals(r.data.retomaAcesso, true);
  assertEquals(r.checkout!.body.subscription.nextDueDate, brDay(row.data_vencimento));
  assert(r.checkout!.body.subscription.nextDueDate !== brDay(new Date().toISOString()), "sem cobrança hoje");
  assertEquals(r.data.primeiraCobranca, brDay(row.data_vencimento));
  assertEquals(r.data.acessoAte, row.data_vencimento);
  assert(!("status" in r.patch), "status continua 'cancelado' (sem 'pendente')");
  assert(!("data_vencimento" in r.patch), "sem agora + 30 dias");
  assert(!("ciclos_pagos" in r.patch), "contrato antigo só é zerado quando o cartão é registrado");
  assertEquals(r.patch.checkout_context.resumePaidUntil, row.data_vencimento);
  assertEquals(r.patch.checkout_context.resumeTrialEndsAt, undefined);
  assertEquals(r.patch.checkout_context.prev.status, "cancelado");
  assertEquals(r.patch.checkout_context.prev.ciclos_pagos, 3);
});

Deno.test("g) pagou → cancelou com id removido regravado → volta sem 409, vínculo antigo descartado", async () => {
  const r = await run(paidCancelledRow({ asaas_subscription_id: "sub_deleted" }));
  assertEquals(r.status, 200, JSON.stringify(r.data));
  assert(!("status" in r.patch));
  assertEquals(r.patch.asaas_subscription_id, null);
  assertEquals(r.patch.checkout_context.prev.asaas_subscription_id, null);
});

Deno.test("P30 a) retomada paga: plano/ciclo escolhidos só como intenção; plano atual intacto", async () => {
  const r = await run(paidCancelledRow(), { body: { ...REQ, plano: "autoridade", ciclo: "anual" } });
  assertEquals(r.status, 200, JSON.stringify(r.data));
  assertEquals(r.patch.plano_pretendido, "autoridade");
  assertEquals(r.patch.ciclo_pretendido, "anual");
  assert(!("plano" in r.patch), "plano pago continua até a 1ª cobrança");
  assert(!("ciclo_contratado" in r.patch));
  assertEquals(r.checkout!.body.subscription.nextDueDate, brDay(paidCancelledRow().data_vencimento));
});

Deno.test("P30 b) retomada paga abandonada → restoreCheckoutState devolve exatamente a linha cancelada", async () => {
  const row = { ...paidCancelledRow(), desconto_acumulado: 120, ciclos_no_upgrade: 2, plano_pretendido: null, ciclo_pretendido: null };
  const r = await run(row);
  const after = { ...row, ...r.patch } as typeof row & { checkout_context: CheckoutContext };
  const restored = { ...after, ...restoreCheckoutState(after) };
  for (const k of ["status", "plano", "ciclo_contratado", "plano_pretendido", "ciclo_pretendido", "data_inicio", "data_vencimento",
    "trial_ends_at", "asaas_customer_id", "compromisso_inicio", "compromisso_meses", "ciclos_pagos", "desconto_acumulado", "ciclos_no_upgrade",
    "counted_payment_ids", "asaas_subscription_id"] as const) {
    assertEquals(restored[k], row[k], k);
  }
  assertEquals(restored.checkout_context, null);
  assertEquals(restored.asaas_checkout_id, null);
});

Deno.test("P30 f) acesso já encerrado → cobrança hoje, contrato novo (contagem zerada) e restauração no abandono", async () => {
  const row = { ...paidCancelledRow({ data_vencimento: at(-1 * DAY) }), desconto_acumulado: 120, ciclos_no_upgrade: 2 };
  const r = await run(row);
  assertEquals(r.status, 200, JSON.stringify(r.data));
  assertEquals(r.data.retomaAcesso, undefined);
  assertEquals(r.checkout!.body.subscription.nextDueDate, brDay(new Date().toISOString()));
  assertEquals(r.patch.status, "pendente");
  assertEquals(r.patch.ciclos_pagos, 0);
  assertEquals(r.patch.compromisso_inicio, null);
  assertEquals(r.patch.desconto_acumulado, null);
  assertEquals(r.patch.ciclos_no_upgrade, null);
  const prev = r.patch.checkout_context.prev;
  assertEquals([prev.ciclos_pagos, prev.compromisso_inicio, prev.desconto_acumulado, prev.ciclos_no_upgrade], [3, row.compromisso_inicio, 120, 2]);
  const after = { ...row, ...r.patch } as typeof row & { checkout_context: CheckoutContext };
  const restored = restoreCheckoutState(after);
  assertEquals(restored.status, "cancelado");
  assertEquals(restored.ciclos_pagos, 3);
  assertEquals(restored.compromisso_inicio, row.compromisso_inicio);
  assertEquals(restored.desconto_acumulado, 120);
  assertEquals(restored.ciclos_no_upgrade, 2);
  assertEquals(restored.data_vencimento, row.data_vencimento);
});

Deno.test("P30 h) multa pendente continua bloqueando a retomada paga (sem trava e sem checkout)", async () => {
  const r = await run(paidCancelledRow({ ciclo_contratado: "anual", multa_pendente_valor: 600, multa_pendente_ciclos: 3, multa_pendente_payment_id: "pay_multa", multa_ultimo_payment_id: null }));
  assertEquals(r.status, 200);
  assertEquals(r.data.reason, "multa_pendente");
  assertEquals(r.checkout, undefined);
  assertEquals(r.patch, undefined);
});

Deno.test("P30 i) retomada do teste grátis inalterada: retomaTeste, sem retomaAcesso nem resumePaidUntil", async () => {
  const trialEnd = at(4 * DAY);
  const r = await run(cancelledTrialRow(trialEnd));
  assertEquals(r.data.retomaTeste, true);
  assertEquals(r.data.retomaAcesso, undefined);
  assertEquals(r.data.acessoAte, undefined);
  assertEquals(r.patch.checkout_context.resumeTrialEndsAt, trialEnd);
  assertEquals(r.patch.checkout_context.resumePaidUntil, undefined);
  assertEquals(r.checkout!.body.subscription.nextDueDate, brDay(trialEnd));
});

/** Fim do dia de HOJE em Brasília (23:59:59.999 -03:00), sempre no futuro. */
function endOfTodayBR() {
  return new Date(`${brDay(new Date().toISOString())}T23:59:59.999-03:00`).toISOString();
}

Deno.test("FIX1 a) acesso termina HOJE (Brasília) → checkout normal: cobrança hoje, linha 'pendente', contagem zerada e restaurável", async () => {
  const until = endOfTodayBR();
  const row = { ...paidCancelledRow({ data_vencimento: until }), desconto_acumulado: 120, ciclos_no_upgrade: 2 };
  const r = await run(row);
  assertEquals(r.status, 200, JSON.stringify(r.data));
  assertEquals(r.data.retomaAcesso, undefined);
  assertEquals(r.data.primeiraCobranca, undefined);
  assertEquals(r.checkout!.body.subscription.nextDueDate, brDay(new Date().toISOString()), "cobrança hoje");
  assertEquals(r.patch.status, "pendente", "linha encontrável por pagamento que chegue antes do vínculo");
  assertEquals(r.patch.ciclos_pagos, 0);
  assertEquals(r.patch.compromisso_inicio, null);
  assertEquals(r.patch.desconto_acumulado, null);
  assertEquals(r.patch.ciclos_no_upgrade, null);
  assertEquals(r.patch.checkout_context.resumePaidUntil, undefined);
  const prev = r.patch.checkout_context.prev;
  assertEquals([prev.status, prev.ciclos_pagos, prev.data_vencimento, prev.desconto_acumulado, prev.ciclos_no_upgrade], ["cancelado", 3, until, 120, 2]);
  const restored = restoreCheckoutState({ ...row, ...r.patch } as typeof row & { checkout_context: CheckoutContext });
  assertEquals(restored.status, "cancelado");
  assertEquals(restored.ciclos_pagos, 3);
  assertEquals(restored.data_vencimento, until);
  assertEquals(restored.compromisso_inicio, row.compromisso_inicio);
  assertEquals(restored.desconto_acumulado, 120);
});

/** Linha depois de: pagou 3 meses → cancelou → reativou (cartão registrado, contrato zerado) → cancelou de novo antes da 1ª cobrança. */
function windowCancelledRow(accessUntil: string) {
  return {
    id: "row-3", user_id: "user-1", status: "cancelado", plano: "influencia", ciclo_contratado: "mensal",
    trial_ends_at: null, data_vencimento: accessUntil, data_inicio: at(-90 * DAY),
    ciclos_pagos: 0, counted_payment_ids: ["pay_1", "pay_2", "pay_3"], compromisso_inicio: null, compromisso_meses: 12,
    desconto_acumulado: null, ciclos_no_upgrade: null, plano_pretendido: "influencia", ciclo_pretendido: "mensal",
    asaas_subscription_id: null, asaas_subscription_id_anterior: "sub_resume1", asaas_customer_id: "cus_resume1",
    asaas_checkout_id: "chk_resume1", asaas_checkout_created_at: at(-2 * DAY),
    checkout_context: {
      prev: { status: "cancelado", ciclos_pagos: 3, data_vencimento: accessUntil },
      requested: { value: 997, cycle: "MONTHLY", plano: "influencia", ciclo: "mensal" },
      link: "https://checkout.invalid/chk_resume1", completed: true,
    },
  };
}

Deno.test("FIX2 b) reativou → cancelou na janela → reativa de novo: 1ª cobrança no dia do data_vencimento, nada hoje, linha segue 'cancelado'", async () => {
  const until = at(10 * DAY);
  const row = windowCancelledRow(until);
  const r = await run(row);
  assertEquals(r.status, 200, JSON.stringify(r.data));
  assertEquals(r.data.retomaAcesso, true);
  assertEquals(r.data.acessoAte, until);
  assertEquals(r.checkout!.body.subscription.nextDueDate, brDay(until));
  assert(r.checkout!.body.subscription.nextDueDate !== brDay(new Date().toISOString()), "sem cobrança hoje");
  assertEquals(r.cancelCalls, 0, "sessão anterior concluída não é encerrada");
  assert(!("status" in r.patch), "status continua 'cancelado'");
  assert(!("data_vencimento" in r.patch), "data_vencimento intacta");
  assert(!("ciclos_pagos" in r.patch));
  assertEquals(r.patch.checkout_context.resumePaidUntil, until);
  assertEquals(r.patch.checkout_context.prev.data_vencimento, until);
  assertEquals(r.patch.checkout_context.prev.ciclos_pagos, 0, "estado a restaurar é o atual, não o do 1º checkout");
});

Deno.test("FIX2 b) abandono da 2ª reativação → volta exatamente à linha cancelada da janela", async () => {
  const until = at(10 * DAY);
  const row = windowCancelledRow(until);
  const r = await run(row);
  const after = { ...row, ...r.patch } as typeof row & { checkout_context: CheckoutContext };
  const restored = { ...after, ...restoreCheckoutState(after) };
  for (const k of ["status", "plano", "ciclo_contratado", "data_inicio", "data_vencimento", "trial_ends_at", "asaas_customer_id",
    "compromisso_inicio", "compromisso_meses", "ciclos_pagos", "desconto_acumulado", "ciclos_no_upgrade", "counted_payment_ids", "asaas_subscription_id"] as const) {
    assertEquals(restored[k], row[k], k);
  }
  assertEquals(restored.checkout_context, null);
  assertEquals(restored.asaas_checkout_id, null);
});

Deno.test("FIX2 c) teste cancelado com data_vencimento = cadastro + 30 dias (futuro) segue o caminho do teste, nunca o pago", async () => {
  const signup = at(-5 * DAY);
  const trialEnd = at(2 * DAY);
  const base = { ...cancelledTrialRow(trialEnd), data_inicio: signup, data_vencimento: at(25 * DAY), asaas_checkout_id: null, checkout_context: null };
  const r = await run(base);
  assertEquals(r.status, 200, JSON.stringify(r.data));
  assertEquals(r.data.retomaTeste, true);
  assertEquals(r.data.retomaAcesso, undefined);
  assertEquals(r.checkout!.body.subscription.nextDueDate, brDay(trialEnd));
  assertEquals(r.patch.checkout_context.resumeTrialEndsAt, trialEnd);
  assertEquals(r.patch.checkout_context.resumePaidUntil, undefined);
  // Teste já encerrado: checkout normal (cobrança hoje), nunca retomada paga.
  const ended = await run({ ...base, trial_ends_at: at(-1 * DAY) });
  assertEquals(ended.status, 200, JSON.stringify(ended.data));
  assertEquals(ended.data.retomaAcesso, undefined);
  assertEquals(ended.data.retomaTeste, undefined);
  assertEquals(ended.checkout!.body.subscription.nextDueDate, brDay(new Date().toISOString()));
  assertEquals(ended.patch.status, "pendente");
  assertEquals(ended.patch.checkout_context.resumePaidUntil, undefined);
});

// ── Assinatura viva vinculada nunca recebe a cobrança recorrente como checkout ──
const liveRow = (status: string) => ({
  id: "row-live", user_id: "user-1", status, plano: "presenca", ciclo_contratado: "mensal",
  trial_ends_at: at(3 * DAY), data_vencimento: at(20 * DAY), ciclos_pagos: status === "ativo" ? 1 : 0, counted_payment_ids: [],
  asaas_subscription_id: "sub_live", asaas_customer_id: "cus_live", asaas_checkout_id: null, checkout_context: null,
});
const recurringLookups = (urls: string[]) => urls.filter((u) => u.includes("/api/v3/payments?subscription="));

for (const status of ["ativo", "inadimplente"]) {
  Deno.test(`g') ${status} com assinatura vinculada e mesmo plano → 409, sem invoiceUrl e sem buscar a cobrança recorrente`, async () => {
    {
      const r = await run(liveRow(status));
      assertEquals(r.status, 409);
      assertEquals(r.data.error, "assinatura_ativa_use_troca_de_plano");
      assertEquals(r.data.checkoutUrl, undefined);
      assertEquals(r.data.invoiceUrl, undefined);
      assertEquals(r.checkout, undefined);
      assertEquals(recurringLookups(r.calls.map((c) => c.url)).length, 0);
    }
  });
}

for (const status of ["pendente", "trial"]) {
  Deno.test(`g') ${status} com assinatura vinculada → reaproveitamento inalterado (reused, busca a cobrança PENDING)`, async () => {
    {
      const r = await run(liveRow(status));
      assertEquals(r.status, 200);
      assertEquals([r.data.reused, r.data.status], [true, status]);
      assertEquals(recurringLookups(r.calls.map((c) => c.url)).length, 1);
    }
  });
}

Deno.test("restaura o ambiente do processo de teste", () => {
  envNames.forEach((key, i) => {
    const value = previousEnv[i];
    if (value === undefined) Deno.env.delete(key);
    else Deno.env.set(key, value);
  });
});
