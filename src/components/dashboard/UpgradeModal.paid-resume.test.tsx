/**
 * Retomada de assinatura paga cancelada com dias de acesso restantes:
 * o aviso único de retomada paga aparece com a data em Brasília.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

let statusMock: Record<string, unknown>;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getUser: vi.fn() }, functions: { invoke: vi.fn() } },
}));
vi.mock("@/hooks/useSubscriptionStatus", () => ({ useSubscriptionStatus: () => statusMock }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ track: () => {} }));
vi.mock("@/hooks/useAccountType", () => ({
  useAccountType: () => ({ accountType: "individual", agencyName: null, isLoading: false, isAgency: false }),
}));

import { UpgradeModal } from "./UpgradeModal";

// 10/12/2026 23:59:59.999 em Brasília (seria 11/12 em UTC).
const UNTIL = "2026-12-11T02:59:59.999Z";
const PAID_CANCELLED = {
  plano: "influencia",
  isLoading: false,
  isAdmin: false,
  effectiveStatus: "cancelado",
  hasAsaasSubscription: false,
  cicloContratado: "anual",
  ciclosPagos: 3,
  countedPaymentIds: [],
  dataVencimento: UNTIL,
  canceladoAcessoAte: UNTIL,
  multaPendente: null,
};

const notices = () => screen.queryAllByText(/Você não paga nada hoje/);

describe("UpgradeModal — retomada paga", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-07T13:36:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("mostra o aviso na segunda reativação mesmo com ciclos zerados", () => {
    statusMock = { ...PAID_CANCELLED, ciclosPagos: 0, countedPaymentIds: ["pay_1"] };
    render(<UpgradeModal open onOpenChange={() => {}} />);
    expect(notices()).toHaveLength(1);
  });

  it("mostra um aviso com a data de Brasília e o início do plano diferente", () => {
    statusMock = PAID_CANCELLED;
    render(<UpgradeModal open onOpenChange={() => {}} />);
    expect(notices()).toHaveLength(1);
    for (const n of notices()) expect(n.textContent).toContain("10/12/2026");
    expect(screen.getByText(/O plano Autoridade começa nessa data\./)).toBeTruthy();
    expect(screen.getByText(/O plano Presença começa nessa data\./)).toBeTruthy();
    expect(screen.queryByText(/O plano Influência começa nessa data\./)).toBeNull();
  });

  it("não aparece sem histórico pago, com multa pendente ou com o acesso encerrado", () => {
    for (const s of [
      { ...PAID_CANCELLED, ciclosPagos: 0 },
      { ...PAID_CANCELLED, multaPendente: { valor: 600, ciclos: 3, invoiceUrl: null } },
      { ...PAID_CANCELLED, dataVencimento: null, canceladoAcessoAte: null },
      { ...PAID_CANCELLED, dataVencimento: "2026-11-07T02:59:59.999Z" },
      { ...PAID_CANCELLED, effectiveStatus: "ativo", hasAsaasSubscription: true },
    ]) {
      statusMock = s;
      const { unmount } = render(<UpgradeModal open onOpenChange={() => {}} />);
      expect(notices()).toHaveLength(0);
      unmount();
    }
  });
});
