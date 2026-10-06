/** Guarda de acesso: retry só sem linha, decisão sem flash, cache derivado da data atual. */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useNavigate } from "react-router-dom";

let accountType = "individual";
let isAdmin = false;
let subRow: Record<string, unknown> | null = null;
let subQueries = 0;
let hideSubUntilQuery = 0; // linha aparece só a partir da N-ésima consulta

function chain(t: string) {
  const q: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "limit"]) q[m] = () => q;
  const val = () => {
    if (t === "profiles") return { account_type: accountType, nome_empresa: null };
    if (t === "user_roles") return isAdmin ? [{ role: "admin" }] : [];
    subQueries++;
    return subRow && subQueries >= hideSubUntilQuery ? [subRow] : [];
  };
  q.maybeSingle = async () => ({ data: val() });
  q.then = (res: (v: unknown) => unknown) => res({ data: val() });
  return q;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: "u1" } } } }),
      getUser: async () => ({ data: { user: { id: "u1" } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: (t: string) => chain(t),
  },
}));
vi.mock("@/lib/reconcile-pending", () => ({ reconcilePendingPayment: async () => {} }));

import { ProtectedRoute } from "./ProtectedRoute";
import { invalidateAccessCache, fetchAccess } from "@/lib/access-cache";
import { decideAccess } from "@/lib/access-decision";
import { getKnownAccountType, useAccountType } from "@/hooks/useAccountType";

const past = new Date(Date.now() - 864e5).toISOString();
const future = new Date(Date.now() + 864e5).toISOString();
const renders: string[] = [];
const Page = ({ name }: { name: string }) => {
  renders.push(name);
  return <div>{name}</div>;
};

let nav: ((to: string) => void) | null = null;
const NavGrab = () => {
  nav = useNavigate();
  return null;
};

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <NavGrab />
      <Routes>
        <Route path="/dashboard/*" element={<ProtectedRoute><Page name="PROTEGIDA" /></ProtectedRoute>} />
        <Route path="/escolher-plano" element={<div>ESCOLHER_PLANO</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  invalidateAccessCache();
  accountType = "individual";
  isAdmin = false;
  subQueries = 0;
  hideSubUntilQuery = 0;
  renders.length = 0;
  subRow = { status: "trial", trial_ends_at: future, carencia_ate: null, updated_at: past };
});

describe("Retry", () => {
  it("cadastro novo com linha atrasada continua entrando (retry preservado)", async () => {
    hideSubUntilQuery = 3; // 1ª e 2ª consultas sem linha
    renderAt("/dashboard/score");
    expect(await screen.findByText("PROTEGIDA", {}, { timeout: 4000 })).toBeTruthy();
    expect(subQueries).toBe(3);
  });

  it("individual com trial vencido redireciona sem esperas (1 consulta)", async () => {
    subRow = { status: "trial", trial_ends_at: past, carencia_ate: null, updated_at: past };
    const t0 = Date.now();
    renderAt("/dashboard/score");
    expect(await screen.findByText("ESCOLHER_PLANO", {}, { timeout: 1000 })).toBeTruthy();
    const ms = Date.now() - t0;
    console.log(`[teste] trial vencido: ${subQueries} consulta(s), ${ms}ms`);
    expect(subQueries).toBe(1);
    expect(ms).toBeLessThan(400);
    expect(renders).not.toContain("PROTEGIDA");
  });

  it("fetchAccess: com linha bloqueante não dorme", async () => {
    subRow = { status: "cancelado", trial_ends_at: null, carencia_ate: null, updated_at: past, data_vencimento: past };
    const sleep = vi.fn(async () => {});
    await fetchAccess("u1", { sleep });
    expect(sleep).not.toHaveBeenCalled();
  });
});

describe("Sem flash da página protegida", () => {
  it("agência com trial vencido: outra rota vai ao faturamento sem renderizar a página", async () => {
    accountType = "agency";
    subRow = { status: "trial", trial_ends_at: past, carencia_ate: null, updated_at: past };
    render(
      <MemoryRouter initialEntries={["/dashboard/score"]}>
        <Routes>
          <Route path="/dashboard/marcas/assinatura" element={<div>FATURAMENTO</div>} />
          <Route path="/dashboard/*" element={<ProtectedRoute><Page name="PROTEGIDA" /></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("FATURAMENTO")).toBeTruthy();
    expect(renders).not.toContain("PROTEGIDA");
  });

  it("navegação interna para rota bloqueada nunca renderiza a página, nem por um frame", async () => {
    accountType = "agency";
    subRow = { status: "trial", trial_ends_at: past, carencia_ate: null, updated_at: past };
    render(
      <MemoryRouter initialEntries={["/dashboard/marcas"]}>
        <NavGrab />
        <Routes>
          <Route path="/dashboard/marcas" element={<ProtectedRoute><Page name="MARCAS" /></ProtectedRoute>} />
          <Route path="/dashboard/score" element={<ProtectedRoute><Page name="SCORE" /></ProtectedRoute>} />
          <Route path="/dashboard/marcas/assinatura" element={<div>FATURAMENTO</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("MARCAS")).toBeTruthy();
    await act(async () => nav!("/dashboard/score"));
    expect(await screen.findByText("FATURAMENTO")).toBeTruthy();
    expect(renders).not.toContain("SCORE");
  });

  it("trial que vence durante a sessão é bloqueado na navegação seguinte", async () => {
    const soon = new Date(Date.now() + 60_000).toISOString();
    subRow = { status: "trial", trial_ends_at: soon, carencia_ate: null, updated_at: past };
    renderAt("/dashboard/score");
    expect(await screen.findByText("PROTEGIDA")).toBeTruthy();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 120_000);
    renders.length = 0;
    await act(async () => nav!("/dashboard/pilares"));
    vi.useRealTimers();
    expect(await screen.findByText("ESCOLHER_PLANO")).toBeTruthy();
    expect(renders).not.toContain("PROTEGIDA");
  });
});

describe("Liberados (decisão pura)", () => {
  const base = { isAdmin: false, isAgency: false };
  it("ativo", () => {
    expect(decideAccess({ ...base, sub: { status: "ativo", trial_ends_at: null, carencia_ate: null, updated_at: past } }, "/dashboard/score").kind).toBe("allow");
  });
  it("pendente com checkout recente", () => {
    const d = decideAccess({ ...base, sub: { status: "pendente", trial_ends_at: null, carencia_ate: null, updated_at: past, asaas_checkout_id: "c", asaas_checkout_created_at: new Date().toISOString() } }, "/dashboard/score");
    expect(d.kind).toBe("allow");
  });
  it("inadimplente em carência", () => {
    const d = decideAccess({ ...base, sub: { status: "inadimplente", trial_ends_at: null, carencia_ate: future, updated_at: past } }, "/dashboard/score");
    expect(d.kind === "allow" && d.gate.isInGracePeriod).toBe(true);
  });
  it("admin sem assinatura", () => {
    expect(decideAccess({ isAdmin: true, isAgency: false, sub: null }, "/dashboard/score").kind).toBe("allow");
  });
  it("rota de conta com trial vencido", () => {
    expect(decideAccess({ ...base, sub: { status: "trial", trial_ends_at: past, carencia_ate: null, updated_at: past } }, "/dashboard/assinatura").kind).toBe("allow");
  });
  it("redirecionamentos com motivo preservados", () => {
    const s = (o: Record<string, unknown>) => ({ trial_ends_at: null, carencia_ate: null, updated_at: past, ...o }) as never;
    expect(decideAccess({ ...base, sub: s({ status: "inadimplente", carencia_ate: past }) }, "/dashboard")).toEqual({ kind: "block", to: "/escolher-plano?motivo=inadimplente" });
    expect(decideAccess({ ...base, isAgency: true, sub: s({ status: "cancelado" }) }, "/dashboard")).toEqual({ kind: "block", to: "/dashboard/marcas/assinatura" });
  });
});

describe("Tipo de conta em memória", () => {
  it("o guarda preenche o tipo antes de liberar: menu de agência sem salto", async () => {
    accountType = "agency";
    await fetchAccess("u1");
    expect(getKnownAccountType()?.accountType).toBe("agency");
    let first: boolean | null = null;
    const Probe = () => {
      const { isAgency, isLoading } = useAccountType();
      if (first === null) first = isAgency && !isLoading;
      return null;
    };
    render(<Probe />);
    expect(first).toBe(true);
  });
});
