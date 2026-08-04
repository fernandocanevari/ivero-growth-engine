import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Sessão que resolve só quando chamarmos resolveSession() — permite inspecionar
// a janela "antes do primeiro fetch", onde isLoading precisa ser true.
let resolveSession: (v: unknown) => void = () => {};
const sessionPromise = new Promise((resolve) => {
  resolveSession = resolve;
});

type Listener = (event: string, session: unknown) => void;
const listeners: Listener[] = [];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: () => sessionPromise,
      getUser: () => sessionPromise,
      onAuthStateChange: (cb: Listener) => {
        listeners.push(cb);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
          }),
          then: (cb: (v: unknown) => unknown) => cb({ data: [], error: null }),
        }),
      }),
    }),
  },
}));

import { useUserRole } from "./useUserRole";
import { useSubscriptionStatus } from "./useSubscriptionStatus";

function Probe() {
  const role = useUserRole();
  const sub = useSubscriptionStatus();
  return (
    <div>
      <span data-testid="role">{String(role.isLoading)}</span>
      <span data-testid="sub">{String(sub.isLoading)}</span>
    </div>
  );
}

describe("janela de loading antes da sessão resolver", () => {
  it("isLoading é true antes do userId resolver e false depois", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Probe />
      </QueryClientProvider>,
    );

    expect(screen.getByTestId("role").textContent).toBe("true");
    expect(screen.getByTestId("sub").textContent).toBe("true");

    // INITIAL_SESSION sem sessão (emitido pelo supabase-js antes da recuperação)
    // NÃO pode marcar o estado como resolvido — era a origem dos flashes.
    act(() => {
      listeners.forEach((cb) => cb("INITIAL_SESSION", null));
    });
    expect(screen.getByTestId("role").textContent).toBe("true");
    expect(screen.getByTestId("sub").textContent).toBe("true");

    resolveSession({ data: { session: null, user: null } });

    await waitFor(() => {
      expect(screen.getByTestId("role").textContent).toBe("false");
      expect(screen.getByTestId("sub").textContent).toBe("false");
    });
  });
});
