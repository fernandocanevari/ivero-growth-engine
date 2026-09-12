/**
 * Regressão: o diagnóstico trazido do /preview agora entra em
 * `analysis_history` (para a aba Evolução mostrar o marco zero), mas NÃO pode
 * consumir o intervalo de 30 dias da reanálise. Cliente novo precisa poder
 * rodar a primeira reanálise no mesmo dia do cadastro.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const rows = vi.fn();

vi.mock("@/hooks/useAuthUserId", () => ({
  useAuthUserId: () => ({ userId: "user-1", isResolving: false }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: async () => ({ data: rows(), error: null }),
        }),
      }),
    }),
  },
}));

import { useAnalysisHistory } from "./useAnalysisHistory";

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

const base = {
  user_id: "user-1",
  overall_score: 60,
  clarity_score: 60,
  authority_score: 60,
  conversion_score: 60,
  positioning_score: 60,
  experience_score: 60,
};

beforeEach(() => rows.mockReset());

describe("cooldown de reanálise", () => {
  it("cliente vindo do /preview ainda pode rodar a primeira reanálise", async () => {
    rows.mockReturnValue([
      { ...base, id: "a", source: "preview", created_at: new Date().toISOString() },
    ]);
    const { result } = renderHook(() => useAnalysisHistory(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.history).toHaveLength(1));
    expect(result.current.canReanalyze).toBe(true);
    expect(result.current.daysRemaining).toBe(0);
  });

  it("reanálise recente no painel mantém o bloqueio de 30 dias", async () => {
    rows.mockReturnValue([
      { ...base, id: "a", source: "preview", created_at: "2026-01-01T00:00:00.000Z" },
      { ...base, id: "b", source: "reanalise", created_at: new Date().toISOString() },
    ]);
    const { result } = renderHook(() => useAnalysisHistory(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.history).toHaveLength(2));
    expect(result.current.canReanalyze).toBe(false);
    expect(result.current.daysRemaining).toBe(30);
  });
});
