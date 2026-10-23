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

type Sub = { id: string; customer: string; status: string; externalReference?: string; dateCreated?: string; deleted?: boolean };
interface Provider {
  /** Clientes do Asaas com o e-mail da conta (paginados de 1 em 1 no mock). */
  customers?: { id: string; email: string }[];
  subs?: Sub[];
  /** status HTTP forçado no DELETE de uma assinatura. */
  deleteStatus?: Record<string, number>;
  /** DELETE responde 200 mas a assinatura continua ACTIVE. */
  deleteIgnored?: Set<string>;
  /** HTTP forçado na busca de clientes. */
  customersStatus?: number;
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
  console.error = () => {};
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
      else if (req.method === "PATCH") data = null;
      else if (url.pathname === "/rest/v1/assinaturas") data = assinatura;
      else if (url.pathname === "/rest/v1/profiles") data = { email: EMAIL };
      else throw new Error(`Unexpected mocked database path: ${url.pathname}`);
    } else if (url.hostname === "sandbox.asaas.com") {
      const p = url.pathname.replace("/api/v3", "");
      const subMatch = p.match(/^\/subscriptions\/([^/]+)$/);
      if (p === "/customers" && req.method === "GET") {
        if (provider.customersStatus) { status = provider.customersStatus; data = { errors: [{ description: "boom" }] }; }
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
      } else if (subMatch && req.method === "GET") {
        const sub = subs.find((s) => s.id === decodeURIComponent(subMatch[1]));
        if (!sub) { status = 404; data = { errors: [] }; } else data = sub;
      } else if (/^\/subscriptions\/[^/]+\/payments$/.test(p) && req.method === "GET") {
        data = { object: "list", hasMore: false, data: [] };
      } else if (p === "/payments" && req.method === "POST") data = { invoiceUrl: "https://invoice.invalid/multa" };
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
    const deletes = calls.filter((c) => c.method === "DELETE").map((c) => decodeURIComponent(new URL(c.url).pathname.split("/").pop()!));
    const lastDeleteIndex = calls.map((c) => c.method).lastIndexOf("DELETE");
    const asaasCalls = calls.filter((c) => c.url.includes("sandbox.asaas.com"));
    const charges = asaasCalls.filter((c) => c.method === "POST" && c.url.includes("/payments")).length;
    return { status: response.status, data: await response.json(), patch, patchIndex, deletes, lastDeleteIndex, deleted: deletes.includes("sub_test"), charges, asaasCalls, calls, subs };
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;
    console.error = originalError;
    envNames.forEach((key, i) => { const value = previous[i]; if (value === undefined) Deno.env.delete(key); else Deno.env.set(key, value); });
  }
}
const cancel = (row: Record<string, unknown>, provider: Provider = { subs: [{ id: "sub_test", customer: "cus_test", status: "ACTIVE" }] }) => call("cancel", row, provider);

// ── Comportamento anterior preservado (P15) ──────────────────────────────────
Deno.test("cancel em trial com fim no futuro: data_vencimento = trial_ends_at, isTrial, sem multa, remove no Asaas", async () => {
  const trialEnd = inDays(5);
  const r = await cancel({ trial_ends_at: trialEnd, data_vencimento: inDays(28) });
  assertEquals(r.status, 200);
  assertEquals(r.patch.status, "cancelado");
  assertEquals(r.patch.data_vencimento, trialEnd);
  assertEquals(r.data.accessUntil, trialEnd);
  assertEquals(r.data.acessoAte, trialEnd);
  assertEquals(r.data.isTrial, true);
  assertEquals(r.data.endsNow, false);
  assertEquals(r.data.multa, null);
  assertEquals(r.charges, 0);
  assert(r.deleted, "remoção da assinatura no Asaas deve continuar");
});

Deno.test("h) cancel de assinatura paga: data_vencimento intacta, isTrial false (como hoje)", async () => {
  const due = inDays(20);
  const r = await cancel({ status: "ativo", trial_ends_at: null, data_vencimento: due, ciclos_pagos: 2, counted_payment_ids: ["pay_1", "pay_2"] });
  assertEquals(r.status, 200);
  assertEquals(r.patch.status, "cancelado");
  assertEquals("data_vencimento" in r.patch, false);
  assertEquals(r.patch.asaas_subscription_id_anterior, "sub_test");
  assertEquals(r.data.acessoAte, due);
  assertEquals(r.data.accessUntil, due);
  assertEquals(r.data.isTrial, false);
  assert(r.deleted);
});

Deno.test("cancel em trial sem trial_ends_at: acesso termina agora", async () => {
  const before = Date.now();
  const r = await cancel({ trial_ends_at: null, data_vencimento: inDays(28) });
  assertEquals(r.data.isTrial, true);
  assertEquals(r.data.endsNow, true);
  const ms = new Date(r.patch.data_vencimento).getTime();
  assert(ms >= before && ms <= Date.now(), "data_vencimento deve ser agora");
  assertEquals(r.data.accessUntil, r.patch.data_vencimento);
});

Deno.test("cancel em trial já vencido: acesso termina agora", async () => {
  const before = Date.now();
  const r = await cancel({ trial_ends_at: inDays(-2), data_vencimento: inDays(28) });
  assertEquals(r.data.isTrial, true);
  assertEquals(r.data.endsNow, true);
  const ms = new Date(r.patch.data_vencimento).getTime();
  assert(ms >= before && ms <= Date.now());
});

Deno.test("trial em contrato anual (ciclosPagos 0): sem multa de fidelidade", async () => {
  const r = await cancel({ ciclo_contratado: "anual", ciclos_pagos: 0, compromisso_inicio: inDays(-2) });
  assertEquals(r.status, 200);
  assertEquals(r.data.ciclo, "anual");
  assertEquals(r.data.multa, null);
  assertEquals(r.charges, 0);
  assertEquals(r.data.isTrial, true);
});

// ── Fail-closed / descoberta robusta (P21) ───────────────────────────────────
const resumedRow = { asaas_subscription_id: null, asaas_customer_id: "cus_old", asaas_checkout_id: "ck_new", asaas_checkout_created_at: new Date().toISOString() };

Deno.test("a) id nulo + cliente velho: assinatura viva no cliente NOVO (mesmo e-mail) é removida, verificada e só então a linha cancela", async () => {
  const trialEnd = inDays(5);
  const r = await cancel({ ...resumedRow, trial_ends_at: trialEnd }, {
    customers: [{ id: "cus_old", email: EMAIL }, { id: "cus_new", email: EMAIL }],
    subs: [{ id: "sub_live", customer: "cus_new", status: "ACTIVE", externalReference: "test-user" }],
  });
  assertEquals(r.status, 200);
  assertEquals(r.deletes, ["sub_live"]);
  assert(r.lastDeleteIndex >= 0 && r.lastDeleteIndex < r.patchIndex, "DELETE precisa vir antes de gravar 'cancelado'");
  const relists = r.calls.filter((c, i) => i > r.lastDeleteIndex && c.url.includes("/subscriptions?customer=cus_new"));
  assert(relists.length >= 1, "relista o cliente novo depois do DELETE");
  assertEquals(r.patch.status, "cancelado");
  assertEquals(r.patch.asaas_subscription_id_anterior, "sub_live");
  assertEquals(r.patch.data_vencimento, trialEnd);
  assertEquals(r.subs.find((s) => s.id === "sub_live")?.deleted, true);
});

Deno.test("b) dois clientes com o mesmo e-mail, assinatura no segundo (paginação) → encontrada e removida", async () => {
  const r = await cancel({ ...resumedRow, asaas_customer_id: null }, {
    customers: [{ id: "cus_a", email: EMAIL }, { id: "cus_b", email: EMAIL }],
    subs: [{ id: "sub_b", customer: "cus_b", status: "ACTIVE" }],
  });
  assertEquals(r.status, 200);
  assertEquals(r.deletes, ["sub_b"]);
  assertEquals(r.patch.status, "cancelado");
});

Deno.test("c) DELETE 5xx → 502, linha intacta, mensagem exata", async () => {
  const r = await cancel(resumedRow, {
    customers: [{ id: "cus_new", email: EMAIL }],
    subs: [{ id: "sub_live", customer: "cus_new", status: "ACTIVE" }],
    deleteStatus: { sub_live: 503 },
  });
  assertEquals(r.status, 502);
  assertEquals(r.data.error, UNVERIFIED);
  assertEquals(r.patch, undefined, "linha não pode mudar");
});

Deno.test("c) verificação ainda vê assinatura ACTIVE → 502, linha intacta, mensagem exata", async () => {
  const r = await cancel(resumedRow, {
    customers: [{ id: "cus_new", email: EMAIL }],
    subs: [{ id: "sub_live", customer: "cus_new", status: "ACTIVE" }],
    deleteIgnored: new Set(["sub_live"]),
  });
  assertEquals(r.status, 502);
  assertEquals(r.data.error, UNVERIFIED);
  assertEquals(r.patch, undefined);
});

Deno.test("c) busca de clientes por e-mail falha → 502, linha intacta", async () => {
  const r = await cancel(resumedRow, { customersStatus: 500 });
  assertEquals(r.status, 502);
  assertEquals(r.data.error, UNVERIFIED);
  assertEquals(r.patch, undefined);
});

Deno.test("d) teste sem cartão (sem checkout/cliente/assinatura) → cancela como hoje, sem chamar o Asaas", async () => {
  const trialEnd = inDays(5);
  const r = await cancel({ asaas_subscription_id: null, asaas_customer_id: null, asaas_checkout_id: null, trial_ends_at: trialEnd }, {});
  assertEquals(r.status, 200);
  assertEquals(r.asaasCalls.length, 0);
  assertEquals(r.patch.status, "cancelado");
  assertEquals(r.patch.data_vencimento, trialEnd);
  assertEquals(r.patch.asaas_subscription_id_anterior, null);
});

Deno.test("f) assinatura com externalReference de OUTRO usuário nunca é removida", async () => {
  const r = await cancel(resumedRow, {
    customers: [{ id: "cus_new", email: EMAIL }],
    subs: [
      { id: "sub_other", customer: "cus_new", status: "ACTIVE", externalReference: OTHER_USER },
      { id: "sub_mine", customer: "cus_new", status: "ACTIVE" },
    ],
  });
  assertEquals(r.status, 200);
  assertEquals(r.deletes, ["sub_mine"]);
  assertEquals(r.subs.find((s) => s.id === "sub_other")?.deleted, undefined);
});

Deno.test("resolveSubId: cliente gravado sem assinatura não encerra a busca; acha pelo e-mail, vincula e troca o cliente velho (sem GET /checkouts)", async () => {
  const r = await call("list_invoices", resumedRow, {
    customers: [{ id: "cus_new", email: EMAIL }],
    subs: [{ id: "sub_live", customer: "cus_new", status: "ACTIVE", dateCreated: new Date().toISOString().slice(0, 10) }],
  });
  assertEquals(r.status, 200);
  assertEquals(r.patch, { asaas_subscription_id: "sub_live", asaas_customer_id: "cus_new" });
  assertEquals(r.asaasCalls.some((c) => c.url.includes("/checkouts/")), false);
});
