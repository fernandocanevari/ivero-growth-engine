/** P52: trial com cartão/assinatura + "trocar_plano" usa change_plan. */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

const invoke = vi.fn();
const loadDoc = vi.fn();
let statusMock: Record<string, unknown>;

vi.mock("@/components/checkout/CpfCnpjDialog", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/checkout/CpfCnpjDialog")>()),
  loadOwnDocument: () => loadDoc(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: "u1", email: "c@x.com", user_metadata: {} } } }) },
    functions: { invoke: (...a: unknown[]) => invoke(...a) },
  },
}));
vi.mock("@/hooks/useSubscriptionStatus", () => ({ useSubscriptionStatus: () => statusMock }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ track: () => {} }));
vi.mock("@/hooks/useAccountType", () => ({
  useAccountType: () => ({ accountType: "individual", agencyName: null, isLoading: false, isAgency: false }),
}));

import { UpgradeModal } from "./UpgradeModal";

const base = { plano: "presenca", isLoading: false, isAdmin: false, cicloContratado: "mensal" };
const names = () => invoke.mock.calls.map(([n]) => n);

beforeEach(() => {
  invoke.mockReset();
  loadDoc.mockReset();
  loadDoc.mockResolvedValue([]);
  invoke.mockImplementation((fn: string) =>
    Promise.resolve(fn === "create-checkout"
      ? { data: { checkoutUrl: "https://asaas.test/c" }, error: null }
      : { data: { ok: true, mode: "asaas", path: "immediate" }, error: null }));
  Object.defineProperty(window, "location", { writable: true, value: { href: "" } as Location });
});

async function click(intent?: "contratar" | "trocar_plano") {
  render(<UpgradeModal open onOpenChange={() => {}} {...(intent ? { intent } : {})} />);
  fireEvent.click(await screen.findByRole("button", { name: /Ampliar influência/i }));
  await waitFor(() => expect(invoke).toHaveBeenCalled());
}

describe("UpgradeModal — P52 roteamento de trial com cartão", () => {
  it("trial + assinatura + trocar_plano → change_plan uma vez, sem checkout e sem pedir documento", async () => {
    statusMock = { ...base, effectiveStatus: "trial", hasAsaasSubscription: true };
    loadDoc.mockResolvedValue(["documento"]);
    await click("trocar_plano");
    expect(invoke).toHaveBeenCalledTimes(1);
    const [fn, opts] = invoke.mock.calls[0] as [string, { body: Record<string, unknown> }];
    expect(fn).toBe("manage-subscription");
    expect(opts.body).toMatchObject({ action: "change_plan", plano: "influencia", ciclo: "mensal" });
    expect(names()).not.toContain("create-checkout");
    expect(loadDoc).not.toHaveBeenCalled();
  });

  it("trial + assinatura + contratar → create-checkout com gate de documento", async () => {
    statusMock = { ...base, effectiveStatus: "trial", hasAsaasSubscription: true };
    await click("contratar");
    expect(loadDoc).toHaveBeenCalledTimes(1);
    expect(names()).toEqual(["create-checkout"]);
  });

  it("trial + contratar com documento faltando → abre o pedido e não chama nada", async () => {
    statusMock = { ...base, effectiveStatus: "trial", hasAsaasSubscription: true };
    loadDoc.mockResolvedValue(["documento"]);
    render(<UpgradeModal open onOpenChange={() => {}} intent="contratar" />);
    fireEvent.click(await screen.findByRole("button", { name: /Ampliar influência/i }));
    await waitFor(() => expect(loadDoc).toHaveBeenCalled());
    expect(invoke).not.toHaveBeenCalled();
  });

  it.each([
    ["trial sem assinatura", { effectiveStatus: "trial", hasAsaasSubscription: false }, "manage-subscription"],
    ["cancelado", { effectiveStatus: "cancelado", hasAsaasSubscription: false }, "create-checkout"],
    ["trial vencido", { effectiveStatus: "trial_expirado", hasAsaasSubscription: true }, "create-checkout"],
    ["ativo", { effectiveStatus: "ativo", hasAsaasSubscription: true }, "manage-subscription"],
    ["inadimplente", { effectiveStatus: "inadimplente", hasAsaasSubscription: true }, "manage-subscription"],
  ])("%s + trocar_plano → %s", async (_n, st, expected) => {
    statusMock = { ...base, ...st };
    await click("trocar_plano");
    expect(invoke.mock.calls[0][0]).toBe(expected);
  });

  it("admin em trial com assinatura não usa change_plan", async () => {
    statusMock = { ...base, isAdmin: true, effectiveStatus: "trial", hasAsaasSubscription: true };
    await click("trocar_plano");
    expect(names()).not.toContain("manage-subscription");
  });

  it("duplo clique envia um pedido e mostra Processando...", async () => {
    statusMock = { ...base, effectiveStatus: "trial", hasAsaasSubscription: true };
    let resolve: (v: unknown) => void = () => {};
    invoke.mockImplementation(() => new Promise((r) => { resolve = r; }));
    render(<UpgradeModal open onOpenChange={() => {}} intent="trocar_plano" />);
    const btn = await screen.findByRole("button", { name: /Ampliar influência/i });
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(await screen.findByText(/Processando\.\.\./)).toBeTruthy();
    expect(invoke).toHaveBeenCalledTimes(1);
    resolve({ data: { ok: true, mode: "asaas" }, error: null });
  });
});
