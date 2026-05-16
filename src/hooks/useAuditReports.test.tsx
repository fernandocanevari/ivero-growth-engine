/**
 * Hook-level tests: garante que falhas reais do Supabase em mutations
 * disparam o toast destrutivo padronizado via onError.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const toastMock = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: (args: unknown) => toastMock(args),
}));

// Supabase client mock — controla resposta de cada chamada
const authGetUser = vi.fn();
const fromMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: () => authGetUser() },
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

import { useAuditReports } from "./useAuditReports";
import { useAnalysisHistory } from "./useAnalysisHistory";
import { useOnboarding } from "./useOnboarding";

function wrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => {
  toastMock.mockReset();
  authGetUser.mockReset();
  fromMock.mockReset();
  authGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
});

describe("useAuditReports.remove — Supabase failure → toast", () => {
  it("dispara toast destrutivo quando delete falha (RLS)", async () => {
    // SELECT (list query) — vazio mas ok
    const selectChain = {
      select: () => selectChain,
      eq: () => selectChain,
      order: () => Promise.resolve({ data: [], error: null }),
      delete: () => selectChain,
    };
    // delete().eq() → erro
    const deleteChain = {
      delete: () => deleteChain,
      eq: () => Promise.resolve({ error: { message: "permission denied for table audit_reports" } }),
    };

    fromMock.mockImplementation(() => ({
      ...selectChain,
      ...deleteChain,
    }));

    const { result } = renderHook(() => useAuditReports(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      try { await result.current.remove.mutateAsync("abc"); } catch {}
    });

    await waitFor(() => expect(toastMock).toHaveBeenCalled());
    const call = toastMock.mock.calls.find((c) => c[0]?.variant === "destructive");
    expect(call?.[0].title).toBe("Não foi possível remover o relatório");
    expect(call?.[0].description).toContain("permission denied");
  });
});

describe("useAnalysisHistory.runAnalysis — Supabase failure → toast", () => {
  it("dispara toast destrutivo quando insert falha (unique constraint)", async () => {
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      order: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ error: { message: "duplicate key value violates unique constraint" } }),
    };
    fromMock.mockReturnValue(chain);

    const { result } = renderHook(() => useAnalysisHistory(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      try {
        await result.current.runAnalysis.mutateAsync({
          clarity: 50, authority: 50, conversion: 50, positioning: 50, experience: 50,
        });
      } catch {}
    });

    await waitFor(() => expect(toastMock).toHaveBeenCalled());
    const call = toastMock.mock.calls.find((c) => c[0]?.variant === "destructive");
    expect(call?.[0].title).toBe("Não foi possível salvar a análise");
    expect(call?.[0].description).toContain("duplicate key");
  });
});

describe("useOnboarding.saveAnswers — Supabase failure → toast", () => {
  it("dispara toast destrutivo quando insert falha (network)", async () => {
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      insert: () => Promise.resolve({ error: { message: "network unreachable" } }),
      update: () => chain,
    };
    fromMock.mockReturnValue(chain);

    const { result } = renderHook(() => useOnboarding(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      try {
        await result.current.saveAnswers.mutateAsync({
          question_1: "a", question_2: "b", question_3: "c",
        });
      } catch {}
    });

    await waitFor(() => expect(toastMock).toHaveBeenCalled());
    const call = toastMock.mock.calls.find((c) => c[0]?.variant === "destructive");
    expect(call?.[0].title).toBe("Não foi possível salvar suas respostas");
    expect(call?.[0].description).toContain("network unreachable");
  });
});
