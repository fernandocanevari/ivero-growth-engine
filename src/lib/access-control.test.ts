import { describe, it, expect } from "vitest";
import {
  isRouteAllowedInTrial,
  getLockedRouteInfo,
  TRIAL_ALLOWED_ROUTES,
  isFeatureAvailable,
  getRequiredTier,
  tierLabel,
} from "./access-control";

describe("isRouteAllowedInTrial", () => {
  it("libera rotas explicitamente permitidas", () => {
    for (const route of TRIAL_ALLOWED_ROUTES) {
      expect(isRouteAllowedInTrial(route)).toBe(true);
    }
  });

  it("bloqueia rotas premium", () => {
    expect(isRouteAllowedInTrial("/dashboard/monitoramento")).toBe(false);
    expect(isRouteAllowedInTrial("/dashboard/simulador")).toBe(false);
    expect(isRouteAllowedInTrial("/dashboard/prompts")).toBe(false);
  });

  it("bloqueia qualquer rota admin", () => {
    expect(isRouteAllowedInTrial("/dashboard/admin")).toBe(false);
    expect(isRouteAllowedInTrial("/dashboard/admin/clientes")).toBe(false);
    expect(isRouteAllowedInTrial("/dashboard/admin/leads")).toBe(false);
  });

  it("normaliza trailing slash", () => {
    expect(isRouteAllowedInTrial("/dashboard/score/")).toBe(true);
    expect(isRouteAllowedInTrial("/dashboard/")).toBe(true);
  });
});

describe("getLockedRouteInfo", () => {
  it("retorna info específica para rota mapeada", () => {
    const info = getLockedRouteInfo("/dashboard/simulador");
    expect(info.title).toMatch(/Simulador/i);
    expect(info.description.length).toBeGreaterThan(10);
  });

  it("faz fallback para rota pai em sub-rotas", () => {
    const info = getLockedRouteInfo("/dashboard/campanhas/nova");
    expect(info.title).toMatch(/Campanhas/i);
  });

  it("retorna fallback genérico para rota desconhecida", () => {
    const info = getLockedRouteInfo("/dashboard/rota-inexistente");
    expect(info.title).toBe("Recurso premium");
  });

  it("normaliza trailing slash", () => {
    const a = getLockedRouteInfo("/dashboard/simulador");
    const b = getLockedRouteInfo("/dashboard/simulador/");
    expect(a).toEqual(b);
  });
});
