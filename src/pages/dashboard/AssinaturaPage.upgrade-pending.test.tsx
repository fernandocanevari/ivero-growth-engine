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
const MODAL: { props: Record<string, unknown> | null } = { props: null };
vi.mock("@/components/dashboard/UpgradeModal", () => ({ UpgradeModal: (p: Record<string, unknown>) => { MODAL.props = p; return null; } }));
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
    expect(screen.getByTestId("upgrade-block-valor").textContent).toBe("Falta pagarR$ 266,67");
    expect(screen.getByTestId("upgrade-block-prazo").textContent).toBe("Prazoaté 16/11 · 2 dias");
    expect(screen.queryByTestId("upgrade-block-comeca")).toBeNull();
    expect(text()).toContain("Pagando agora, o Influência vale na hora. Passou o prazo, o pedido expira e você segue no Presença. O cartão é digitado de novo na página segura do pagamento.");
    expect(text()).not.toContain("Pague a diferença e o");
    expect(text()).not.toContain("Se preferir esperar");
    fireEvent.click(screen.getByRole("button", { name: "Pagar diferença" }));
    expect(open).toHaveBeenCalledWith("https://asaas.test/i/dif", "_blank", "noopener");
    open.mockRestore();
  });

  it("(e) linha extra só para reativação com plano maior, data em Brasília", () => {
    STATUS = { ...ATIVO, ciclosPagos: 0, planoPretendido: "influencia", dataVencimento: "2027-01-11T02:59:59.999Z" } as unknown as typeof BASE;
    render(<AssinaturaPage />);
    expect(screen.getByTestId("upgrade-block-comeca").textContent).toBe("Se não pagar, começa em10/01");
  });

  const prazoAt = (now: string) => {
    vi.setSystemTime(new Date(now));
    render(<AssinaturaPage />);
    return screen.getByTestId("upgrade-block-prazo").textContent;
  };
  it("prazo 3 dias", () => {
    STATUS = { ...ATIVO, upgradePendente: { ...ATIVO.upgradePendente!, em: "2026-11-14T15:00:00Z" } } as unknown as typeof BASE;
    expect(prazoAt("2026-11-14T15:00:00Z")).toBe("Prazoaté 17/11 · 3 dias");
  });
  it("prazo 1 dia", () => expect(prazoAt("2026-11-15T12:00:00Z")).toBe("Prazoaté 16/11 · 1 dia"));
  it("prazo hoje", () => expect(prazoAt("2026-11-16T12:00:00Z")).toBe("Prazohoje, 16/11"));

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
    const blk = (id: string) => screen.getByTestId(`chosen-block-${id}`).textContent;
    expect(blk("atual")).toBe("Seu plano hojePresença");
    expect(blk("escolhido")).toBe("Plano escolhidoInfluência");
    expect(blk("comeca")).toBe("Começa em03/12");
    expect(text()).toContain("Quer usar agora? Pague só a diferença dos dias que faltam. O cartão é digitado de novo na página segura do pagamento.");
    expect(screen.queryByTestId("chosen-plan-pill")).toBeNull();
    expect(text()).not.toContain("na primeira cobrança");
    expect(text()).not.toContain("Até a confirmação");
    expect(text()).not.toContain("Ele começa");
    const cta = screen.getByRole("button", { name: "Já quero usar o plano Influência" });
    expect(cta.querySelector(".lucide-arrow-right")).toBeTruthy();
    expect(cta.querySelector(".lucide-sparkles")).toBeNull();
    expect(card()).toBeNull();
  });
  it("sem data agendada → terceiro bloco 'na próxima cobrança'", () => {
    render(<AssinaturaPage />);
    expect(screen.getByTestId("chosen-block-comeca").textContent).toBe("Começa emna próxima cobrança");
  });
  it("botão: spinner e travado até o pedido terminar; dois cliques = um pedido", async () => {
    render(<AssinaturaPage />);
    const btn = screen.getByRole("button", { name: "Já quero usar o plano Influência" });
    fireEvent.click(btn); fireEvent.click(btn);
    const busy = screen.getByRole("button", { name: /Gerando o pedido…/ });
    expect((busy as HTMLButtonElement).disabled).toBe(true);
    expect(busy.querySelector(".animate-spin")).toBeTruthy();
    expect(MODAL.props?.autoSelectPlan).toBe("influencia");
    expect(screen.queryByRole("button", { name: "Já quero usar o plano Influência" })).toBeNull();
    const { act } = await import("@testing-library/react");
    act(() => { (MODAL.props?.onAutoSelectSettled as () => void)(); });
    expect((screen.getByRole("button", { name: "Já quero usar o plano Influência" }) as HTMLButtonElement).disabled).toBe(false);
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
