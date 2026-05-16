/**
 * Hook-level tests refatorados: percorrem a matriz de cenários do
 * Supabase (RLS, unique, FK, network, timeout, 5xx, unknown) para cada
 * mutation crítica, garantindo que onError dispara o toast padronizado.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const toastMock = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: (args: unknown) => toastMock(args),
}));

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
import {
  SUPABASE_ERROR_SCENARIOS,
  makeFailingChain,
} from "@/test/supabase-error-scenarios";

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

interface HookCase {
  name: string;
  expectedTitle: string;
  terminator: "insert" | "delete";
  run: () => Promise<void>;
}

const CASES: HookCase[] = [
  {
    name: "useAuditReports.remove",
    expectedTitle: "Não foi possível remover o relatório",
    terminator: "delete",
    run: async () => {
      const { result } = renderHook(() => useAuditReports(), { wrapper: wrapper() });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await act(async () => {
        try { await result.current.remove.mutateAsync("abc"); } catch {}
      });
    },
  },
  {
    name: "useAnalysisHistory.runAnalysis",
    expectedTitle: "Não foi possível salvar a análise",
    terminator: "insert",
    run: async () => {
      const { result } = renderHook(() => useAnalysisHistory(), { wrapper: wrapper() });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await act(async () => {
        try {
          await result.current.runAnalysis.mutateAsync({
            clarity: 50, authority: 50, conversion: 50, positioning: 50, experience: 50,
          });
        } catch {}
      });
    },
  },
  {
    name: "useOnboarding.saveAnswers",
    expectedTitle: "Não foi possível salvar suas respostas",
    terminator: "insert",
    run: async () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper: wrapper() });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await act(async () => {
        try {
          await result.current.saveAnswers.mutateAsync({
            question_1: "a", question_2: "b", question_3: "c",
          });
        } catch {}
      });
    },
  },
];

describe("Mutations × matriz Supabase → toast padronizado", () => {
  for (const c of CASES) {
    describe(c.name, () => {
      it.each(SUPABASE_ERROR_SCENARIOS)(
        "[$id] $label dispara toast destrutivo",
        async (scenario) => {
          fromMock.mockReturnValue(makeFailingChain(c.terminator, scenario.error));
          await c.run();

          await waitFor(() => expect(toastMock).toHaveBeenCalled());
          const call = toastMock.mock.calls.find((x) => x[0]?.variant === "destructive");
          expect(call?.[0].title).toBe(c.expectedTitle);
          expect(String(call?.[0].description)).toContain(scenario.expectedFragment);
        },
      );
    });
  }
});
