import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: vi.fn() } },
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
vi.mock("@/hooks/useSubscriptionStatus", () => ({
  useSubscriptionStatus: () => ({
    plano: "influencia", status: "ativo", effectiveStatus: "ativo", isLoading: false,
    canceladoAcessoAte: null, dataVencimento: "2026-12-01T00:00:00.000Z",
    trialEndsAt: null, refresh: vi.fn(async () => {}), cicloContratado: "mensal",
    ciclosPagos: 2, compromissoMeses: 12, carenciaAte: null, isPaid: true, multaPendente: null,
  }),
}));
vi.mock("@/hooks/useBillingInvoices", () => ({
  useBillingInvoices: () => ({ invoices: [], next: null, overdue: null, isLoading: false, reload: vi.fn(async () => {}) }),
  INVOICE_STATUS_LABEL: {},
}));
vi.mock("@/hooks/useUpgradeEntry", () => ({ useUpgradeEntry: () => ({ openUpgrade: vi.fn() }) }));
vi.mock("@/components/dashboard/UpgradeModal", () => ({ UpgradeModal: () => null }));
vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
vi.mock("@/lib/reconcile-pending", () => ({ reconcilePendingPayment: async () => null }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

import AssinaturaPage from "./AssinaturaPage";

describe("P55 — FAQ de cobrança e troca", () => {
  it("explica teste encerrado e retomada com dias pagos", async () => {
    render(<AssinaturaPage />);
    fireEvent.click(screen.getByRole("button", { name: "Quando a primeira cobrança acontece?" }));
    const body = await screen.findByRole("region");
    expect(body.textContent).toContain("Se o teste já terminou, a cobrança é feita na hora");
    expect(body.textContent).toContain("Se você cancelou e ainda tem dias pagos, a cobrança só começa quando esses dias acabarem");
    expect(body.textContent).not.toMatch(/proporcional retroativa|nem multa|multa|bordo/i);
  });

  it("explica liberação após confirmação e redução nas próximas cobranças", async () => {
    render(<AssinaturaPage />);
    fireEvent.click(screen.getByRole("button", { name: "Como faço para mudar de plano?" }));
    const body = await screen.findByRole("region");
    expect(body.textContent).toContain("Assim que o pagamento é confirmado, o novo plano é liberado");
    expect(body.textContent).toContain("Até a confirmação, você continua normalmente no plano que tem hoje");
    expect(body.textContent).toContain("Se for um plano menor, o novo valor passa a valer nas próximas cobranças");
    expect(body.textContent).toContain("a redução a gente combina com você: é só chamar");
    expect(body.textContent).not.toMatch(/proporcional retroativa|nem multa|multa|bordo/i);
  });
});