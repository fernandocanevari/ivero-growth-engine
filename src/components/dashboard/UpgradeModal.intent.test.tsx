/**
 * Roteamento por intenção no UpgradeModal.
 *
 * Cenários cobertos:
 *  1) trial + intent="contratar"     → create-checkout (pagamento real)
 *  2) trial + intent="trocar_plano"  → manage-subscription/change_plan (local)
 *  3) pagante + trocar_plano         → change_plan com pró-rata preservado
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

const invoke = vi.fn();
const getUser = vi.fn();
const toastMock = vi.fn();
let statusMock: Record<string, unknown>;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: () => getUser() },
    functions: { invoke: (...a: unknown[]) => invoke(...a) },
  },
}));

vi.mock("@/hooks/useSubscriptionStatus", () => ({
  useSubscriptionStatus: () => statusMock,
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: (...a: unknown[]) => toastMock(...a),
}));

vi.mock("@/lib/analytics", () => ({ track: () => {} }));

import { UpgradeModal } from "./UpgradeModal";

const TRIAL = {
  plano: "presenca",
  isLoading: false,
  isAdmin: false,
  effectiveStatus: "trial",
  hasAsaasSubscription: false,
  cicloContratado: "mensal",
};

const PAGANTE = {
  plano: "presenca",
  isLoading: false,
  isAdmin: false,
  effectiveStatus: "ativo",
  hasAsaasSubscription: true,
  cicloContratado: "mensal",
};

beforeEach(() => {
  invoke.mockReset();
  getUser.mockReset();
  toastMock.mockReset();
  getUser.mockResolvedValue({
    data: { user: { id: "u1", email: "c@x.com", user_metadata: {} } },
  });
  // window.location.href não é atribuível em jsdom sem stub.
  Object.defineProperty(window, "location", {
    writable: true,
    value: { href: "" } as Location,
  });
});

async function clickPlano(nome: RegExp) {
  const btn = await screen.findByRole("button", { name: nome });
  fireEvent.click(btn);
}

describe("UpgradeModal — roteamento por intenção", () => {
  it("trial + contratar vai pro checkout real", async () => {
    statusMock = TRIAL;
    invoke.mockResolvedValue({
      data: { checkoutUrl: "https://asaas.test/checkout/1" },
      error: null,
    });

    render(<UpgradeModal open onOpenChange={() => {}} intent="contratar" />);
    await clickPlano(/Ampliar influência/i);

    await waitFor(() => expect(invoke).toHaveBeenCalled());
    const [fn, opts] = invoke.mock.calls[0] as [string, { body: Record<string, unknown> }];
    expect(fn).toBe("create-checkout");
    expect(opts.body.intent).toBe("contratar");
    expect(invoke.mock.calls.some(([n]) => n === "manage-subscription")).toBe(false);
    await waitFor(() =>
      expect(window.location.href).toBe("https://asaas.test/checkout/1"),
    );
  });

  it("trial + trocar_plano continua troca local", async () => {
    statusMock = TRIAL;
    invoke.mockResolvedValue({ data: { ok: true, mode: "local" }, error: null });

    render(<UpgradeModal open onOpenChange={() => {}} />);
    await clickPlano(/Ampliar influência/i);

    await waitFor(() => expect(invoke).toHaveBeenCalled());
    const [fn, opts] = invoke.mock.calls[0] as [string, { body: Record<string, unknown> }];
    expect(fn).toBe("manage-subscription");
    expect(opts.body.action).toBe("change_plan");
    expect(invoke.mock.calls.some(([n]) => n === "create-checkout")).toBe(false);
  });

  it("pagante fazendo upgrade mantém o pró-rata", async () => {
    statusMock = PAGANTE;
    invoke.mockResolvedValue({
      data: { ok: true, mode: "asaas", proRata: { value: 123.45, days: 12 } },
      error: null,
    });

    render(<UpgradeModal open onOpenChange={() => {}} />);
    await clickPlano(/Ampliar influência/i);

    await waitFor(() => expect(toastMock).toHaveBeenCalled());
    const arg = toastMock.mock.calls[0][0] as { description: string };
    expect(arg.description).toContain("123,45");
    expect(arg.description).toContain("12 dia");
  });
});
