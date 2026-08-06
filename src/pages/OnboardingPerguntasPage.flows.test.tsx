/**
 * Fluxo 3 — Salvamento das 3 perguntas do onboarding.
 *
 * Somente testes. Cobre: upsert idempotente com onConflict=brand_id,
 * salvamento parcial a cada resposta, hidratação/retomada do passo e
 * ausência de duplicatas (um único upsert por resposta, sempre na mesma linha).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

const navigateMock = vi.fn();
vi.mock("react-router-dom", () => ({ useNavigate: () => navigateMock }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

const getUserMock = vi.fn();
import { createFromMock, type TableHandler } from "@/test/supabase-query-mock";

let savedResponses: Record<string, string | null> | null = null;
let upsertError: { message: string } | null = null;

const handlers: Record<string, TableHandler> = {
  brand_settings: () => ({ data: { id: "brand-1" }, error: null }),
  onboarding_responses: (call) => {
    const upsert = call.ops.find((op) => op.method === "upsert");
    if (upsert) return { data: null, error: upsertError };
    return { data: savedResponses, error: null };
  },
};
const fromMock = createFromMock(handlers);

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: () => getUserMock() },
    from: (table: string) => fromMock(table),
  },
}));

import OnboardingPerguntasPage from "./OnboardingPerguntasPage";

beforeEach(() => {
  vi.clearAllMocks();
  fromMock.reset();
  savedResponses = null;
  upsertError = null;
  getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
});

const upserts = () =>
  fromMock.opsFor("onboarding_responses", "upsert").map((op) => ({
    payload: op.args[0] as Record<string, string>,
    options: op.args[1] as { onConflict?: string } | undefined,
  }));

async function renderPage() {
  render(<OnboardingPerguntasPage />);
  await waitFor(() => expect(screen.getByRole("progressbar")).toBeInTheDocument());
}

describe("Fluxo 3 — persistência das 3 perguntas", () => {
  it("resolve a marca com upsert idempotente em brand_settings (onConflict user_id)", async () => {
    await renderPage();
    const [op] = fromMock.opsFor("brand_settings", "upsert");
    expect(op.args[0]).toEqual({ user_id: "user-1" });
    expect(op.args[1]).toMatchObject({ onConflict: "user_id", ignoreDuplicates: false });
  });

  it("salva parcialmente a cada resposta, sempre com onConflict=brand_id", async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByText("Sinceramente, acho que nem aparecemos"));
    await waitFor(() => expect(upserts()).toHaveLength(1));
    expect(upserts()[0].options).toMatchObject({ onConflict: "brand_id" });
    expect(upserts()[0].payload).toMatchObject({
      brand_id: "brand-1",
      p1_maturidade_ia: "nem_aparecemos",
      p2_criterio_mercado: "",
      p3_maior_risco: "",
    });

    await waitFor(() =>
      expect(screen.getByText("Preço e custo-benefício")).toBeInTheDocument(),
    );
    await user.click(screen.getByText("Preço e custo-benefício"));
    await waitFor(() => expect(upserts()).toHaveLength(2));
    expect(upserts()[1].payload).toMatchObject({
      p1_maturidade_ia: "nem_aparecemos",
      p2_criterio_mercado: "preco_custo",
      p3_maior_risco: "",
    });
  });

  it("um upsert por resposta (nenhum insert que criaria linha duplicada)", async () => {
    const user = userEvent.setup();
    await renderPage();
    await user.click(screen.getByText("Sinceramente, acho que nem aparecemos"));
    await waitFor(() => expect(upserts()).toHaveLength(1));
    expect(fromMock.opsFor("onboarding_responses", "insert")).toHaveLength(0);
    // todos os upserts apontam para o MESMO brand_id
    expect(new Set(upserts().map((u) => u.payload.brand_id)).size).toBe(1);
  });

  it("na última pergunta persiste e navega para /onboarding/site", async () => {
    savedResponses = {
      p1_maturidade_ia: "nem_aparecemos",
      p2_criterio_mercado: "preco_custo",
      p3_maior_risco: null,
    };
    const user = userEvent.setup();
    await renderPage();
    await user.click(screen.getByText("Meus concorrentes aparecerem no meu lugar"));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/onboarding/site"));
    expect(upserts().at(-1)?.payload).toMatchObject({
      p1_maturidade_ia: "nem_aparecemos",
      p2_criterio_mercado: "preco_custo",
      p3_maior_risco: "concorrente_ocupa_espaco",
    });
  });

  it("não navega quando o upsert final falha", async () => {
    savedResponses = {
      p1_maturidade_ia: "a",
      p2_criterio_mercado: "b",
      p3_maior_risco: null,
    };
    upsertError = { message: "rls" };
    const user = userEvent.setup();
    await renderPage();
    await user.click(screen.getByText("Meus concorrentes aparecerem no meu lugar"));
    await waitFor(() => expect(upserts().length).toBeGreaterThan(0));
    expect(navigateMock).not.toHaveBeenCalledWith("/onboarding/site");
  });

  it.each([
    [{ p1_maturidade_ia: "a", p2_criterio_mercado: null, p3_maior_risco: null }, "2"],
    [{ p1_maturidade_ia: "a", p2_criterio_mercado: "b", p3_maior_risco: null }, "3"],
    [{ p1_maturidade_ia: null, p2_criterio_mercado: null, p3_maior_risco: null }, "1"],
  ])("hidrata respostas salvas e retoma na pergunta %#", async (saved, expectedStep) => {
    savedResponses = saved as Record<string, string | null>;
    await renderPage();
    expect(
      screen.getByText(`Pergunta ${expectedStep} de 3`),
    ).toBeInTheDocument();
  });

  it("com as 3 respondidas mantém o usuário na última pergunta (não recomeça)", async () => {
    savedResponses = {
      p1_maturidade_ia: "a",
      p2_criterio_mercado: "b",
      p3_maior_risco: "c",
    };
    await renderPage();
    expect(screen.getByText("Pergunta 3 de 3")).toBeInTheDocument();
  });

  it("sem usuário autenticado redireciona para /login e não escreve nada", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    render(<OnboardingPerguntasPage />);
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/login"));
    expect(fromMock.calls).toHaveLength(0);
  });
});
