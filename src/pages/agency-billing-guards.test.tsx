import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import {
  blockedRedirectFor,
  isAgencyAccountRoute,
  isAccountRoute,
  AGENCY_BILLING_ROUTE,
} from "@/lib/subscription-status";

vi.mock("@/integrations/supabase/client", () => {
  const q: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "limit"]) q[m] = () => q;
  q.maybeSingle = async () => ({ data: { account_type: "agency" } });
  q.then = (r: (v: unknown) => unknown) => r({ data: [] });
  return {
    supabase: {
      auth: { getSession: async () => ({ data: { session: { user: { id: "u1", email: "a@x.com", user_metadata: {} } } } }) },
      from: () => q,
      functions: { invoke: vi.fn() },
    },
  };
});

import EscolherPlanoPage from "./EscolherPlanoPage";
import { activateBlockReason } from "./dashboard/AgencyBillingPage";

describe("rotas de conta da agência", () => {
  it("marcas e faturamento são rotas de conta só para agência", () => {
    expect(isAgencyAccountRoute("/dashboard/marcas")).toBe(true);
    expect(isAgencyAccountRoute("/dashboard/marcas/assinatura/")).toBe(true);
    expect(isAgencyAccountRoute("/dashboard/assinatura")).toBe(true);
    expect(isAgencyAccountRoute("/dashboard/score")).toBe(false);
    expect(isAccountRoute("/dashboard/marcas")).toBe(false);
  });
  it("destino do bloqueio", () => {
    expect(blockedRedirectFor(true, "/escolher-plano?motivo=trial_expirado")).toBe(AGENCY_BILLING_ROUTE);
    expect(blockedRedirectFor(false, "/escolher-plano?motivo=trial_expirado")).toBe("/escolher-plano?motivo=trial_expirado");
  });
});

describe("/escolher-plano em conta de agência", () => {
  it("redireciona ao faturamento da agência", async () => {
    render(
      <MemoryRouter initialEntries={["/escolher-plano?motivo=trial_expirado"]}>
        <Routes>
          <Route path="/escolher-plano" element={<EscolherPlanoPage />} />
          <Route path={AGENCY_BILLING_ROUTE} element={<div>FATURAMENTO_AGENCIA</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("FATURAMENTO_AGENCIA")).toBeTruthy();
  });
});

describe("motivo do botão 'Ativar assinatura da agência'", () => {
  it("nenhuma marca cadastrada", () => {
    expect(activateBlockReason({ brandsCount: 0, semPlano: 0, busy: false })).toMatch(/Cadastre ao menos uma marca/);
  });
  it("marca sem plano escolhido", () => {
    expect(activateBlockReason({ brandsCount: 2, semPlano: 1, busy: false })).toMatch(/sem plano/);
    expect(activateBlockReason({ brandsCount: 3, semPlano: 2, busy: false })).toMatch(/2 marcas/);
  });
  it("abrindo o pagamento", () => {
    expect(activateBlockReason({ brandsCount: 1, semPlano: 0, busy: true })).toMatch(/Abrindo/);
  });
  it("habilitado sem motivo", () => {
    expect(activateBlockReason({ brandsCount: 1, semPlano: 0, busy: false })).toBeNull();
  });
});
