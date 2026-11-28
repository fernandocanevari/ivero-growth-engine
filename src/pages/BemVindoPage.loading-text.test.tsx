/** P63 (findings 50 e 53): título de carregamento sempre "cartão"; frases com quebra equilibrada. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import React from "react";

const navigateMock = vi.fn();
vi.mock("react-router-dom", () => ({ useNavigate: () => navigateMock }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
vi.mock("@/hooks/useUserRole", () => ({ useUserRole: () => ({ isAdmin: false }) }));
let subState: Record<string, unknown> = {};
vi.mock("@/hooks/useSubscriptionStatus", () => ({
  useSubscriptionStatus: () => ({ refresh: vi.fn(), isLoading: false, ...subState }),
}));

import { createFromMock, type TableHandler } from "@/test/supabase-query-mock";

let onboarded = true;
let rows: Array<Record<string, unknown>> = [];
const handlers: Record<string, TableHandler> = {
  user_roles: () => ({ data: null, error: null }),
  analysis_history: () => ({ data: [{ id: "a" }], error: null }),
  brand_settings: () => ({ data: { onboarding_completed_at: onboarded ? "2026-01-01" : null }, error: null }),
  assinaturas: () => ({ data: rows.length > 1 ? rows.shift()! : rows[0], error: null }),
};
const fromMock = createFromMock(handlers);
const invokeMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "u1" } } }) },
    from: (t: string) => fromMock(t),
    functions: { invoke: (...a: unknown[]) => invokeMock(...a) },
  },
}));

class IO { observe() {} unobserve() {} disconnect() {} }
(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IO;

import BemVindoPage from "./BemVindoPage";

const flush = async (ms = 0) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
const trialRow = (trial_ends_at: string | null) => ({
  status: "trial", asaas_subscription_id: "sub_1", plano: "presenca", plano_pretendido: null, data_vencimento: null, ciclos_pagos: 0, trial_ends_at,
});
const REAL = {
  status: "ativo", plano: "presenca", plano_pretendido: "influencia", ciclo_contratado: "anual",
  ciclos_pagos: 0, data_vencimento: "2026-11-27 00:58:16.326+00", asaas_subscription_id: "sub_real",
  upgrade_pendente_plano: null, checkout_context: null,
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  fromMock.reset();
  sessionStorage.clear();
  onboarded = true;
  rows = [trialRow("2026-12-03T15:00:00.000Z")];
  subState = { effectiveStatus: "ativo", plano: "presenca" };
  invokeMock.mockResolvedValue({ data: { reconciled: false } });
});
afterEach(() => { vi.useRealTimers(); });

describe("BemVindoPage — título de carregamento", () => {
  for (const q of ["?from=asaas", "?from=asaas&retomada=1", "?from=asaas&tipo=upgrade"]) {
    it(`primeiro quadro diz cartão (${q})`, () => {
      window.history.replaceState({}, "", `/bem-vindo${q}`);
      render(<BemVindoPage />);
      expect(screen.getByText("Confirmando seu cartão…")).toBeTruthy();
      expect(screen.queryByText(/Confirmando seu pagamento/)).toBeNull();
    });
  }
});

describe("BemVindoPage — quebra equilibrada", () => {
  it("lean: frase do cartão com text-balance", async () => {
    window.history.replaceState({}, "", "/bem-vindo?from=asaas");
    render(<BemVindoPage />);
    await flush(); await flush(100);
    expect(screen.getByTestId("trial-card-notice").querySelector('[data-testid="trial-card-sentence"]')!.className).toContain("text-balance");
  });
  it("jornada: frase do cartão com text-balance", async () => {
    onboarded = false;
    window.history.replaceState({}, "", "/bem-vindo?from=asaas");
    render(<BemVindoPage />);
    await flush(); await flush(100);
    expect(screen.getByText(/Parabéns!/)).toBeTruthy();
    expect(screen.getByTestId("trial-card-sentence").className).toContain("text-balance");
  });
  it("retomada: frase com text-balance", async () => {
    rows = [REAL];
    subState = { effectiveStatus: "ativo", plano: "presenca", planoPretendido: "influencia", dataVencimento: REAL.data_vencimento };
    window.history.replaceState({}, "", "/bem-vindo?from=asaas&tipo=upgrade&retomada=1");
    render(<BemVindoPage />);
    await flush(); await flush(100);
    expect(screen.getByText("Sua assinatura voltou")).toBeTruthy();
    const p = screen.getByText("A primeira cobrança é em 26/11. Até lá, você continua no Presença.");
    expect(p.className).toContain("text-balance");
  });
});
