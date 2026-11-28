/** P60 (finding 44): trial com cartão cadastrado não diz "Pagamento confirmado". */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import React from "react";

const navigateMock = vi.fn();
vi.mock("react-router-dom", () => ({ useNavigate: () => navigateMock }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
vi.mock("@/hooks/useUserRole", () => ({ useUserRole: () => ({ isAdmin: false }) }));
vi.mock("@/hooks/useSubscriptionStatus", () => ({
  useSubscriptionStatus: () => ({ refresh: vi.fn(), isLoading: false, effectiveStatus: "ativo", plano: "presenca" }),
}));

import { createFromMock, type TableHandler } from "@/test/supabase-query-mock";

let onboarded = true;
let rows: Array<Record<string, unknown>> = [];
let assinaturaCalls = 0;
const handlers: Record<string, TableHandler> = {
  user_roles: () => ({ data: null, error: null }),
  analysis_history: () => ({ data: [{ id: "a" }], error: null }),
  brand_settings: () => ({ data: { onboarding_completed_at: onboarded ? "2026-01-01" : null }, error: null }),
  assinaturas: () => {
    assinaturaCalls++;
    return { data: rows.length > 1 ? rows.shift()! : rows[0], error: null };
  },
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

const row = (status: string, trial_ends_at: string | null) => ({
  status, asaas_subscription_id: "sub_1", plano: "presenca", plano_pretendido: null, data_vencimento: null, ciclos_pagos: 0, trial_ends_at,
});
const flush = async (ms = 0) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  fromMock.reset();
  sessionStorage.clear();
  onboarded = true;
  invokeMock.mockResolvedValue({ data: { reconciled: false } });
  window.history.replaceState({}, "", "/bem-vindo?from=asaas");
});
afterEach(() => { vi.useRealTimers(); });

const SENT_DATE = "A primeira cobrança é em 03/12, quando o seu teste termina. Até lá, tudo segue como está.";
const SENT_NODATE = "A primeira cobrança é no fim do seu teste. Até lá, tudo segue como está.";

describe("BemVindoPage — trial com cartão cadastrado", () => {
  it("lean: Cartão cadastrado + pill + data, sem Pagamento confirmado", async () => {
    rows = [row("trial", "2026-12-03T15:00:00.000Z")];
    render(<BemVindoPage />);
    await flush(); await flush(100);
    expect(screen.getByText("Cartão cadastrado")).toBeTruthy();
    expect(screen.getByTestId("trial-card-notice")).toBeTruthy();
    expect(screen.getByTestId("trial-card-pill").textContent).toContain("Nada foi cobrado hoje");
    expect(screen.getByTestId("trial-card-sentence").textContent).toBe(SENT_DATE);
    expect(screen.queryByText(/Pagamento confirmado/)).toBeNull();
    expect(screen.getByRole("button", { name: "Acessar Dashboard" })).toBeTruthy();
  });
  it("lean sem trial_ends_at: frase sem data", async () => {
    rows = [row("trial", null)];
    render(<BemVindoPage />);
    await flush(); await flush(100);
    expect(screen.getByTestId("trial-card-sentence").textContent).toBe(SENT_NODATE);
  });
  it("jornada: Parabéns! + pill + frase", async () => {
    onboarded = false;
    rows = [row("trial", "2026-12-03T15:00:00.000Z")];
    render(<BemVindoPage />);
    await flush(); await flush(100);
    expect(screen.getByText(/Parabéns!/)).toBeTruthy();
    expect(screen.getByTestId("trial-card-pill").textContent).toContain("Nada foi cobrado hoje");
    expect(screen.getByTestId("trial-card-sentence").textContent).toBe(SENT_DATE);
  });
  it("ativo + lean: Pagamento confirmado, sem pill", async () => {
    rows = [row("ativo", "2026-12-03T15:00:00.000Z")];
    render(<BemVindoPage />);
    await flush(); await flush(100);
    expect(screen.getByText("Pagamento confirmado")).toBeTruthy();
    expect(screen.queryByTestId("trial-card-pill")).toBeNull();
    expect(screen.queryByText("Cartão cadastrado")).toBeNull();
  });
});
