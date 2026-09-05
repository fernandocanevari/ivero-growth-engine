import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// Banco sem nenhuma linha de diagnóstico: select().eq() resolve count 0.
vi.mock("@/integrations/supabase/client", () => {
  const chain = {
    select: () => chain,
    eq: () => Promise.resolve({ count: 0, data: [], error: null }),
  };
  return {
    supabase: {
      from: () => chain,
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: "u1" } }, error: null }),
      },
    },
  };
});

import { useHasDiagnostic } from "./useHasDiagnostic";

describe("useHasDiagnostic", () => {
  beforeEach(() => {
    from.reset();
    sessionStorage.clear();
  });

  it("sem linhas no banco e sem snapshot → não tem diagnóstico", async () => {
    const { result } = renderHook(() => useHasDiagnostic());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasDiagnostic).toBe(false);
  });

  it("snapshot do preview na sessão conta como diagnóstico existente", async () => {
    sessionStorage.setItem(
      "ivero:lastDiagnostic",
      JSON.stringify({ geoScore: 78, siteUrl: "https://exemplo.com" }),
    );
    const { result } = renderHook(() => useHasDiagnostic());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasDiagnostic).toBe(true);
  });
});
