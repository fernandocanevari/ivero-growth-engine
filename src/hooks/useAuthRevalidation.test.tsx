import { describe, it, expect, vi } from "vitest";
import { render, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";

/**
 * Regressão: ao voltar o foco da janela, a consulta de roles revalidava e
 * isLoading voltava a `true`, fazendo cards (ex.: "Próxima cobrança" em
 * /dashboard/assinatura) e os cadeados do menu piscarem.
 *
 * Revalidação em segundo plano NÃO pode ser reportada como loading.
 */

vi.mock("@/integrations/supabase/client", () => {
  const session = { user: { id: "user-1" } };
  return {
    supabase: {
      auth: {
        getSession: async () => ({ data: { session } }),
        getUser: async () => ({ data: { user: session.user } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      },
      from: (table: string) =>
        table === "user_roles"
          ? {
              select: () => ({
                // resposta lenta de propósito: expõe a janela de revalidação
                eq: () =>
                  new Promise((res) => setTimeout(() => res({ data: [], error: null }), 30)),
              }),
            }
          : {
              select: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({
                        data: { plano: "presenca", status: "trial", ciclo_contratado: "mensal" },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            },
    },
  };
});

import { useUserRole } from "./useUserRole";
import { useSubscriptionStatus } from "./useSubscriptionStatus";

const flush = (ms = 200) =>
  act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });

describe("revalidação de sessão ao voltar o foco da janela", () => {
  it("não volta ao estado de loading depois da primeira carga", async () => {
    const seen: string[] = [];

    function Probe() {
      const role = useUserRole();
      const sub = useSubscriptionStatus();
      seen.push(`${role.isLoading}|${sub.isLoading}`);
      return null;
    }

    render(
      <QueryClientProvider client={new QueryClient()}>
        <Probe />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(seen[seen.length - 1]).toBe("false|false"));

    // simula sair e voltar para a aba várias vezes
    seen.length = 0;
    for (let i = 0; i < 3; i++) {
      act(() => {
        focusManager.setFocused(false);
        focusManager.setFocused(true);
      });
      await flush();
    }

    expect(seen.every((s) => s === "false|false")).toBe(true);
    focusManager.setFocused(undefined);
  });
});
