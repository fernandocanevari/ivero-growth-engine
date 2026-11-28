/**
 * P58 — card "Plano atual": trial com cartão no Anual mostra o preço anual e o
 * início do compromisso; convite + botão grande para "Mudar plano".
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: vi.fn(async () => ({ data: null, error: null })) } },
}));
vi.mock("react-router-dom", () => ({
  Navigate: () => null,
  useSearchParams: () => [new URLSearchParams("")],
}));
vi.mock("framer-motion", () => ({
  motion: { div: ({ initial: _i, animate: _a, transition: _t, ...p }: Record<string, unknown>) => <div {...(p as React.ComponentProps<"div">)} /> },
}));
vi.mock("@/hooks/useAccountType", () => ({
  useAccountType: () => ({ isAgency: false, isLoading: false }),
}));
const refresh = vi.fn(async () => {});
const TRIAL = {
  plano: "presenca", status: "trial", canceladoAcessoAte: null as string | null,
  dataVencimento: null, trialEndsAt: "2026-12-03T02:59:59.999Z",
  effectiveStatus: "trial", isLoading: false, refresh,
  cicloContratado: "mensal", ciclosPagos: 0, compromissoMeses: 12,
  carenciaAte: null, isPaid: false, multaPendente: null,
  upgradePendente: null, planoPretendido: null as string | null,
  hasAsaasSubscription: true, cicloPretendido: "anual" as string | null,
};
let STATUS: Record<string, unknown> = { ...TRIAL };
vi.mock("@/hooks/useSubscriptionStatus", () => ({ useSubscriptionStatus: () => STATUS }));
const BILLING: { invoices: never[]; next: unknown; overdue: null; isLoading: boolean; reload: () => Promise<void> } = { invoices: [], next: null, overdue: null, isLoading: false, reload: vi.fn(async () => {}) };
vi.mock("@/hooks/useBillingInvoices", () => ({
  useBillingInvoices: () => BILLING,
  INVOICE_STATUS_LABEL: {},
}));
const openUpgrade = vi.fn();
vi.mock("@/hooks/useUpgradeEntry", () => ({ useUpgradeEntry: () => ({ openUpgrade }) }));
vi.mock("@/components/dashboard/UpgradeModal", () => ({ UpgradeModal: () => null }));
vi.mock("@/lib/analytics", () => ({ track: () => {} }));
vi.mock("@/lib/reconcile-pending", () => ({ reconcilePendingPayment: async () => null }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

import AssinaturaPage from "./AssinaturaPage";

const text = () => (document.body.textContent ?? "").replace(/\u00a0/g, " ");
const SCHEDULED = { status: "PENDING", dueDate: "2026-12-03", value: 397, billingType: "CREDIT_CARD" };
const OLD_MONTHLY = "Cobrança mensal sem compromisso — cancele quando quiser.";
const invite = () => screen.queryByTestId("change-plan-invite");
const mudar = () => screen.getByRole("button", { name: /Mudar plano/ });
const cancelar = () => screen.getByRole("button", { name: "Cancelar" });

describe("P58 card Plano atual", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-28T12:00:00Z"));
    STATUS = { ...TRIAL };
    BILLING.next = null;
    openUpgrade.mockClear();
  });
  afterEach(() => { vi.useRealTimers(); BILLING.next = null; });

  it("trial + cartão + anual + data agendada: preço anual e texto com a data", () => {
    BILLING.next = SCHEDULED;
    render(<AssinaturaPage />);
    expect(text()).toContain("R$ 397");
    expect(screen.getByTestId("trial-annual-note").textContent).toBe(
      "Seu compromisso de 12 meses começa na primeira cobrança, em 03/12/2026. Até lá, se mudar de ideia, é só cancelar, sem custo.",
    );
    expect(text()).not.toContain("sem compromisso");
  });

  it("trial + cartão + anual sem data agendada: variante sem data", () => {
    render(<AssinaturaPage />);
    expect(screen.getByTestId("trial-annual-note").textContent).toBe(
      "Seu compromisso de 12 meses começa na primeira cobrança. Até lá, se mudar de ideia, é só cancelar, sem custo.",
    );
  });

  it("checkout abandonado (sem assinatura Asaas): preço mensal e texto antigo", () => {
    STATUS = { ...TRIAL, hasAsaasSubscription: false };
    render(<AssinaturaPage />);
    expect(text()).toContain("R$ 497");
    expect(text()).toContain(OLD_MONTHLY);
    expect(screen.queryByTestId("trial-annual-note")).toBeNull();
  });

  for (const c of ["mensal", null]) {
    it(`trial com cicloPretendido ${c}: texto antigo e preço mensal`, () => {
      STATUS = { ...TRIAL, cicloPretendido: c };
      render(<AssinaturaPage />);
      expect(text()).toContain("R$ 497");
      expect(text()).toContain(OLD_MONTHLY);
      expect(screen.queryByTestId("trial-annual-note")).toBeNull();
    });
  }

  it("ativo anual: frase de compromisso com ciclos pagos, sem mudança", () => {
    STATUS = { ...TRIAL, status: "ativo", effectiveStatus: "ativo", cicloContratado: "anual", ciclosPagos: 3, cicloPretendido: "anual", isPaid: true };
    render(<AssinaturaPage />);
    expect(text()).toContain("R$ 397");
    expect(text()).toContain("Cobrança mensal com compromisso de 12 meses — 3 de 12 ciclos pagos, faltam 9.");
    expect(screen.queryByTestId("trial-annual-note")).toBeNull();
  });

  const cases: [string, Record<string, unknown>][] = [
    ["trial presenca", {}],
    ["ativo influencia", { status: "ativo", effectiveStatus: "ativo", plano: "influencia", cicloContratado: "mensal", ciclosPagos: 2, isPaid: true }],
  ];
  for (const [name, patch] of cases) {
    it(`${name}: convite, botão grande e Cancelar como link`, () => {
      STATUS = { ...TRIAL, ...patch };
      render(<AssinaturaPage />);
      expect(invite()?.textContent).toBe("Quer ir mais longe? Veja o que cada plano libera para a sua marca.");
      expect(mudar().className).toContain("w-full");
      fireEvent.click(mudar());
      expect(openUpgrade).toHaveBeenCalledTimes(1);
      fireEvent.click(cancelar());
      expect(screen.getByRole("dialog")).toBeTruthy();
    });
  }

  for (const st of ["trial", "ativo"]) {
    it(`autoridade ${st}: sem convite, botões como hoje`, () => {
      STATUS = { ...TRIAL, plano: "autoridade", status: st, effectiveStatus: st };
      render(<AssinaturaPage />);
      expect(invite()).toBeNull();
      expect(mudar().className).not.toContain("w-full");
      expect(cancelar()).toBeTruthy();
    });
  }

  it("cancelado: Reativar plano e sem convite", () => {
    STATUS = { ...TRIAL, status: "cancelado", effectiveStatus: "cancelado", canceladoAcessoAte: "2026-12-03T02:59:59.999Z" };
    render(<AssinaturaPage />);
    expect(screen.getByRole("button", { name: /Reativar plano/ })).toBeTruthy();
    expect(invite()).toBeNull();
  });
});
