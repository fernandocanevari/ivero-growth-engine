// P64 — tela cancelada com diferença pendente e histórico sem "multa".
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
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
const BASE = {
  plano: "presenca", status: "cancelado", canceladoAcessoAte: "2026-12-03T02:59:59.999Z",
  dataVencimento: "2026-12-03T02:59:59.999Z", trialEndsAt: null,
  effectiveStatus: "cancelado", isLoading: false, refresh,
  cicloContratado: "anual", ciclosPagos: 1, compromissoMeses: 12,
  carenciaAte: null, isPaid: true, multaPendente: null as null | { valor: number; ciclos: number },
};
let STATUS: typeof BASE = { ...BASE };
vi.mock("@/hooks/useSubscriptionStatus", () => ({ useSubscriptionStatus: () => STATUS }));
const BILLING: { invoices: Record<string, unknown>[]; [k: string]: unknown } = { invoices: [], next: null, overdue: null, isLoading: false, reload: vi.fn(async () => {}) };
vi.mock("@/hooks/useBillingInvoices", () => ({
  useBillingInvoices: () => BILLING,
  INVOICE_STATUS_LABEL: {},
}));
vi.mock("@/hooks/useUpgradeEntry", () => ({ useUpgradeEntry: () => ({ openUpgrade: vi.fn() }) }));
vi.mock("@/components/dashboard/UpgradeModal", () => ({ UpgradeModal: () => null }));
vi.mock("@/lib/analytics", () => ({ track: () => {} }));
vi.mock("@/lib/reconcile-pending", () => ({ reconcilePendingPayment: async () => null }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

import AssinaturaPage from "./AssinaturaPage";

const inv = (id: string, status: string, kind?: string) => ({
  id, status, kind, value: 100, dueDate: "2026-11-10", invoiceUrl: null, receiptUrl: null, billingType: "CREDIT_CARD",
});

describe("P64 — diferença do desconto anual", () => {
  beforeEach(() => { BILLING.invoices = []; });

  it("card cancelado com diferença pendente", () => {
    STATUS = { ...BASE, multaPendente: { valor: 100, ciclos: 1 } };
    render(<AssinaturaPage />);
    const card = screen.getByTestId("penalty-card");
    expect(within(card).getByText("Diferença do desconto anual")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reativar plano/ })).toHaveAttribute("title", "Pague a diferença para reativar");
    expect(card.textContent ?? "").not.toMatch(/multa/i);
  });

  it("histórico: cobrança penalty", () => {
    STATUS = { ...BASE };
    BILLING.invoices = [inv("pay_p", "PENDING", "penalty")];
    render(<AssinaturaPage />);
    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("Diferença do desconto anual")).toBeTruthy();
  });
});
