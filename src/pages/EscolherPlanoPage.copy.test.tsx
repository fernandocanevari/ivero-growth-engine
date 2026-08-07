/**
 * Copy condicional do /escolher-plano (Prompt A→D).
 *
 * Cenário real reproduzido: Cliente 30 — uma única linha em `assinaturas`
 * com status='expirado' e trial_ends_at no passado. Não é elegível ao trial,
 * então a tela deve falar de cobrança imediata, nunca de "7 dias grátis".
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

const navigateMock = vi.fn();
let search = "";
vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
  useSearchParams: () => [new URLSearchParams(search)],
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), info: vi.fn() } }));
vi.mock("framer-motion", () => ({
  motion: {
    div: (p: React.ComponentProps<"div">) => <div {...p} />,
    header: (p: React.ComponentProps<"header">) => <header {...p} />,
  },
}));

import { createFromMock, type TableHandler } from "@/test/supabase-query-mock";

let assinaturaRows: Array<{ status: string | null; trial_ends_at: string | null }> = [];

const handlers: Record<string, TableHandler> = {
  assinaturas: () => ({ data: assinaturaRows, error: null }),
};
const fromMock = createFromMock(handlers);

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: () =>
        Promise.resolve({
          data: {
            session: {
              user: {
                id: "aa702149-5874-4da0-b675-ff99218ef0c7",
                email: "cliente30@teste.com.br",
                user_metadata: { display_name: "Cliente 30" },
              },
            },
          },
        }),
    },
    from: (table: string) => fromMock(table),
    functions: { invoke: vi.fn() },
  },
}));

import EscolherPlanoPage from "./EscolherPlanoPage";

beforeEach(() => {
  vi.clearAllMocks();
  fromMock.reset();
  localStorage.clear();
  search = "";
  assinaturaRows = [];
});

const renderPage = async () => {
  render(<EscolherPlanoPage />);
  await waitFor(() =>
    expect(screen.queryByText("Carregando...")).not.toBeInTheDocument(),
  );
};

describe("EscolherPlanoPage — elegibilidade ao trial", () => {
  it("usuário sem histórico mantém a copy de 7 dias grátis", async () => {
    assinaturaRows = [];
    await renderPage();

    expect(screen.getByText(/7 dias grátis — sem cobrança imediata/)).toBeInTheDocument();
    expect(screen.getAllByText("Começar com 7 dias grátis →").length).toBe(3);
  });

  it("Cliente 30 (trial expirado) vê cobrança imediata, sem 7 dias grátis", async () => {
    search = "motivo=trial_expirado";
    assinaturaRows = [
      { status: "expirado", trial_ends_at: "2026-07-31T00:46:15.400Z" },
    ];
    await renderPage();

    // Nenhuma menção a trial gratuito nos CTAs dos cards
    expect(screen.getAllByText("Assinar plano →").length).toBe(3);
    expect(screen.queryByText("Começar com 7 dias grátis →")).not.toBeInTheDocument();
    expect(screen.queryByText(/7 dias grátis — sem cobrança imediata/)).not.toBeInTheDocument();

    // Não houve redirect (trial expirado não é assinatura viva)
    expect(navigateMock).not.toHaveBeenCalled();

    // Modal de confirmação: cobrança agora, com plano e valor
    await userEvent.click(screen.getAllByText("Assinar plano →")[2]);
    await waitFor(() =>
      expect(
        screen.getByText(
          /A cobrança do plano Autoridade será feita agora, no valor de R\$\s?1\.5?\d*/,
        ),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("Assinar agora")).toBeInTheDocument();
    expect(screen.queryByText("Iniciar 7 dias grátis")).not.toBeInTheDocument();
  });

  it("trial ainda válido continua elegível", async () => {
    const futuro = new Date(Date.now() + 3 * 86_400_000).toISOString();
    assinaturaRows = [{ status: "trial", trial_ends_at: futuro }];
    render(<EscolherPlanoPage />);
    // assinatura viva → redireciona para o dashboard (tela fica em loading)
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith("/dashboard", { replace: true }),
    );
  });
});
