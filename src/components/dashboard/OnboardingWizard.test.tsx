/**
 * Page-level integration: simula clique do usuário no OnboardingWizard,
 * Supabase responde com erro, e o Toaster real renderiza o toast no DOM.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const authGetUser = vi.fn();
const fromMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: () => authGetUser() },
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

import OnboardingWizard from "./OnboardingWizard";
import { Toaster } from "@/components/ui/toaster";

function Wrapped() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={qc}>
      <OnboardingWizard onComplete={() => {}} />
      <Toaster />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  authGetUser.mockReset();
  fromMock.mockReset();
  authGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
});

describe("OnboardingWizard → Supabase fail → toast visível", () => {
  it("mostra toast destrutivo no DOM quando saveAnswers falha", async () => {
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      insert: () => Promise.resolve({ error: { message: "RLS violation" } }),
      update: () => chain,
    };
    fromMock.mockReturnValue(chain);

    render(<Wrapped />);

    // preenche 3 respostas e avança
    for (let i = 0; i < 3; i++) {
      const textarea = await screen.findByRole("textbox");
      fireEvent.change(textarea, { target: { value: "resposta suficientemente longa do usuario" } });
      const buttons = screen.getAllByRole("button");
      const next = buttons.find((b) => /Próxima|Concluir/.test(b.textContent || ""));
      await act(async () => { fireEvent.click(next!); });
    }

    await waitFor(() => {
      expect(screen.getByText("Não foi possível salvar suas respostas")).toBeInTheDocument();
    });
    expect(screen.getByText(/RLS violation/)).toBeInTheDocument();
  });
});
