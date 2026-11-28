/** BEMVINDO-RELEASE (finding 45): só status vivo libera "Pagamento confirmado". */
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

let rows: Array<Record<string, unknown>> = [];
let assinaturaCalls = 0;
const handlers: Record<string, TableHandler> = {
  user_roles: () => ({ data: null, error: null }),
  analysis_history: () => ({ data: [{ id: "a" }], error: null }),
  brand_settings: () => ({ data: { onboarding_completed_at: "2026-01-01" }, error: null }),
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

const CONFIRMING = /Confirmando seu pagamento/;
const CONFIRMED = /Pagamento confirmado/;
const PROCESSING = /Pagamento em processamento/;
const row = (status: string, id: string | null = "sub_new") => ({
  status, asaas_subscription_id: id, plano: "presenca", plano_pretendido: null, data_vencimento: null, ciclos_pagos: 0,
});
const flush = async (ms = 0) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  fromMock.reset();
  sessionStorage.clear();
  assinaturaCalls = 0;
  invokeMock.mockResolvedValue({ data: { reconciled: false } });
  window.history.replaceState({}, "", "/bem-vindo?from=asaas");
});
afterEach(() => { vi.useRealTimers(); });

describe("BemVindoPage — liberação fora da retomada", () => {
  it("(a) cancelado + id não libera", async () => {
    rows = [row("cancelado")];
    render(<BemVindoPage />);
    await flush(); await flush(9000);
    expect(screen.getByText(CONFIRMING)).toBeTruthy();
    expect(screen.queryByText(CONFIRMED)).toBeNull();
  });
  it("(b) pendente + id não libera", async () => {
    rows = [row("pendente")];
    render(<BemVindoPage />);
    await flush(); await flush(9000);
    expect(screen.getByText(CONFIRMING)).toBeTruthy();
    expect(screen.queryByText(CONFIRMED)).toBeNull();
  });
  it("(c) ativo libera", async () => {
    rows = [row("ativo")];
    render(<BemVindoPage />);
    await flush(); await flush(100);
    expect(screen.getByText(CONFIRMED)).toBeTruthy();
  });
  it("(d) trial libera", async () => {
    rows = [row("trial", null)];
    render(<BemVindoPage />);
    await flush(); await flush(100);
    expect(screen.getByText("Cartão cadastrado")).toBeTruthy();
  });
  it("(e) cancelado + id que vira ativo só libera depois", async () => {
    rows = [row("cancelado"), row("cancelado"), row("ativo")];
    render(<BemVindoPage />);
    await flush();
    expect(screen.queryByText(CONFIRMED)).toBeNull();
    await flush(3000);
    expect(screen.queryByText(CONFIRMED)).toBeNull();
    await flush(3000);
    expect(screen.getByText(CONFIRMED)).toBeTruthy();
    expect(assinaturaCalls).toBe(3);
  });
  it("(f) cancelado + id em todas as tentativas termina em processamento", async () => {
    rows = [row("cancelado")];
    render(<BemVindoPage />);
    await flush(); await flush(5 * 60 * 1000);
    expect(screen.getByText(PROCESSING)).toBeTruthy();
    expect(screen.queryByText(CONFIRMED)).toBeNull();
  });
  it("(h) reconcile-asaas na 5ª tentativa libera quando reconciled", async () => {
    rows = [row("cancelado")];
    invokeMock.mockResolvedValue({ data: { reconciled: true } });
    render(<BemVindoPage />);
    await flush(); await flush(4 * 3000);
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith("reconcile-asaas");
    expect(assinaturaCalls).toBe(5);
    expect(screen.getByText(CONFIRMED)).toBeTruthy();
  });
});

describe("BemVindoPage — retomada (retomada=1) inalterada", () => {
  it("(g) cancelado + id não libera; ativo libera", async () => {
    window.history.replaceState({}, "", "/bem-vindo?from=asaas&tipo=upgrade&retomada=1");
    rows = [row("cancelado"), row("ativo")];
    render(<BemVindoPage />);
    await flush();
    expect(screen.queryByText(CONFIRMED)).toBeNull();
    await flush(3000);
    expect(screen.queryByText(/Confirmando seu cartão/)).toBeNull();
    expect(assinaturaCalls).toBe(2);
  });
});
