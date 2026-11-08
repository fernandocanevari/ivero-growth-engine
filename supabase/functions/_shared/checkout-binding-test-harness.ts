// Isolated real-handler tests: every HTTP request is intercepted.
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { GoTrueClient } from "npm:@supabase/auth-js";
GoTrueClient.prototype.startAutoRefresh = async () => {};
export const UID = "ba97500d-53c6-426b-b5e6-7015bfcf4395";
export const CK = "ck_binding";
export const AT = "2026-11-08T02:00:00Z"; // Brasília: Nov 7
export const subscription = (extra: Record<string, unknown> = {}) => ({ id: "sub_new", customer: "cus_new", status: "ACTIVE", dateCreated: "2026-11-07", value: 717, cycle: "MONTHLY", ...extra });
export const row = (extra: Record<string, unknown> = {}): Record<string, any> => ({
  id: "local", user_id: UID, status: "ativo", plano: "presenca", plano_pretendido: "influencia", ciclo_contratado: "anual",
  asaas_subscription_id: null, asaas_subscription_id_anterior: "sub_old", asaas_customer_id: "cus_old",
  asaas_checkout_id: CK, asaas_checkout_created_at: AT, data_vencimento: "2026-12-11T02:59:59.999Z",
  ciclos_pagos: 0, counted_payment_ids: [], compromisso_inicio: null, trial_ends_at: null,
  checkout_context: { completed: true, prev: {}, requested: { value: 717, cycle: "MONTHLY", plano: "influencia", ciclo: "anual" } }, ...extra,
});
type Handler = (r: Request) => Promise<Response>;
export async function capture(path: string): Promise<Handler> {
  let handler: Handler | undefined;
  const serve = Deno.serve;
  Deno.serve = ((h: Handler) => { handler = h; return {} as ReturnType<typeof Deno.serve>; }) as typeof Deno.serve;
  try { await import(path); } finally { Deno.serve = serve; }
  assert(handler);
  return handler;
}
export async function run(handler: Handler, body: unknown, state: Record<string, any>, options: {
  customers?: Record<string, any>[]; subscriptions?: Record<string, any>[]; payments?: Record<string, any>[]; fail?: boolean; race?: string; boundElsewhere?: string[];
} = {}) {
  const oldFetch = globalThis.fetch, oldGet = Deno.env.get, oldWarn = console.warn, oldLog = console.log;
  const env: Record<string, string> = { SUPABASE_URL: "https://binding.invalid", SUPABASE_ANON_KEY: "fake", SUPABASE_SERVICE_ROLE_KEY: "fake", ASAAS_WEBHOOK_TOKEN: "fake", ASAAS_ENV: "sandbox", ASAAS_API_KEY_SANDBOX: "fake" };
  const patches: Record<string, any>[] = [], calls: { path: string; method: string }[] = [], warnings: unknown[][] = [], logs: unknown[][] = [];
  Deno.env.get = (key) => env[key];
  console.warn = (...args) => { warnings.push(args); };
  console.log = (...args) => { logs.push(args); };
  globalThis.fetch = async (input, init) => {
    const req = input instanceof Request ? input : new Request(input, init);
    const url = new URL(req.url);
    let out: unknown = null;
    if (url.hostname === "binding.invalid") {
      if (url.pathname === "/auth/v1/user") out = { id: UID, aud: "authenticated", role: "authenticated" };
      else if (url.pathname.endsWith("profiles")) out = { email: "test@example.invalid" };
      else if (url.pathname.endsWith("assinaturas") && url.searchParams.get("id")?.startsWith("neq.")) {
        // Other rows holding a subscription id.
        const sub = url.searchParams.get("asaas_subscription_id")?.slice(3);
        out = (options.boundElsewhere ?? []).includes(sub ?? "") ? [{ id: "other" }] : [];
      } else if (url.pathname.endsWith("assinaturas")) {
        const matches = [...url.searchParams].every(([k, v]) => {
          if (["select", "order", "limit", "offset"].includes(k)) return true;
          const value = k.startsWith("checkout_context->>") ? state.checkout_context?.[k.split("->>")[1]] : state[k];
          if (v === "is.null") return value == null;
          if (v === "not.is.null") return value != null;
          if (v.startsWith("eq.")) return String(value) === v.slice(3);
          if (v.startsWith("in.(")) return v.slice(4, -1).split(",").includes(String(value));
          throw new Error(`unknown_filter:${k}:${v}`);
        });
        if (req.method === "PATCH") {
          const patch = await req.json(); patches.push(patch);
          // Simulate SUBSCRIPTION_CREATED between discovery and CAS.
          if (url.searchParams.get("asaas_subscription_id") === "is.null" && options.race) state.asaas_subscription_id = options.race;
          const applies = matches && !(url.searchParams.get("asaas_subscription_id") === "is.null" && state.asaas_subscription_id != null);
          if (applies) Object.assign(state, patch);
          out = req.headers.get("Prefer")?.includes("return=representation") ? (applies ? [structuredClone(state)] : []) : null;
        } else out = matches ? structuredClone(state) : null;
      } else throw new Error(`unexpected_db:${url.pathname}`);
    } else if (url.hostname === "sandbox.asaas.com") {
      assert(req.method === "GET", "new discovery must be GET only");
      const path = url.pathname.replace("/api/v3", ""); calls.push({ path: path + url.search, method: req.method });
      if (options.fail) throw new Error("network_failure");
      if (path === "/customers") {
        // Server-side filters, as the real Asaas: proves the code sends them.
        const cpf = url.searchParams.get("cpfCnpj"), email = url.searchParams.get("email");
        if (!cpf && !email) throw new Error("unfiltered_customers");
        out = { data: (options.customers ?? []).filter((c) => (!cpf || c.cpfCnpj === cpf) && (!email || c.email === email)), hasMore: false };
      }
      else if (path.startsWith("/customers/")) out = (options.customers ?? []).find((c) => c.id === path.split("/").pop()) ?? {};
      else if (path === "/subscriptions") {
        const customer = url.searchParams.get("customer");
        if (!customer) throw new Error("unfiltered_subscriptions");
        out = { data: (options.subscriptions ?? []).filter((s) => s.customer === customer), hasMore: false };
      }
      else if (path === "/payments") out = { data: options.payments ?? [], hasMore: false };
      else if (/^\/subscriptions\/[^/]+\/payments$/.test(path)) out = { data: options.payments ?? [], hasMore: false };
      else if (path.startsWith("/subscriptions/")) out = (options.subscriptions ?? []).find((s) => s.id === path.split("/").pop()) ?? null;
      else throw new Error(`unexpected_provider:${path}`);
    } else throw new Error("network_escape");
    return new Response(out == null ? null : JSON.stringify(out), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const token = `${btoa(JSON.stringify({ alg: "HS256" }))}.${btoa(JSON.stringify({ sub: UID, exp: 4102444800 }))}.c2ln`;
    const response = await handler(new Request("https://function.invalid", { method: "POST", headers: { "Content-Type": "application/json", "asaas-access-token": "fake", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }));
    return { status: response.status, body: await response.json(), patches, calls, warnings, logs };
  } finally { globalThis.fetch = oldFetch; Deno.env.get = oldGet; console.warn = oldWarn; console.log = oldLog; }
}