/**
 * P28 — estado cancelado da tela de assinatura: data de acesso uma vez só,
 * multa num único card "Antes de voltar" e cadeado dentro do "Reativar plano".
 */
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
  plano: "presenca", status: "cancelado", canceladoAcessoAte: "2026-12-02T00:00:00.000Z",
  dataVencimento: "2026-12-02T00:00:00.000Z", trialEndsAt: null,
  effectiveStatus: "cancelado", isLoading: false, refresh,
  cicloContratado: "anual", ciclosPagos: 1, compromissoMeses: 12,
  carenciaAte: null, isPaid: true, multaPendente: null as null | { valor: number; ciclos: number },
};
let STATUS: typeof BASE = { ...BASE };
vi.mock("@/hooks/useSubscriptionStatus", () => ({ useSubscriptionStatus: () => STATUS }));
const BILLING = { invoices: [], next: null, overdue: null, isLoading: false, reload: vi.fn(async () => {}) };
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

const text = () => (document.body.textContent ?? "").replace(/\u00a0/g, " ");
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;
const reativar = () => screen.getByRole("button", { name: /Reativar plano/ });

beforeEach(() => {
  STATUS = { ...BASE };
});

describe("Cancelada com multa pendente", () => {
  beforeEach(() => {
    STATUS = { ...BASE, multaPendente: { valor: 100, ciclos: 1 } };
  });

  it("mostra a multa uma vez só num card 'Antes de voltar', com 'Pagar agora'", () => {
    render(<AssinaturaPage />);
    expect(count(text(), "R$ 100,00")).toBe(1);
    expect(screen.getAllByText("Antes de voltar")).toHaveLength(1);
    const card = screen.getByTestId("penalty-card");
    expect(within(card).getByRole("button", { name: /Pagar agora/ })).toBeInTheDocument();
    expect(screen.getAllByTestId("penalty-card")).toHaveLength(1);
    // O card separado antigo ("Multa de cancelamento: R$ …") não existe mais.
    expect(text()).not.toContain("Multa de cancelamento: ");
    // Sem "Próxima cobrança" quando há multa.
    expect(screen.queryByText("Cobrança encerrada")).toBeNull();
  });

  it("não mostra preço por mês nem o texto de ciclos pagos, e a data aparece uma vez", () => {
    render(<AssinaturaPage />);
    expect(text()).not.toContain("/ mês");
    expect(text()).not.toContain("ciclos pagos, faltam");
    expect(count(text(), "02/12/2026")).toBe(1);
  });

  it("'Reativar plano' tem o cadeado, aponta para um texto existente e não há aviso ao lado", () => {
    render(<AssinaturaPage />);
    const btn = reativar();
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("title", "Pague a multa para reativar");
    expect(within(btn).getByTestId("reativar-lock")).toBeInTheDocument();
    const describedBy = btn.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const target = document.getElementById(describedBy!);
    expect(target).not.toBeNull();
    expect(screen.getByTestId("penalty-card").contains(target)).toBe(true);
    expect(text()).not.toContain("Para reativar, pague antes a multa");
    expect(document.getElementById("reativar-bloqueado")).toBeNull();
  });
});

describe("Cancelada sem multa", () => {
  it("mostra 'Cobrança encerrada' e 'Não haverá novas cobranças.' sem repetir a data", () => {
    render(<AssinaturaPage />);
    expect(screen.getByText("Cobrança encerrada")).toBeInTheDocument();
    expect(screen.getByText("Não haverá novas cobranças.")).toBeInTheDocument();
    expect(count(text(), "02/12/2026")).toBe(1);
    expect(screen.queryByTestId("penalty-card")).toBeNull();
    const btn = reativar();
    expect(btn).not.toBeDisabled();
    expect(btn).not.toHaveAttribute("aria-describedby");
    expect(within(btn).queryByTestId("reativar-lock")).toBeNull();
  });
});

describe("Barra do compromisso", () => {
  it("largura segue ciclosPagos / compromissoMeses", () => {
    STATUS = { ...BASE, ciclosPagos: 3, compromissoMeses: 12 };
    render(<AssinaturaPage />);
    expect(screen.getByText("3 de 12 meses")).toBeInTheDocument();
    expect(screen.getByTestId("commitment-progress-fill").style.width).toBe("25%");
  });

  it("nunca passa de 100% e nunca fica abaixo de 4%", () => {
    STATUS = { ...BASE, ciclosPagos: 15, compromissoMeses: 12 };
    const { unmount } = render(<AssinaturaPage />);
    expect(screen.getByTestId("commitment-progress-fill").style.width).toBe("100%");
    unmount();
    STATUS = { ...BASE, ciclosPagos: 0, compromissoMeses: 12 };
    render(<AssinaturaPage />);
    expect(screen.getByTestId("commitment-progress-fill").style.width).toBe("4%");
  });

  it("plano mensal sem compromisso não mostra a barra", () => {
    STATUS = { ...BASE, cicloContratado: "mensal" };
    render(<AssinaturaPage />);
    expect(screen.queryByTestId("commitment-progress-fill")).toBeNull();
    expect(screen.queryByText("Compromisso")).toBeNull();
  });
});

describe("Estados não cancelados continuam como antes", () => {
  it("ativo anual: preço por mês, texto de ciclos, 'Mudar plano' e 'Cancelar'", () => {
    STATUS = {
      ...BASE, status: "ativo", effectiveStatus: "ativo", canceladoAcessoAte: null,
      ciclosPagos: 2, compromissoMeses: 12,
    };
    render(<AssinaturaPage />);
    expect(text()).toContain("/ mês");
    expect(text()).toContain("2 de 12 ciclos pagos, faltam 10");
    expect(screen.getByRole("button", { name: /Mudar plano/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(screen.queryByTestId("cancelled-summary")).toBeNull();
    expect(screen.queryByTestId("penalty-card")).toBeNull();
    expect(screen.getByText("Sem cobrança agendada")).toBeInTheDocument();
  });

  it("teste grátis: preço por mês e primeira cobrança prevista", () => {
    STATUS = {
      ...BASE, status: "trial", effectiveStatus: "trial", canceladoAcessoAte: null,
      ciclosPagos: 0, trialEndsAt: "2026-11-09T00:00:00.000Z",
    };
    render(<AssinaturaPage />);
    expect(text()).toContain("/ mês");
    expect(text()).toContain("Primeira cobrança prevista para 09/11/2026");
    expect(screen.queryByTestId("cancelled-summary")).toBeNull();
  });
});
