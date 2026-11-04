/**
 * Retomada de assinatura paga cancelada com dias de acesso restantes:
 * o aviso "sem cobrança hoje" só aparece nesse caso, com a data em Brasília.
 */
import { describe, it, expect, vi } from "vitest";
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
  canceladoAcessoAte: UNTIL,
  multaPendente: null,
};

const notices = () => screen.queryAllByText(/Sem cobrança hoje/);

describe("UpgradeModal — retomada paga", () => {
  it("mostra em cada plano o aviso com a data de Brasília e o início do plano diferente", () => {
    statusMock = PAID_CANCELLED;
    render(<UpgradeModal open onOpenChange={() => {}} />);
    expect(notices()).toHaveLength(3);
    for (const n of notices()) expect(n.textContent).toContain("10/12/2026");
    expect(screen.getByText(/O plano Autoridade começa nessa data\./)).toBeTruthy();
    expect(screen.getByText(/O plano Presença começa nessa data\./)).toBeTruthy();
    expect(screen.queryByText(/O plano Influência começa nessa data\./)).toBeNull();
  });

  it("não aparece sem histórico pago, com multa pendente ou com o acesso encerrado", () => {
    for (const s of [
      { ...PAID_CANCELLED, ciclosPagos: 0 },
      { ...PAID_CANCELLED, multaPendente: { valor: 600, ciclos: 3, invoiceUrl: null } },
      { ...PAID_CANCELLED, canceladoAcessoAte: null },
      { ...PAID_CANCELLED, effectiveStatus: "ativo", hasAsaasSubscription: true },
    ]) {
      statusMock = s;
      const { unmount } = render(<UpgradeModal open onOpenChange={() => {}} />);
      expect(notices()).toHaveLength(0);
      unmount();
    }
  });
});
