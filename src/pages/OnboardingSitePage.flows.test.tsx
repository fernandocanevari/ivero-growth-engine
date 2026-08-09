/**
 * Herança da URL do preview no onboarding do site.
 *
 * Caminho 1: visitante veio do preview (URL em sessionStorage["ivero:lastDiagnostic"]
 * ou em brand_settings.website) → pula a etapa de URL e dispara a análise sozinho.
 * Caminho 2: cadastro direto, sem preview → etapa de URL continua aparecendo.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";

const navigateMock = vi.fn();
vi.mock("react-router-dom", () => ({ useNavigate: () => navigateMock }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

import { createFromMock, type TableHandler } from "@/test/supabase-query-mock";

let brandWebsite: string | null = null;
const invokeMock = vi.fn();

const handlers: Record<string, TableHandler> = {
  brand_settings: () => ({ data: brandWebsite === null ? null : { website: brandWebsite }, error: null }),
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

const analysisOk = {
  data: {
    brand_name: "Acme",
    description: "Faz coisas",
    sector: "SaaS",
    competitors: ["Rival"],
    normalized_url: "https://acme.com.br",
  },
  error: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  fromMock.reset();
  sessionStorage.clear();
  brandWebsite = null;
  invokeMock.mockResolvedValue(analysisOk);
});

describe("OnboardingSitePage — URL herdada do preview", () => {
  it("caminho 1a: usa a URL do sessionStorage e pula a etapa de URL", async () => {
    sessionStorage.setItem(
      "ivero:lastDiagnostic",
      JSON.stringify({ siteUrl: "acme.com.br", geoScore: 62 })
    );

    render(<OnboardingSitePage />);

    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1));
    expect(invokeMock).toHaveBeenCalledWith("ivero-onboarding-analyze", {
      body: { url: "acme.com.br" },
    });
    // Nunca pediu a URL de novo
    expect(screen.queryByText(/Qual é o site da sua marca/i)).not.toBeInTheDocument();
    // Terminou na tela de confirmação, com escape hatch disponível
    await waitFor(() =>
      expect(screen.getByText(/Foi isso que eu entendi sobre a sua marca/i)).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: /Analisar outro site/i })).toBeInTheDocument();
  });

  it("caminho 1b: cai no fallback brand_settings.website quando não há sessionStorage", async () => {
    brandWebsite = "https://acme.com.br";

    render(<OnboardingSitePage />);

    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1));
    expect(invokeMock).toHaveBeenCalledWith("ivero-onboarding-analyze", {
      body: { url: "https://acme.com.br" },
    });
  });

  it("caminho 2: cadastro direto sem preview mantém a etapa de URL em branco", async () => {
    render(<OnboardingSitePage />);

    await waitFor(() =>
      expect(screen.getByText(/Qual é o site da sua marca/i)).toBeInTheDocument()
    );
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("não redispara a análise em re-render (guard de StrictMode)", async () => {
    sessionStorage.setItem("ivero:lastDiagnostic", JSON.stringify({ siteUrl: "acme.com.br" }));

    const { rerender } = render(<OnboardingSitePage />);
    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1));
    rerender(<OnboardingSitePage />);
    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1));
  });
});
