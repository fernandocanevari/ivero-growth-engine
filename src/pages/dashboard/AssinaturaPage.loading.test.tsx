/** P66 — sem flash do estado "trial" no primeiro carregamento da Assinatura. */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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
vi.mock("@/hooks/useAccountType", () => ({ useAccountType: () => ({ isAgency: false, isLoading: false }) }));
const refresh = vi.fn(async () => {});
const BASE = {
  canceladoAcessoAte: null, dataVencimento: null, trialEndsAt: null, refresh,
  cicloContratado: "mensal", ciclosPagos: 0, compromissoMeses: 12, carenciaAte: null,
  multaPendente: null, upgradePendente: null, planoPretendido: null,
  hasAsaasSubscription: false, cicloPretendido: null,
};
const LOADING = { ...BASE, plano: null, status: "trial", effectiveStatus: "trial", isPaid: false, isLoading: true };
const ATIVO = { ...BASE, plano: "influencia", status: "ativo", effectiveStatus: "ativo", isPaid: true, isLoading: false, ciclosPagos: 1 };
const TRIAL = { ...BASE, plano: "presenca", status: "trial", effectiveStatus: "trial", isPaid: false, isLoading: false, trialEndsAt: "2026-12-03T02:59:59.999Z" };
let STATUS: Record<string, unknown> = LOADING;
vi.mock("@/hooks/useSubscriptionStatus", () => ({ useSubscriptionStatus: () => STATUS }));
const BILLING = { invoices: [] as never[], next: null, overdue: null, isLoading: false, reload: vi.fn(async () => {}) };
vi.mock("@/hooks/useBillingInvoices", () => ({ useBillingInvoices: () => BILLING, INVOICE_STATUS_LABEL: {} }));
vi.mock("@/hooks/useUpgradeEntry", () => ({ useUpgradeEntry: () => ({ openUpgrade: vi.fn() }) }));
vi.mock("@/components/dashboard/UpgradeModal", () => ({ UpgradeModal: () => null }));
vi.mock("@/lib/analytics", () => ({ track: () => {} }));
vi.mock("@/lib/reconcile-pending", () => ({ reconcilePendingPayment: async () => null }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

import AssinaturaPage from "./AssinaturaPage";

const text = () => (document.body.textContent ?? "").replace(/\u00a0/g, " ");

describe("P66 Assinatura loading", () => {
  beforeEach(() => { BILLING.isLoading = false; });

  it("primeiro carregamento: só cabeçalho + esqueleto, nada do estado trial", () => {
    STATUS = LOADING;
    BILLING.isLoading = true;
    render(<AssinaturaPage />);
    expect(screen.getByTestId("assinatura-status-loading")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Assinatura & Pagamento" })).toBeInTheDocument();
    for (const s of ["Teste grátis", "Plano —", "Mudar plano", "Cancelar", "Nenhum cartão cadastrado ainda"]) {
      expect(text()).not.toContain(s);
    }
  });

  it("status carregado, faturas carregando: esqueleto no cartão", () => {
    STATUS = ATIVO;
    BILLING.isLoading = true;
    render(<AssinaturaPage />);
    expect(screen.getByTestId("payment-method-loading")).toBeInTheDocument();
    expect(text()).not.toContain("Nenhum cartão cadastrado ainda");
    expect(text()).toContain("Plano Influência");
  });

  it("tudo carregado sem faturas: estado vazio continua", () => {
    STATUS = ATIVO;
    render(<AssinaturaPage />);
    expect(text()).toContain("Nenhum cartão cadastrado ainda.");
    expect(screen.queryByTestId("payment-method-loading")).toBeNull();
  });

  it("trial real carregado: mostra 'Teste grátis'", () => {
    STATUS = TRIAL;
    render(<AssinaturaPage />);
    expect(text()).toContain("Teste grátis");
    expect(screen.queryByTestId("assinatura-status-loading")).toBeNull();
  });
});
