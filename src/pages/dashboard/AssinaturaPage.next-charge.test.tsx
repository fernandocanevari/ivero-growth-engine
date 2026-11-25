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

import { supabase } from "@/integrations/supabase/client";
import { nextChargeStatusLabel } from "@/lib/billing-display";
import type { BillingInvoice } from "@/hooks/useBillingInvoices";

const scheduled: BillingInvoice = {
  id: "subscription:sub_test", dueDate: "2099-12-10", value: 497, status: "PENDING",
  invoiceUrl: null, receiptUrl: null, billingType: "CREDIT_CARD", kind: "monthly", scheduled: true,
};
const paid: BillingInvoice = { ...scheduled, id: "pay_paid", dueDate: "2026-11-10", status: "CONFIRMED", scheduled: undefined };
const card = (name: string) => {
  const heading = name === "Próxima cobrança"
    ? screen.getByText("Próxima Cobrança", { exact: true })
    : screen.getByRole("heading", { name });
  const container = heading.closest(".p-6");
  if (!container) throw new Error(`Missing card ${name}`);
  return within(container as HTMLElement);
};

describe("NEXT-CHARGE scheduled next", () => {
  beforeEach(() => {
    STATUS = { ...BASE, status: "ativo", effectiveStatus: "ativo", cicloContratado: "mensal", canceladoAcessoAte: null as unknown as string };
    BILLING.next = scheduled;
    BILLING.invoices = [paid as unknown as Record<string, unknown>];
    vi.clearAllMocks();
  });
  it("h) displays scheduled amount, due date, status and active credit card", () => {
    render(<AssinaturaPage />);
    const next = card("Próxima cobrança");
    expect(next.getByText("R$ 497,00")).toBeTruthy();
    expect(next.getByText("Vencimento em 10/12/2099")).toBeTruthy();
    expect(next.getByText("Agendada para 10/12")).toBeTruthy();
    expect(next.getByText("Cartão de crédito")).toBeTruthy();
    expect(card("Forma de pagamento").getByText("Cartão de crédito ativo")).toBeTruthy();
    expect(card("Forma de pagamento").getByText("Cobrança recorrente do plano Presença.")).toBeTruthy();
  });
  it("h) unchanged display helper labels future PENDING as scheduled, not today", () => {
    const now = new Date("2026-11-25T23:33:00Z");
    expect(nextChargeStatusLabel(scheduled, "Aguardando pagamento", now)).toBe("Agendada para 10/12");
    expect(nextChargeStatusLabel({ ...scheduled, dueDate: "2026-11-25" }, "Aguardando pagamento", now)).toBe("Aguardando pagamento");
  });
  it("i) synthetic next adds no history row or payment/receipt link", () => {
    render(<AssinaturaPage />);
    expect(card("Histórico de faturas").getAllByRole("row")).toHaveLength(2);
    expect(card("Histórico de faturas").queryByText("10/12/2099")).toBeNull();
    expect(card("Próxima cobrança").queryAllByRole("link")).toHaveLength(0);
    expect(card("Histórico de faturas").queryAllByRole("link")).toHaveLength(0);
  });
  for (const status of ["ativo", "inadimplente"]) {
    it(`j) ${status} without next explains invoice generation`, () => {
      STATUS = { ...STATUS, status, effectiveStatus: status };
      BILLING.next = null;
      render(<AssinaturaPage />);
      expect(card("Próxima cobrança").getByText("Sem cobrança agendada")).toBeTruthy();
      expect(card("Próxima cobrança").getByText("Assim que a próxima fatura for gerada, ela aparece aqui.")).toBeTruthy();
      expect(card("Próxima cobrança").queryByText("Escolha um plano para ativar a cobrança recorrente.")).toBeNull();
    });
  }
  for (const [status, heading, body] of [
    ["cancelado", "Cobrança encerrada", "Não haverá novas cobranças."],
    ["trial_expirado", "Teste encerrado", "Contrate um plano para ativar a cobrança recorrente e recuperar o acesso."],
    ["pendente", "Pagamento pendente", "Estamos aguardando a confirmação do seu pagamento. Assim que ele for confirmado, a cobrança recorrente aparece aqui."],
  ]) {
    it(`k) ${status} retains its existing empty-state text`, () => {
      STATUS = { ...BASE, status, effectiveStatus: status };
      BILLING.next = null;
      render(<AssinaturaPage />);
      expect(card("Próxima cobrança").getByText(heading)).toBeTruthy();
      expect(card("Próxima cobrança").getByText(body)).toBeTruthy();
      expect(card("Próxima cobrança").queryByText("Assim que a próxima fatura for gerada, ela aparece aqui.")).toBeNull();
    });
  }
  it("card update still invokes its independent action and shows its existing no-invoice message", async () => {
    const message = "Não há cobrança pendente para atualizar o cartão agora. A troca ficará disponível na próxima cobrança.";
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({ data: { ok: false, reason: "sem_cobranca_pendente", message }, error: null } as never);
    render(<AssinaturaPage />);
    fireEvent.click(screen.getByRole("button", { name: "Atualizar cartão" }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Forma de pagamento", description: message })));
    expect(supabase.functions.invoke).toHaveBeenCalledExactlyOnceWith("manage-subscription", { body: { action: "update_card" } });
  });
});
