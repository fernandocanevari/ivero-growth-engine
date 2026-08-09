/**
 * Reaproveitamento do prefetch do perfil da marca (disparado no gate do preview).
 *
 * Hit: sessionStorage["ivero:brandPrefetch"] casa com a URL herdada → pula o
 * loading e NÃO chama ivero-onboarding-analyze.
 * Miss (prefetch de outro site / ainda não terminou) → comportamento atual.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";

const navigateMock = vi.fn();
vi.mock("react-router-dom", () => ({ useNavigate: () => navigateMock }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

import { createFromMock, type TableHandler } from "@/test/supabase-query-mock";
import { BRAND_PREFETCH_KEY } from "@/lib/brand-prefetch";

const invokeMock = vi.fn();
const handlers: Record<string, TableHandler> = {
  brand_settings: () => ({ data: null, error: null }),
};
const fromMock = createFromMock(handlers);

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "u1" } } }) },
    from: (table: string) => fromMock(table),
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
  },
}));

import OnboardingSitePage from "./OnboardingSitePage";

const prefetchResult = {
  brand_name: "Acme",
  description: "Faz coisas",
  sector: "SaaS",
  competitors: ["Rival"],
  normalized_url: "https://acme.com.br",
};

beforeEach(() => {
  vi.clearAllMocks();
  fromMock.reset();
  sessionStorage.clear();
  invokeMock.mockResolvedValue({ data: prefetchResult, error: null });
  sessionStorage.setItem(
    "ivero:lastDiagnostic",
    JSON.stringify({ siteUrl: "acme.com.br", geoScore: 62 }),
  );
});

describe("OnboardingSitePage — prefetch do perfil da marca", () => {
  it("hit: usa o prefetch e não chama a análise de novo", async () => {
    sessionStorage.setItem(
      BRAND_PREFETCH_KEY,
      JSON.stringify({ url: "acme.com.br", at: Date.now(), result: prefetchResult }),
    );

    render(<OnboardingSitePage />);

    await waitFor(() =>
      expect(screen.getByText(/Foi isso que eu entendi sobre a sua marca/i)).toBeInTheDocument(),
    );
    expect(invokeMock).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("Acme")).toBeInTheDocument();
    // Prefetch consumido é limpo
    expect(sessionStorage.getItem(BRAND_PREFETCH_KEY)).toBeNull();
  });

  it("miss (prefetch de outro site): roda a análise normalmente", async () => {
    sessionStorage.setItem(
      BRAND_PREFETCH_KEY,
      JSON.stringify({ url: "outrosite.com", at: Date.now(), result: prefetchResult }),
    );

    render(<OnboardingSitePage />);

    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1));
    expect(invokeMock).toHaveBeenCalledWith("ivero-onboarding-analyze", {
      body: { url: "acme.com.br" },
    });
  });

  it("miss (prefetch ainda não terminou): roda a análise normalmente", async () => {
    render(<OnboardingSitePage />);

    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByText(/Foi isso que eu entendi sobre a sua marca/i)).toBeInTheDocument(),
    );
  });
});
