/** P47 (finding 70): linha de compromisso ao escolher Anual numa assinatura mensal já paga. */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

const invoke = vi.fn();
const toastMock = vi.fn();
let statusMock: Record<string, unknown>;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: "u1", email: "c@x.com", user_metadata: {} } } }) },
    functions: { invoke: (...a: unknown[]) => invoke(...a) },
  },
}));
vi.mock("@/hooks/useSubscriptionStatus", () => ({ useSubscriptionStatus: () => statusMock }));
vi.mock("@/hooks/use-toast", () => ({ toast: (...a: unknown[]) => toastMock(...a) }));
vi.mock("@/lib/analytics", () => ({ track: () => {} }));
vi.mock("@/hooks/useAccountType", () => ({
  useAccountType: () => ({ accountType: "individual", agencyName: null, isLoading: false, isAgency: false }),
}));

import { UpgradeModal } from "./UpgradeModal";

const LINE = "No Presença economiza R$ 1.200 por ano";
const SUCCESS = "Pronto, você agora está no plano anual! Seus 12 meses começaram hoje.";
const base = { plano: "presenca", isLoading: false, isAdmin: false, countedPaymentIds: [], multaPendente: null, dataVencimento: "2026-12-15T02:59:59.999Z" };
const paidMonthly = { ...base, effectiveStatus: "ativo", cicloContratado: "mensal", hasAsaasSubscription: true, ciclosPagos: 3, countedPaymentIds: ["p1", "p2", "p3"] };
const has = () => (document.body.textContent ?? "").includes(LINE);
// Só alterna o seletor Mensal/Anual (nenhuma compra, nenhuma chamada de rede).
const pickAnual = () => fireEvent.click(screen.getByRole("button", { name: /Anual/ }));

beforeEach(() => { invoke.mockReset(); toastMock.mockReset(); });

describe("P47 linha de compromisso no Anual", () => {
  it("mensal pago + Anual selecionado mostra a linha; Mensal não", () => {
    statusMock = paidMonthly;
    render(<UpgradeModal open onOpenChange={() => {}} />);
    expect(has()).toBe(false);
    pickAnual();
    expect(has()).toBe(true);
    expect(invoke).not.toHaveBeenCalled();
  });

  const negatives: Array<[string, Record<string, unknown>]> = [
    ["trial", { ...base, effectiveStatus: "trial", cicloContratado: "mensal", hasAsaasSubscription: true, ciclosPagos: 0 }],
    ["ativo com 0 ciclos", { ...paidMonthly, ciclosPagos: 0, countedPaymentIds: [] }],
    ["ativo anual", { ...paidMonthly, cicloContratado: "anual" }],
    ["cancelado mensal", { ...paidMonthly, effectiveStatus: "cancelado", hasAsaasSubscription: false }],
    ["cancelado anual", { ...paidMonthly, effectiveStatus: "cancelado", cicloContratado: "anual", hasAsaasSubscription: false }],
  ];
  for (const [label, s] of negatives) {
    it(`${label}: sem a linha`, () => {
      statusMock = s;
      render(<UpgradeModal open onOpenChange={() => {}} />);
      if (screen.queryByRole("button", { name: /Anual/ })) pickAnual();
      expect(has()).toBe(false);
    });
  }

  it("sucesso da troca imediata com compromisso iniciado usa o texto novo; outros casos mantêm o atual", async () => {
    // Card do plano atual não é botão numa conta ativa: troca para plano menor + Anual.
    statusMock = { ...paidMonthly, plano: "influencia" };
    invoke.mockResolvedValueOnce({ data: { ok: true, success: true, mode: "asaas", plano: "presenca", ciclo: "anual", compromissoIniciado: true, proRata: null }, error: null });
    render(<UpgradeModal open onOpenChange={() => {}} />);
    pickAnual();
    const btns = screen.getAllByRole("button").filter((b) => !b.hasAttribute("disabled") && !/^(Mensal|Anual)/.test(b.textContent ?? ""));
    const btn = btns[0];
    expect(btn).toBeTruthy();
    fireEvent.click(btn!);
    await waitFor(() => expect(toastMock).toHaveBeenCalled());
    expect(invoke.mock.calls[0][1].body).toEqual({ action: "change_plan", plano: "presenca", ciclo: "anual" });
    expect(toastMock.mock.calls[0][0].description).toBe(SUCCESS);
  });
});
