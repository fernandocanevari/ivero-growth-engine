/**
 * P26-fix2 — diálogo de cancelamento mostra exatamente o valor do servidor
 * (manage-subscription/preview_cancel) e o "Confirmar" só libera depois dele.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } },
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
const STATUS = {
  plano: "influencia", status: "ativo", canceladoAcessoAte: null,
  dataVencimento: "2026-12-01T00:00:00.000Z", trialEndsAt: null,
  effectiveStatus: "ativo", isLoading: false, refresh,
  cicloContratado: "anual", ciclosPagos: 2, compromissoMeses: 12,
  carenciaAte: null, isPaid: true, multaPendente: null,
};
vi.mock("@/hooks/useSubscriptionStatus", () => ({ useSubscriptionStatus: () => STATUS }));
const reload = vi.fn(async () => {});
const BILLING = { invoices: [], next: null, overdue: null, isLoading: false, reload };
vi.mock("@/hooks/useBillingInvoices", () => ({
  useBillingInvoices: () => BILLING,
  INVOICE_STATUS_LABEL: {},
}));
const openUpgrade = vi.fn();
vi.mock("@/hooks/useUpgradeEntry", () => ({ useUpgradeEntry: () => ({ openUpgrade }) }));
vi.mock("@/components/dashboard/UpgradeModal", () => ({ UpgradeModal: () => null }));
vi.mock("@/lib/analytics", () => ({ track: () => {} }));
vi.mock("@/lib/reconcile-pending", () => ({ reconcilePendingPayment: async () => null }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

import AssinaturaPage from "./AssinaturaPage";

const confirmButton = () => screen.getByRole("button", { name: /Confirmar cancelamento/ });

beforeEach(() => {
  invoke.mockReset();
});

describe("Diálogo de cancelamento — valor vem do servidor", () => {
  it("mostra 'Calculando…' com Confirmar desabilitado e depois a frase com o valor do servidor", async () => {
    let resolve!: (v: unknown) => void;
    invoke.mockImplementation(() => new Promise((r) => { resolve = r; }));
    render(<AssinaturaPage />);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(await screen.findByText("Calculando…")).toBeInTheDocument();
    expect(confirmButton()).toBeDisabled();
    expect(invoke).toHaveBeenCalledWith("manage-subscription", { body: { action: "preview_cancel" } });

    // Servidor: 200 (2 ciclos Presença), não o 360 que a fórmula antiga do navegador daria.
    resolve({ data: { ok: true, multa: { valor: 200, ciclos: 2 }, emCompromisso: true }, error: null });
    const texto = await screen.findByTestId("cancel-preview-multa");
    const limpo = texto.textContent?.replace(/\u00a0/g, " ");
    // P53: a frase nova mostra o valor e o compromisso, mas nunca a contagem de ciclos.
    expect(limpo).toContain("Ah, que pena!");
    expect(limpo).toContain("Como o preço anual é promocional pelo compromisso de 12 meses");
    expect(limpo).toContain("será gerada uma cobrança única de R$ 200,00");
    expect(limpo).toContain("a diferença dos meses que você já usou");
    expect(limpo).toContain("Conta pra gente o motivo logo abaixo?");
    expect(texto.querySelector("span.font-semibold")?.textContent).toBe("R$ 200,00");
    expect(limpo).not.toContain("mês(es)");
    expect(limpo).not.toContain("já utilizados com desconto");
    expect(limpo?.toLowerCase()).not.toContain("multa");
    expect(limpo).not.toContain("360");
    await waitFor(() => expect(confirmButton()).not.toBeDisabled());
  });

  it("falha na prévia: nenhum valor, Confirmar desabilitado e 'Tentar de novo' busca de novo", async () => {
    invoke.mockResolvedValueOnce({ data: null, error: new Error("falhou") });
    render(<AssinaturaPage />);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(await screen.findByTestId("cancel-preview-error")).toBeInTheDocument();
    expect(screen.queryByTestId("cancel-preview-multa")).toBeNull();
    expect(confirmButton()).toBeDisabled();

    invoke.mockResolvedValueOnce({ data: { ok: true, multa: { valor: 100, ciclos: 1 }, emCompromisso: true }, error: null });
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    const texto = await screen.findByTestId("cancel-preview-multa");
    expect(texto.textContent?.replace(/\u00a0/g, " ")).toContain("R$ 100,00");
    expect(invoke).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(confirmButton()).not.toBeDisabled());
  });

  it("fora do compromisso (mensal): nenhuma frase de cobrança aparece e Confirmar libera", async () => {
    invoke.mockResolvedValueOnce({
      data: { ok: true, multa: { valor: 0, ciclos: 0 }, emCompromisso: false },
      error: null,
    });
    render(<AssinaturaPage />);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(await screen.findByTestId("cancel-preview-loading")).toBeInTheDocument();
    await waitFor(() => expect(confirmButton()).not.toBeDisabled());
    expect(screen.queryByTestId("cancel-preview-multa")).toBeNull();
  });

  it("em compromisso com valor 0: nenhuma frase de cobrança aparece e Confirmar libera", async () => {
    invoke.mockResolvedValueOnce({
      data: { ok: true, multa: { valor: 0, ciclos: 3 }, emCompromisso: true },
      error: null,
    });
    render(<AssinaturaPage />);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(await screen.findByTestId("cancel-preview-loading")).toBeInTheDocument();
    await waitFor(() => expect(confirmButton()).not.toBeDisabled());
    expect(screen.queryByTestId("cancel-preview-multa")).toBeNull();
  });
});
