/** P48 (finding 74): mesmo plano, mensal -> anual, pelo card do plano atual. */
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

const BTN = "Passar para o anual";
const LABEL = "Seu plano atual";
const SUCCESS = "Pronto, você agora está no plano anual! Seus 12 meses começaram hoje.";
const base = { plano: "presenca", isLoading: false, isAdmin: false, countedPaymentIds: [], multaPendente: null, dataVencimento: "2026-12-15T02:59:59.999Z" };
const paidMonthly = { ...base, effectiveStatus: "ativo", cicloContratado: "mensal", hasAsaasSubscription: true, ciclosPagos: 3, countedPaymentIds: ["p1", "p2", "p3"] };
// Só alterna o seletor Mensal/Anual (nenhuma compra, nenhuma chamada de rede).
const pickAnual = () => fireEvent.click(screen.getByRole("button", { name: /Anual/ }));

beforeEach(() => { invoke.mockReset(); toastMock.mockReset(); });

describe("P48 mesmo plano mensal -> anual", () => {
  it("(a) ativo mensal 3 ciclos + Anual: card do Presença mostra o botão, não o rótulo; demais cards seguem com botões", () => {
    statusMock = paidMonthly;
    render(<UpgradeModal open onOpenChange={() => {}} />);
    pickAnual();
    expect(screen.getByRole("button", { name: BTN })).toBeTruthy();
    expect(screen.queryByTestId("current-plan-label")).toBeNull();
    expect(screen.queryByText(LABEL)).toBeNull();
    // Badge "SEU PLANO" continua.
    expect(screen.getByTestId("current-plan-badge")).toBeTruthy();
    // Os outros dois cards mantêm seus botões de CTA.
    expect(screen.getByRole("button", { name: /Influência/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Autoridade/i })).toBeTruthy();
    expect(invoke).not.toHaveBeenCalled();
  });

  it("(b) mesma linha com Mensal selecionado: rótulo 'Seu plano atual', sem o botão", () => {
    statusMock = paidMonthly;
    render(<UpgradeModal open onOpenChange={() => {}} />);
    expect(screen.getByTestId("current-plan-label")).toBeTruthy();
    expect(screen.queryByRole("button", { name: BTN })).toBeNull();
  });

  it("(c) ativo anual: sem seletor, rótulo 'Seu plano atual', sem o botão", () => {
    statusMock = { ...paidMonthly, cicloContratado: "anual" };
    render(<UpgradeModal open onOpenChange={() => {}} />);
    expect(screen.queryByRole("button", { name: /Anual/ })).toBeNull();
    expect(screen.getByTestId("current-plan-label")).toBeTruthy();
    expect(screen.queryByRole("button", { name: BTN })).toBeNull();
  });

  const negatives: Array<[string, Record<string, unknown>]> = [
    ["trial", { ...base, effectiveStatus: "trial", cicloContratado: "mensal", hasAsaasSubscription: true, ciclosPagos: 0 }],
    ["trial vencido", { ...base, effectiveStatus: "trial_vencido", cicloContratado: "mensal", hasAsaasSubscription: false, ciclosPagos: 0 }],
    ["cancelado", { ...paidMonthly, effectiveStatus: "cancelado", hasAsaasSubscription: false }],
  ];
  for (const [label, s] of negatives) {
    it(`(d) ${label}: sem o botão em lugar nenhum`, () => {
      statusMock = s;
      render(<UpgradeModal open onOpenChange={() => {}} />);
      if (screen.queryByRole("button", { name: /Anual/ })) pickAnual();
      expect(screen.queryByRole("button", { name: BTN })).toBeNull();
    });
  }

  it("(e) ativo mensal com 0 ciclos + Anual: o botão aparece (a linha P47 não, pois ciclos_pagos é 0)", () => {
    statusMock = { ...paidMonthly, ciclosPagos: 0, countedPaymentIds: [] };
    render(<UpgradeModal open onOpenChange={() => {}} />);
    pickAnual();
    expect(screen.getByRole("button", { name: BTN })).toBeTruthy();
    expect(screen.queryByTestId("current-plan-label")).toBeNull();
    expect(document.body.textContent ?? "").not.toContain("fica 12 meses com a gente");
  });

  it("(f) clique chama change_plan com o mesmo plano e ciclo anual uma única vez; duplo clique não duplica; toast de sucesso", async () => {
    statusMock = paidMonthly;
    let resolveInvoke: (v: unknown) => void = () => {};
    invoke.mockImplementationOnce(() => new Promise((res) => { resolveInvoke = res; }));
    render(<UpgradeModal open onOpenChange={() => {}} />);
    pickAnual();
    const btn = screen.getByRole("button", { name: BTN });
    fireEvent.click(btn);
    fireEvent.click(btn); // duplo clique: guarda de pendingPlan
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke.mock.calls[0][0]).toBe("manage-subscription");
    expect(invoke.mock.calls[0][1].body).toEqual({ action: "change_plan", plano: "presenca", ciclo: "anual" });
    // Enquanto processa: spinner "Processando..." e botão desabilitado.
    await waitFor(() => expect(screen.getByText("Processando...")).toBeTruthy());
    resolveInvoke({ data: { ok: true, success: true, mode: "asaas", plano: "presenca", ciclo: "anual", compromissoIniciado: true, proRata: null }, error: null });
    await waitFor(() => expect(toastMock).toHaveBeenCalled());
    expect(toastMock.mock.calls[0][0].title).toBe("Plano alterado para Presença");
    expect(toastMock.mock.calls[0][0].description).toBe(SUCCESS);
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});
