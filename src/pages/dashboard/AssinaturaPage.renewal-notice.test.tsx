import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
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
const { toast } = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({ toast }));

import AssinaturaPage from "./AssinaturaPage";


const NEXT = {
  id: "subscription:sub_test", dueDate: "2099-12-10", value: 397, status: "PENDING",
  invoiceUrl: null, receiptUrl: null, billingType: "CREDIT_CARD", kind: "monthly", scheduled: true,
};
const TITLE_A = "Falta pouco para completar seus 12 meses";
const BODY_A = "Você já pagou 11 dos 12 meses do seu compromisso. Depois do 12º pagamento, seu plano continua no mesmo valor e, na cobrança do 13º mês, começa um novo compromisso de 12 meses. A gente avisa por aqui de novo quando chegar a hora.";
const TITLE_B = "Você completou seus 12 meses";
const BODY_B = "Na próxima cobrança, em 10/12/2099 (R$ 397), começa um novo compromisso de 12 meses, no mesmo valor. Se preferir não continuar, você pode cancelar até essa data sem nenhuma cobrança extra.";
const BODY_B_NO_NEXT = "Na próxima cobrança começa um novo compromisso de 12 meses, no mesmo valor. Se preferir não continuar, você pode cancelar antes dela sem nenhuma cobrança extra.";
const setStatus = (over: Partial<typeof BASE>) => {
  STATUS = { ...BASE, status: "ativo", effectiveStatus: "ativo", canceladoAcessoAte: null as unknown as string, ...over };
};

describe("P57 — aviso de renovação do compromisso anual", () => {
  beforeEach(() => {
    BILLING.next = NEXT;
    BILLING.invoices = [];
    vi.clearAllMocks();
  });
  it("estado A (11 pagos): título e texto A, sem botão de cancelar", () => {
    setStatus({ ciclosPagos: 11 });
    render(<AssinaturaPage />);
    const notice = within(screen.getByTestId("renewal-notice"));
    expect(notice.getByText(TITLE_A)).toBeTruthy();
    expect(notice.getByText(BODY_A)).toBeTruthy();
    expect(screen.queryByTestId("renewal-cancel")).toBeNull();
    expect(notice.queryByRole("button", { name: "Cancelar plano" })).toBeNull();
  });
  for (const pagos of [12, 14]) {
    it(`estado B (${pagos} pagos): data e valor de next, botão abre o diálogo de cancelamento`, async () => {
      setStatus({ ciclosPagos: pagos });
      render(<AssinaturaPage />);
      const notice = within(screen.getByTestId("renewal-notice"));
      expect(notice.getByText(TITLE_B)).toBeTruthy();
      expect(notice.getByText(BODY_B)).toBeTruthy();
      const btn = screen.getByTestId("renewal-cancel");
      expect(btn.textContent).toBe("Cancelar plano");
      fireEvent.click(btn);
      expect(await screen.findByRole("dialog", { name: "Cancelar assinatura?" })).toBeTruthy();
    });
  }
  it("estado B sem next usa o texto alternativo", () => {
    BILLING.next = null;
    setStatus({ ciclosPagos: 12 });
    render(<AssinaturaPage />);
    expect(within(screen.getByTestId("renewal-notice")).getByText(BODY_B_NO_NEXT)).toBeTruthy();
  });
  for (const pagos of [10, 1, 0]) {
    it(`sem aviso com ${pagos} ciclos pagos`, () => {
      setStatus({ ciclosPagos: pagos });
      render(<AssinaturaPage />);
      expect(screen.queryByTestId("renewal-notice")).toBeNull();
    });
  }
  it("sem aviso no mensal com 12 ciclos", () => {
    setStatus({ ciclosPagos: 12, cicloContratado: "mensal" });
    render(<AssinaturaPage />);
    expect(screen.queryByTestId("renewal-notice")).toBeNull();
  });
  it("sem aviso quando cancelado, nem com o cartão de cobrança pendente", () => {
    STATUS = { ...BASE, ciclosPagos: 12, multaPendente: { valor: 300, ciclos: 3 } };
    render(<AssinaturaPage />);
    expect(screen.queryByTestId("renewal-notice")).toBeNull();
  });
  it("sem aviso para cancelado sem cobrança pendente", () => {
    STATUS = { ...BASE, ciclosPagos: 12 };
    render(<AssinaturaPage />);
    expect(screen.queryByTestId("renewal-notice")).toBeNull();
  });
  it("exibe 12 de 12 e nunca 14 de 12", () => {
    setStatus({ ciclosPagos: 14 });
    const { container } = render(<AssinaturaPage />);
    expect(container.textContent).toContain("12 de 12 ciclos pagos");
    expect(container.textContent).not.toContain("14 de 12");
  });
  it("cancelado com 14 ciclos mostra 12 de 12 meses", () => {
    STATUS = { ...BASE, ciclosPagos: 14 };
    const { container } = render(<AssinaturaPage />);
    expect(container.textContent).toContain("12 de 12 meses");
    expect(container.textContent).not.toContain("14 de 12");
  });
  it("FAQ de renovação existe com o texto aprovado", () => {
    setStatus({ ciclosPagos: 3 });
    render(<AssinaturaPage />);
    const trigger = screen.getByText("O que acontece quando completo os 12 meses do plano anual?");
    fireEvent.click(trigger);
    expect(screen.getByText(/Até o dia dessa cobrança você pode cancelar sem nenhuma cobrança extra/)).toBeTruthy();
  });
  it("textos novos sem palavras proibidas", () => {
    const all = [TITLE_A, BODY_A, TITLE_B, BODY_B, BODY_B_NO_NEXT, "Cancelar plano",
      "O que acontece quando completo os 12 meses do plano anual?",
      "Seu compromisso é cumprido e, na cobrança seguinte, começa um novo compromisso de 12 meses, no mesmo valor. Até o dia dessa cobrança você pode cancelar sem nenhuma cobrança extra. A partir do 11º pagamento mostramos um aviso aqui na tela."].join(" ");
    expect(all).not.toMatch(/multa|bordo|voo/i);
  });
});
