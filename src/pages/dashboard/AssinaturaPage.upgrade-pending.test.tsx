/**
 * P28 — estado cancelado da tela de assinatura: data de acesso uma vez só,
 * multa num único card "Antes de voltar" e cadeado dentro do "Reativar plano".
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
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
const BILLING: { invoices: never[]; next: unknown; overdue: null; isLoading: boolean; reload: () => Promise<void> } = { invoices: [], next: null, overdue: null, isLoading: false, reload: vi.fn(async () => {}) };
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


const ATIVO = {
  ...BASE, status: "ativo", effectiveStatus: "ativo", cicloContratado: "mensal", ciclosPagos: 2,
  planoPretendido: null as string | null,
  upgradePendente: {
    plano: "influencia", diferenca: 266.67, invoiceUrl: "https://asaas.test/i/dif" as string | null,
    em: "2026-11-14T00:24:00Z", // 13/11 em Brasília → vence 16/11
  } as null | { plano: string; diferenca: number; invoiceUrl: string | null; em: string },
};
const card = () => screen.queryByTestId("upgrade-pending-card");

describe("Card de upgrade em andamento", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-14T12:00:00Z"));
    STATUS = { ...ATIVO } as unknown as typeof BASE;
  });
  afterEach(() => vi.useRealTimers());

  it("(e,f) mostra valores, rodapé e abre a fatura com noopener", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<AssinaturaPage />);
    expect(card()).not.toBeNull();
    expect(text()).toContain("Upgrade para Influência em andamento");
    expect(text()).toContain("Falta pagar R$ 266,67");
    expect(screen.getByTestId("upgrade-chip-prazo").textContent).toBe("Até 16/11 (2 dias)");
    expect(text()).toContain("Pague a diferença e o Influência é liberado na hora.");
    expect(text()).toContain("Sem o pagamento até 16/11, o pedido expira e você continua no plano Presença.");
    expect(text()).toContain("Você digita o cartão de novo na página segura do pagamento.");
    expect(text()).not.toContain("começa sozinho");
    fireEvent.click(screen.getByRole("button", { name: "Pagar diferença" }));
    expect(open).toHaveBeenCalledWith("https://asaas.test/i/dif", "_blank", "noopener");
    open.mockRestore();
  });

  it("(e) linha extra só para reativação com plano maior, data em Brasília", () => {
    STATUS = { ...ATIVO, ciclosPagos: 0, planoPretendido: "influencia", dataVencimento: "2027-01-11T02:59:59.999Z" } as unknown as typeof BASE;
    render(<AssinaturaPage />);
    expect(text()).toContain("Se preferir esperar, ele começa sozinho em 10/01, na primeira cobrança.");
  });

  it("(e) sem pedido, sem link ou prazo vencido: nada", () => {
    STATUS = { ...ATIVO, upgradePendente: null } as unknown as typeof BASE;
    const r1 = render(<AssinaturaPage />); expect(card()).toBeNull(); r1.unmount();
    STATUS = { ...ATIVO, upgradePendente: { ...ATIVO.upgradePendente!, invoiceUrl: null } } as unknown as typeof BASE;
    const r2 = render(<AssinaturaPage />); expect(card()).toBeNull(); r2.unmount();
    STATUS = { ...ATIVO, upgradePendente: { ...ATIVO.upgradePendente!, em: "2026-11-10T15:00:00Z" } } as unknown as typeof BASE;
    render(<AssinaturaPage />); expect(card()).toBeNull();
  });

  for (const st of ["trial", "cancelado", "inadimplente"]) {
    it(`(e) ${st}: nada`, () => {
      STATUS = { ...ATIVO, status: st, effectiveStatus: st } as unknown as typeof BASE;
      render(<AssinaturaPage />);
      expect(card()).toBeNull();
    });
  }
});

describe("P37 card 'Você escolheu o plano'", () => {
  const chosen = () => screen.queryByTestId("chosen-plan-card");
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-14T12:00:00Z"));
    STATUS = { ...ATIVO, upgradePendente: null, planoPretendido: "influencia" } as unknown as typeof BASE;
    BILLING.next = null;
  });
  afterEach(() => { vi.useRealTimers(); BILLING.next = null; });

  it("ativo + pretendido maior + sem pendência → mostra, com a data agendada", () => {
    (BILLING as { next: unknown }).next = { status: "PENDING", dueDate: "2026-12-03", value: 717, billingType: "CREDIT_CARD" };
    render(<AssinaturaPage />);
    expect(chosen()).not.toBeNull();
    expect(text()).toContain("Você escolheu o plano Influência");
    expect(text()).toContain("Ele começa em 03/12, na primeira cobrança.");
    expect(screen.getByRole("button", { name: "Liberar o Influência agora" })).toBeTruthy();
    expect(card()).toBeNull();
  });
  it("sem data agendada → texto genérico", () => {
    render(<AssinaturaPage />);
    expect(text()).toContain("Ele começa na sua próxima cobrança.");
  });
  it("ativo sem pretendido → esconde", () => {
    STATUS = { ...ATIVO, upgradePendente: null, planoPretendido: null } as unknown as typeof BASE;
    render(<AssinaturaPage />); expect(chosen()).toBeNull();
  });
  it("com upgrade pendente → só o card âmbar", () => {
    STATUS = { ...ATIVO, planoPretendido: "influencia" } as unknown as typeof BASE;
    render(<AssinaturaPage />); expect(chosen()).toBeNull(); expect(card()).not.toBeNull();
  });
  for (const st of ["cancelado", "trial", "inadimplente"]) {
    it(`${st} → esconde`, () => {
      STATUS = { ...ATIVO, upgradePendente: null, planoPretendido: "influencia", status: st, effectiveStatus: st } as unknown as typeof BASE;
      render(<AssinaturaPage />); expect(chosen()).toBeNull();
    });
  }
});
