// P22: cliente do Asaas criado/reaproveitado ANTES do checkout (individual).
// Entrada real da função; todo HTTP é interceptado. Rode em invocação própria.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { GoTrueClient } from "npm:@supabase/auth-js";

GoTrueClient.prototype.startAutoRefresh = async () => {};

const envNames = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "ASAAS_API_KEY_SANDBOX", "ASAAS_ENV"];
const envValues = ["https://database.invalid", "test-anon", "test-service", "test-provider", "sandbox"];
envNames.forEach((key, i) => Deno.env.set(key, envValues[i]));

let handler: ((req: Request) => Promise<Response>) | null = null;
const originalServe = Deno.serve;
Object.defineProperty(Deno, "serve", { configurable: true, value: (h: (req: Request) => Promise<Response>) => { handler = h; } });
await import("./index.ts");
Object.defineProperty(Deno, "serve", { configurable: true, value: originalServe });

const CPF = "52998224725";
const ACCOUNT_EMAIL = "conta@example.test";
type Call = { url: URL; method: string; body: any };

interface Opts {
  row?: Record<string, unknown> | null;
  profileDoc?: string | null;
  body?: Record<string, unknown>;
  storedCustomer?: { status: number; data: unknown };
  byExternalReference?: unknown[];
  findStatus?: number;
  createStatus?: number;
  createDelayMs?: number;
}

function baseRow(extra: Record<string, unknown> = {}) {
  return {
    id: "row-1", user_id: "user-1", status: "expirado", plano: "presenca", ciclo_contratado: "mensal",
    trial_ends_at: new Date(Date.now() - 20 * 86_400_000).toISOString(), ciclos_pagos: 0,
    asaas_subscription_id: null, asaas_customer_id: null, asaas_checkout_id: null, checkout_context: null,
    ...extra,
  };
}

let lockHeld = false;
function install(opts: Opts, calls: Call[]) {
  globalThis.fetch = async (input, init) => {
    const req = new Request(input, init);
    const url = new URL(req.url);
    const text = req.method === "GET" ? "" : await req.text();
    calls.push({ url, method: req.method, body: text ? JSON.parse(text) : null });
    let data: unknown = null;
    let status = 200;
    const rows = opts.row === null ? [] : [opts.row ?? baseRow()];
    if (url.hostname === "database.invalid") {
      if (url.pathname === "/auth/v1/user") data = { id: "user-1", aud: "authenticated", role: "authenticated", email: ACCOUNT_EMAIL };
      else if (url.pathname === "/rest/v1/rpc/claim_checkout_creation") { data = !lockHeld; lockHeld = true; }
      else if (url.pathname === "/rest/v1/rpc/release_checkout_creation") { lockHeld = false; data = null; }
      else if (url.pathname === "/rest/v1/profiles") {
        data = req.method === "GET" ? [{ account_type: "individual", cpf_cnpj: opts.profileDoc ?? null, nome_completo: "Nome Perfil" }] : null;
      } else if (url.pathname === "/rest/v1/assinaturas") {
        if (req.method !== "GET") data = url.searchParams.get("select") === "id" ? [{ id: "row-1" }] : null;
        else if (url.searchParams.get("asaas_subscription_id") === "not.is.null") data = [];
        else data = url.searchParams.get("select")?.includes("multa") ? [] : rows;
      } else throw new Error(`db path ${url.pathname}`);
    } else if (url.hostname === "sandbox.asaas.com") {
      const p = url.pathname;
      if (p === "/api/v3/checkouts" && req.method === "POST") data = { id: "chk_new", link: "https://checkout.invalid/chk_new" };
      else if (/^\/api\/v3\/checkouts\/[^/]+\/cancel$/.test(p)) data = {};
      else if (p === "/api/v3/customers" && req.method === "GET") { status = opts.findStatus ?? 200; data = { data: opts.byExternalReference ?? [] }; }
      else if (p === "/api/v3/customers" && req.method === "POST") {
        if (opts.createDelayMs) await new Promise((r) => setTimeout(r, opts.createDelayMs));
        status = opts.createStatus ?? 200;
        data = status === 200 ? { id: "cus_new" } : { errors: [{ code: "invalid_cpfCnpj", description: "x" }] };
      } else if (/^\/api\/v3\/customers\/[^/]+$/.test(p) && req.method === "GET") {
        status = opts.storedCustomer?.status ?? 200; data = opts.storedCustomer?.data ?? { id: p.split("/").pop(), cpfCnpj: CPF };
      } else if (/^\/api\/v3\/customers\/[^/]+$/.test(p) && req.method === "PUT") data = { id: p.split("/").pop() };
      else throw new Error(`provider path ${req.method} ${p}`);
    } else throw new Error("Network escape forbidden");
    return new Response(data === null ? null : JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
  };
}

async function call(opts: Opts, calls: Call[]) {
  const b64url = (v: unknown) => btoa(JSON.stringify(v)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const token = `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({ sub: "user-1", email: ACCOUNT_EMAIL, exp: 4102444800 })}.c2ln`;
  const res = await handler!(new Request("https://function.invalid", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(opts.body ?? { plano: "presenca", nome: "Cliente Teste", email: "digitado@outro.test", ciclo: "mensal", cpfCnpj: "529.982.247-25" }),
  }));
  return { status: res.status, data: await res.json() };
}

async function run(opts: Opts) {
  const originalFetch = globalThis.fetch;
  const log = console.log, err = console.error, warn = console.warn;
  console.log = () => {}; console.error = () => {}; console.warn = () => {};
  lockHeld = false;
  const calls: Call[] = [];
  install(opts, calls);
  try {
    assert(handler);
    const r = await call(opts, calls);
    return { ...r, calls, ...pick(calls) };
  } finally {
    globalThis.fetch = originalFetch;
    console.log = log; console.error = err; console.warn = warn;
  }
}

function pick(calls: Call[]) {
  const asaas = calls.filter((c) => c.url.hostname === "sandbox.asaas.com");
  return {
    asaas,
    checkouts: asaas.filter((c) => c.method === "POST" && c.url.pathname === "/api/v3/checkouts"),
    creates: asaas.filter((c) => c.method === "POST" && c.url.pathname === "/api/v3/customers"),
    rowWrites: calls.filter((c) => c.url.pathname === "/rest/v1/assinaturas" && c.method !== "GET"),
    profileWrites: calls.filter((c) => c.url.pathname === "/rest/v1/profiles" && c.method !== "GET"),
    lock: calls.some((c) => c.url.pathname === "/rest/v1/rpc/claim_checkout_creation"),
  };
}

Deno.test("novo cliente: POST /customers uma vez com name/e-mail da conta/cpfCnpj/externalReference; checkout só com customer", async () => {
  const r = await run({});
  assertEquals(r.status, 200);
  assertEquals(r.data.success, true);
  assertEquals(r.creates.length, 1);
  assertEquals(r.creates[0].body, { name: "Cliente Teste", email: ACCOUNT_EMAIL, cpfCnpj: CPF, externalReference: "user-1" });
  assertEquals(r.checkouts.length, 1);
  assertEquals(r.checkouts[0].body.customer, "cus_new");
  assert(!("customerData" in r.checkouts[0].body));
  // gravação condicional (onde ainda é nulo) e linha final com o cliente
  const cond = r.rowWrites.find((c) => c.body && Object.keys(c.body).length === 1 && c.body.asaas_customer_id === "cus_new");
  assert(cond);
  assertEquals(cond!.url.searchParams.get("asaas_customer_id"), "is.null");
  const final = r.rowWrites.find((c) => c.body?.asaas_checkout_id === "chk_new");
  assertEquals(final?.body.asaas_customer_id, "cus_new");
});

Deno.test("body.email diferente do e-mail da conta é ignorado", async () => {
  const r = await run({});
  assertEquals(r.creates[0].body.email, ACCOUNT_EMAIL);
  assert(!JSON.stringify(r.asaas.map((c) => c.body)).includes("digitado@outro.test"));
});

Deno.test("documento válido do body é salvo em profiles.cpf_cnpj só com dígitos", async () => {
  const r = await run({});
  assertEquals(r.profileWrites.length, 1);
  assertEquals(r.profileWrites[0].body, { cpf_cnpj: CPF });
});

Deno.test("sem documento no body usa o do perfil (sem regravar)", async () => {
  const r = await run({ profileDoc: CPF, body: { plano: "presenca", nome: "X", ciclo: "mensal" } });
  assertEquals(r.data.success, true);
  assertEquals(r.profileWrites.length, 0);
  assertEquals(r.creates[0].body.cpfCnpj, CPF);
});

Deno.test("documento ausente → documento_necessario antes de Asaas, trava ou gravação", async () => {
  const r = await run({ body: { plano: "presenca", nome: "X", ciclo: "mensal" } });
  assertEquals(r.status, 200);
  assertEquals(r.data.ok, false);
  assertEquals(r.data.reason, "documento_necessario");
  assertEquals(r.asaas.length, 0);
  assertEquals(r.lock, false);
  assertEquals(r.rowWrites.length + r.profileWrites.length, 0);
});

Deno.test("documento inválido (dígito verificador ou repetido) → documento_invalido antes de tudo", async () => {
  for (const doc of ["529.982.247-24", "111.111.111-11", "11.222.333/0001-80", "123"]) {
    const r = await run({ body: { plano: "presenca", nome: "X", ciclo: "mensal", cpfCnpj: doc } });
    assertEquals(r.data.reason, "documento_invalido", doc);
    assertEquals(r.asaas.length, 0);
    assertEquals(r.lock, false);
    assertEquals(r.rowWrites.length + r.profileWrites.length, 0);
  }
});

Deno.test("asaas_customer_id gravado é reaproveitado (sem POST /customers)", async () => {
  const r = await run({ row: baseRow({ asaas_customer_id: "cus_old" }) });
  assertEquals(r.creates.length, 0);
  assertEquals(r.checkouts[0].body.customer, "cus_old");
  assert(!r.asaas.some((c) => c.method === "PUT"));
});

Deno.test("cliente gravado sem CPF recebe PUT só do cpfCnpj", async () => {
  const r = await run({ row: baseRow({ asaas_customer_id: "cus_old" }), storedCustomer: { status: 200, data: { id: "cus_old", cpfCnpj: null } } });
  const put = r.asaas.find((c) => c.method === "PUT");
  assertEquals(put?.body, { cpfCnpj: CPF });
  assertEquals(r.checkouts[0].body.customer, "cus_old");
});

Deno.test("id gravado removido (404 ou deleted) é trocado, com gravação condicional ao valor lido", async () => {
  for (const storedCustomer of [{ status: 404, data: { errors: [] } }, { status: 200, data: { id: "cus_old", deleted: true } }]) {
    const r = await run({ row: baseRow({ asaas_customer_id: "cus_old" }), storedCustomer });
    assertEquals(r.creates.length, 1);
    assertEquals(r.checkouts[0].body.customer, "cus_new");
    const cond = r.rowWrites.find((c) => c.body && Object.keys(c.body).length === 1 && c.body.asaas_customer_id === "cus_new");
    assertEquals(cond?.url.searchParams.get("asaas_customer_id"), "eq.cus_old");
  }
});

Deno.test("GET /customers?externalReference=<user> reaproveita o cliente existente", async () => {
  const r = await run({ byExternalReference: [{ id: "cus_ref", externalReference: "user-1", deleted: false }] });
  const find = r.asaas.find((c) => c.method === "GET" && c.url.pathname === "/api/v3/customers");
  assertEquals(find?.url.searchParams.get("externalReference"), "user-1");
  assertEquals(r.creates.length, 0);
  assertEquals(r.checkouts[0].body.customer, "cus_ref");
});

Deno.test("erro do Asaas no cliente → cliente_indisponivel, sem checkout e sem alterar a linha", async () => {
  for (const o of [{ createStatus: 400 }, { findStatus: 500 }, { row: baseRow({ asaas_customer_id: "cus_old" }), storedCustomer: { status: 503, data: null } }] as Opts[]) {
    const r = await run(o);
    assertEquals(r.status, 200);
    assertEquals(r.data.ok, false);
    assertEquals(r.data.reason, "cliente_indisponivel");
    assertEquals(r.checkouts.length, 0);
    assertEquals(r.rowWrites.length, 0);
  }
});

Deno.test("clique duplo / chamadas concorrentes → 1 cliente e 1 checkout (trava)", async () => {
  const originalFetch = globalThis.fetch;
  const log = console.log, err = console.error, warn = console.warn;
  console.log = () => {}; console.error = () => {}; console.warn = () => {};
  lockHeld = false;
  const calls: Call[] = [];
  const opts: Opts = { createDelayMs: 30 };
  install(opts, calls);
  try {
    const [a, b] = await Promise.all([call(opts, calls), call(opts, calls)]);
    const p = pick(calls);
    assertEquals(p.creates.length, 1);
    assertEquals(p.checkouts.length, 1);
    const results = [a, b].map((x) => x.data.success === true ? "ok" : x.data.error);
    assertEquals(results.sort(), ["checkout_em_criacao", "ok"]);
  } finally {
    globalThis.fetch = originalFetch;
    console.log = log; console.error = err; console.warn = warn;
  }
});
