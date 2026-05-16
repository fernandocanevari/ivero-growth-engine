/**
 * Page-level integration: dispara mutation real (useOnboarding) com Supabase
 * mockado retornando erro, e verifica que o Toaster real renderiza o toast
 * destrutivo no DOM — caminho ponta-a-ponta exceto rede.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

import { useOnboarding } from "@/hooks/useOnboarding";
import { useAuditReports } from "@/hooks/useAuditReports";
import { Toaster } from "@/components/ui/toaster";

function OnboardingHarness() {
  const { saveAnswers } = useOnboarding();
  return (
    <button
      onClick={() =>
        saveAnswers.mutate({ question_1: "a", question_2: "b", question_3: "c" })
      }
    >
      Salvar respostas
    </button>
  );
}

function AuditHarness() {
  const { remove } = useAuditReports();
  return <button onClick={() => remove.mutate("rep-1")}>Remover relatório</button>;
}

function wrap(node: React.ReactNode) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={qc}>
      {node}
      <Toaster />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  authGetUser.mockReset();
  fromMock.mockReset();
  authGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
});

describe("Integração: mutation falha → toast renderiza no DOM", () => {
  it("useOnboarding.saveAnswers: erro do Supabase → toast visível", async () => {
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      insert: () => Promise.resolve({ error: { message: "RLS violation" } }),
      update: () => chain,
    };
    fromMock.mockReturnValue(chain);

    render(wrap(<OnboardingHarness />));
    fireEvent.click(screen.getByText("Salvar respostas"));

    await waitFor(
      () => expect(screen.getByText("Não foi possível salvar suas respostas")).toBeInTheDocument(),
      { timeout: 2000 },
    );
    expect(screen.getByText(/RLS violation/)).toBeInTheDocument();
  });

  it("useAuditReports.remove: erro do Supabase → toast visível", async () => {
    const chain: any = {
      select: () => chain,
      eq: (..._args: unknown[]) => {
        // segundo eq da chain de delete devolve a Promise
        return _args.length && _args[0] === "id"
          ? Promise.resolve({ error: { message: "permission denied" } })
          : chain;
      },
      order: () => Promise.resolve({ data: [], error: null }),
      delete: () => chain,
    };
    fromMock.mockReturnValue(chain);

    render(wrap(<AuditHarness />));
    fireEvent.click(screen.getByText("Remover relatório"));

    await waitFor(
      () => expect(screen.getByText("Não foi possível remover o relatório")).toBeInTheDocument(),
      { timeout: 2000 },
    );
    expect(screen.getByText(/permission denied/)).toBeInTheDocument();
  });
});
