import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createFromMock } from "@/test/supabase-query-mock";

const { from } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createFromMock: make } = require("@/test/supabase-query-mock");
  return {
    from: make({
      audit_reports: () => ({ data: null, error: null }),
      analysis_history: () => ({ data: null, error: null }),
    }) as ReturnType<typeof createFromMock>,
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from,
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: "u1" } }, error: null }),
    },
  },
}));

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
