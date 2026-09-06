import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Regressão: navegar entre os itens de "Visão Geral" desmonta e remonta a
 * página. Antes, o primeiro render da tela revisitada não tinha dados e
 * também não se dizia "carregando" → o estado vazio/skeleton piscava.
 */

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: () =>
        new Promise((r) => setTimeout(() => r({ data: { user: { id: "u1" } } }), 5)),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          order: async () => ({
            data: [{ id: "a", user_id: "u1", overall_score: 70 }],
            error: null,
          }),
        }),
      }),
    }),
  },
}));
vi.mock("@/lib/mutation-toast", () => ({ mutationErrorToast: () => () => {} }));
vi.mock("@/hooks/use-toast", () => ({ toast: () => {} }));

import { useAuditReports } from "./useAuditReports";

describe("cache entre navegações do dashboard", () => {
  it("ao remontar, nenhum quadro mostra 'sem dados' fora de carregamento", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const frames: string[] = [];

    function Probe() {
      const { reports, isLoading } = useAuditReports();
      frames.push(`${reports.length}|${isLoading}`);
      return null;
    }

    const tree = (
      <QueryClientProvider client={client}>
        <Probe />
      </QueryClientProvider>
    );

    const first = render(tree);
    await waitFor(() => expect(frames[frames.length - 1]).toBe("1|false"));
    first.unmount();

    frames.length = 0;
    const second = render(tree);
    await waitFor(() => expect(frames[frames.length - 1]).toBe("1|false"));

    // Nenhum quadro com 0 registros e isLoading=false (o "flash" do vazio).
    expect(frames.filter((f) => f === "0|false")).toEqual([]);
    second.unmount();
  });
});
