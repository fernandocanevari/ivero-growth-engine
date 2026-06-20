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

describe("isFeatureAvailable", () => {
  it("admin sempre passa", () => {
    expect(isFeatureAvailable("/dashboard/simulador", null, false, true, false)).toBe(true);
    expect(isFeatureAvailable("/dashboard/relatorios", "presenca", false, true, false)).toBe(true);
  });

  it("rotas ALWAYS_ALLOWED liberadas mesmo sem plano", () => {
    expect(isFeatureAvailable("/dashboard", null, false, false, true)).toBe(true);
    expect(isFeatureAvailable("/dashboard/alertas", null, false, false, true)).toBe(true);
    expect(isFeatureAvailable("/dashboard/ajuda", "presenca", true, false, false)).toBe(true);
    expect(isFeatureAvailable("/dashboard/configuracoes", null, false, false, true)).toBe(true);
  });

  it("plano presenca bloqueia features de influencia e autoridade", () => {
    expect(isFeatureAvailable("/dashboard/dominancia", "presenca", true, false, false)).toBe(false);
    expect(isFeatureAvailable("/dashboard/simulador", "presenca", true, false, false)).toBe(false);
    expect(isFeatureAvailable("/dashboard/relatorios", "presenca", true, false, false)).toBe(false);
  });

  it("plano presenca libera features de presenca", () => {
    expect(isFeatureAvailable("/dashboard/score", "presenca", true, false, false)).toBe(true);
    expect(isFeatureAvailable("/dashboard/prompt-tester", "presenca", true, false, false)).toBe(true);
  });

  it("plano influencia libera presenca e influencia, bloqueia autoridade", () => {
    expect(isFeatureAvailable("/dashboard/score", "influencia", true, false, false)).toBe(true);
    expect(isFeatureAvailable("/dashboard/dominancia", "influencia", true, false, false)).toBe(true);
    expect(isFeatureAvailable("/dashboard/simulador", "influencia", true, false, false)).toBe(false);
  });

  it("plano autoridade libera tudo", () => {
    expect(isFeatureAvailable("/dashboard/relatorios", "autoridade", true, false, false)).toBe(true);
    expect(isFeatureAvailable("/dashboard/simulador", "autoridade", true, false, false)).toBe(true);
    expect(isFeatureAvailable("/dashboard/prompts", "autoridade", true, false, false)).toBe(true);
  });

  it("trial espelha o plano escolhido", () => {
    expect(isFeatureAvailable("/dashboard/dominancia", "influencia", false, false, true)).toBe(true);
    expect(isFeatureAvailable("/dashboard/simulador", "influencia", false, false, true)).toBe(false);
  });

  it("trial sem plano bloqueia features gated", () => {
    expect(isFeatureAvailable("/dashboard/score", null, false, false, true)).toBe(false);
  });

  it("sem plano e sem trial bloqueia", () => {
    expect(isFeatureAvailable("/dashboard/score", null, false, false, false)).toBe(false);
  });

  it("rota admin sempre bloqueada para não-admin", () => {
    expect(isFeatureAvailable("/dashboard/admin", "autoridade", true, false, false)).toBe(false);
    expect(isFeatureAvailable("/dashboard/admin/clientes", "autoridade", true, false, false)).toBe(false);
  });

  it("sub-rotas herdam tier do pai", () => {
    expect(getRequiredTier("/dashboard/campanhas/nova")).toBe("autoridade");
    expect(isFeatureAvailable("/dashboard/campanhas/nova", "presenca", true, false, false)).toBe(false);
    expect(isFeatureAvailable("/dashboard/campanhas/nova", "influencia", true, false, false)).toBe(false);
    expect(isFeatureAvailable("/dashboard/campanhas/nova", "autoridade", true, false, false)).toBe(true);
  });
});

describe("getRequiredTier", () => {
  it("retorna tier correto por rota", () => {
    expect(getRequiredTier("/dashboard/score")).toBe("presenca");
    expect(getRequiredTier("/dashboard/dominancia")).toBe("influencia");
    expect(getRequiredTier("/dashboard/simulador")).toBe("autoridade");
  });

  it("retorna null para rotas não mapeadas", () => {
    expect(getRequiredTier("/dashboard")).toBeNull();
    expect(getRequiredTier("/dashboard/alertas")).toBeNull();
  });
});

describe("tierLabel", () => {
  it("retorna nome legível", () => {
    expect(tierLabel("presenca")).toBe("Presença");
    expect(tierLabel("influencia")).toBe("Influência");
    expect(tierLabel("autoridade")).toBe("Autoridade");
  });
});
