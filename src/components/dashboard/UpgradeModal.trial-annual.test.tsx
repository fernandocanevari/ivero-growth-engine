/** P59: trial com cartão no Anual abre no Anual e não troca para mensal sozinho. */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

const invoke = vi.fn();
let statusMock: Record<string, unknown>;

vi.mock("@/components/checkout/CpfCnpjDialog", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/checkout/CpfCnpjDialog")>()),
  loadOwnDocument: async () => [],
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
const trialAnual = { ...base, effectiveStatus: "trial", hasAsaasSubscription: true, cicloPretendido: "anual" };
const text = () => document.body.textContent ?? "";
function tab(name: RegExp) {
  return screen.getAllByRole("button").find((b) => name.test(b.textContent ?? "") && b.className.includes("rounded-full") && b.className.includes("px-4"));
}
function expectToggle(c: "anual" | "mensal") {
  const on = c === "anual" ? tab(/^Anual/) : tab(/^Mensal$/);
  const off = c === "anual" ? tab(/^Mensal$/) : tab(/^Anual/);
  expect(on!.className).toContain("bg-background");
  expect(off!.className).not.toContain("bg-background");
}
async function pickInfluencia() {
  fireEvent.click(await screen.findByRole("button", { name: /Ampliar influência/i }));
  await waitFor(() => expect(invoke).toHaveBeenCalled());
  const [fn, opts] = invoke.mock.calls[0] as [string, { body: Record<string, unknown> }];
  expect(fn).toBe("manage-subscription");
  return opts.body;
}

beforeEach(() => {
  invoke.mockReset();
  invoke.mockResolvedValue({ data: { ok: true, mode: "asaas", path: "immediate" }, error: null });
  Object.defineProperty(window, "location", { writable: true, value: { href: "" } as Location });
});

describe("UpgradeModal — P59 trial com cartão no Anual", () => {
  it("abre no Anual com preço anual e economia", () => {
    statusMock = trialAnual;
    render(<UpgradeModal open onOpenChange={() => {}} />);
    expectToggle("anual");
    expect(text()).toContain("R$ 397");
    expect(text()).toContain("Economia de");
  });

  it("trocar_plano sem mexer no toggle envia ciclo anual", async () => {
    statusMock = trialAnual;
    render(<UpgradeModal open onOpenChange={() => {}} intent="trocar_plano" />);
    expect(await pickInfluencia()).toMatchObject({ action: "change_plan", plano: "influencia", ciclo: "anual" });
  });

  it("cliente escolhe Mensal explicitamente → envia ciclo mensal", async () => {
    statusMock = trialAnual;
    render(<UpgradeModal open onOpenChange={() => {}} intent="trocar_plano" />);
    fireEvent.click(tab(/^Mensal$/)!);
    expectToggle("mensal");
    expect(await pickInfluencia()).toMatchObject({ action: "change_plan", plano: "influencia", ciclo: "mensal" });
  });

  it.each([
    ["checkout abandonado (sem assinatura)", { ...trialAnual, hasAsaasSubscription: false }],
    ["trial com pretendido mensal", { ...trialAnual, cicloPretendido: "mensal" }],
    ["trial com pretendido null", { ...trialAnual, cicloPretendido: null }],
  ])("%s → abre no Mensal como hoje", (_n, st) => {
    statusMock = st;
    render(<UpgradeModal open onOpenChange={() => {}} />);
    expectToggle("mensal");
    expect(text()).toContain("R$ 497");
  });

  it("ativo anual: toggle travado (lockAnnual), como hoje", () => {
    statusMock = { ...base, effectiveStatus: "ativo", hasAsaasSubscription: true, cicloContratado: "anual", cicloPretendido: "mensal" };
    render(<UpgradeModal open onOpenChange={() => {}} />);
    expect(tab(/^Mensal$/)).toBeUndefined();
  });

  it("ativo mensal com pretendido anual: abre no Mensal, como hoje", () => {
    statusMock = { ...base, effectiveStatus: "ativo", hasAsaasSubscription: true, cicloPretendido: "anual" };
    render(<UpgradeModal open onOpenChange={() => {}} />);
    expectToggle("mensal");
  });
});
