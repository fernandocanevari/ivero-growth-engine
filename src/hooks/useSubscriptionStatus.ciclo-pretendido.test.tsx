import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const ROW: { value: Record<string, unknown> } = { value: {} };
const selects: string[] = [];
vi.mock("./useUserRole", () => ({ useUserRole: () => ({ isAdmin: false, isLoading: false }) }));
vi.mock("@/lib/brand-scope", () => ({ getBrandScope: async () => null, subscribeBrandScope: () => () => {} }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: { id: "u1" } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      select: (cols: string) => {
        selects.push(cols);
        return { eq: () => ({ order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: ROW.value, error: null }) }) }) }) };
      },
    }),
  },
}));
import { useSubscriptionStatus } from "./useSubscriptionStatus";

function Probe() {
  const s = useSubscriptionStatus();
  return <span data-testid="c">{s.isLoading ? "loading" : String(s.cicloPretendido)}</span>;
}

describe("useSubscriptionStatus.cicloPretendido", () => {
  for (const [raw, expected] of [["anual", "anual"], ["mensal", "mensal"], [null, "null"], ["outro", "null"]] as const) {
    it(`${raw} → ${expected}`, async () => {
      ROW.value = { plano: "presenca", status: "trial", ciclo_contratado: "mensal", ciclo_pretendido: raw };
      render(<Probe />);
      await waitFor(() => expect(screen.getByTestId("c").textContent).toBe(expected));
      expect(selects.at(-1)).toContain("ciclo_pretendido");
    });
  }
});
