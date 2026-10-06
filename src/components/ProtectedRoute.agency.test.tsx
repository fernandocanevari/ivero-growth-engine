/**
 * Agência sem assinatura viva nunca cai no /escolher-plano individual:
 * marcas + faturamento ficam acessíveis; o resto vai a /dashboard/marcas/assinatura.
 * Individual segue indo ao /escolher-plano com o motivo.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

let accountType = "agency";
let subRow: Record<string, unknown> | null = null;

function chain(result: () => unknown) {
  const q: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "limit", "in", "not"]) q[m] = () => q;
  q.maybeSingle = async () => ({ data: result() });
  q.then = (res: (v: unknown) => unknown) => res({ data: result() });
  return q;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: "u1" } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: (t: string) =>
      chain(() =>
        t === "profiles" ? { account_type: accountType }
        : t === "user_roles" ? []
        : t === "assinaturas" ? (subRow ? [subRow] : [])
        : null,
      ),
  },
}));
vi.mock("@/lib/reconcile-pending", () => ({ reconcilePendingPayment: async () => {} }));

import { ProtectedRoute } from "./ProtectedRoute";
import { invalidateAccessCache } from "@/lib/access-cache";

const past = new Date(Date.now() - 864e5).toISOString();

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/dashboard/*" element={<ProtectedRoute><div>CONTEUDO_DASHBOARD</div></ProtectedRoute>} />
        <Route path="/escolher-plano" element={<div>ESCOLHER_PLANO</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  invalidateAccessCache();
  subRow = { status: "trial", trial_ends_at: past, carencia_ate: null, updated_at: past };
});

describe("Agência com trial vencido", () => {
  beforeEach(() => { accountType = "agency"; });

  it("acessa /dashboard/marcas", async () => {
    renderAt("/dashboard/marcas");
    expect(await screen.findByText("CONTEUDO_DASHBOARD", {}, { timeout: 5000 })).toBeTruthy();
  });

  it("acessa /dashboard/marcas/assinatura", async () => {
    renderAt("/dashboard/marcas/assinatura");
    expect(await screen.findByText("CONTEUDO_DASHBOARD", {}, { timeout: 5000 })).toBeTruthy();
  });

  it("status 'expirado' (rotina de normalização) também acessa as marcas", async () => {
    subRow = { status: "expirado", trial_ends_at: past, carencia_ate: null, updated_at: past };
    renderAt("/dashboard/marcas");
    expect(await screen.findByText("CONTEUDO_DASHBOARD", {}, { timeout: 5000 })).toBeTruthy();
  });

  it("outra rota vai ao faturamento da agência, nunca ao /escolher-plano", async () => {
    renderAt("/dashboard/score");
    // /dashboard/marcas/assinatura é rota de conta da agência → conteúdo liberado
    expect(await screen.findByText("CONTEUDO_DASHBOARD", {}, { timeout: 8000 })).toBeTruthy();
    expect(screen.queryByText("ESCOLHER_PLANO")).toBeNull();
  }, 10000);

  it("cancelado sem período pago também vai ao faturamento da agência", async () => {
    subRow = { status: "cancelado", trial_ends_at: null, carencia_ate: null, updated_at: past, data_vencimento: past };
    renderAt("/dashboard");
    expect(await screen.findByText("CONTEUDO_DASHBOARD", {}, { timeout: 8000 })).toBeTruthy();
    expect(screen.queryByText("ESCOLHER_PLANO")).toBeNull();
  }, 10000);
});

describe("Individual com trial vencido", () => {
  beforeEach(() => { accountType = "individual"; });

  it("segue indo ao /escolher-plano", async () => {
    renderAt("/dashboard/score");
    expect(await screen.findByText("ESCOLHER_PLANO", {}, { timeout: 8000 })).toBeTruthy();
  }, 10000);

  it("/dashboard/marcas não é rota de conta para individual", async () => {
    renderAt("/dashboard/marcas");
    expect(await screen.findByText("ESCOLHER_PLANO", {}, { timeout: 8000 })).toBeTruthy();
  }, 10000);
});
