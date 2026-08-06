import { describe, it, expect } from "vitest";
import {
  resolveEffectiveStatus,
  isTrialExpired,
  isTrialEndingSoon,
  trialDaysLeft,
  trialHoursLeft,
  isAccountRoute,
} from "@/lib/subscription-status";

const NOW = new Date("2026-08-06T18:00:00Z");
const iso = (offsetHours: number) =>
  new Date(NOW.getTime() + offsetHours * 3_600_000).toISOString();

describe("resolveEffectiveStatus", () => {
  it("retorna sem_assinatura quando não há linha", () => {
    expect(resolveEffectiveStatus(null, NOW)).toBe("sem_assinatura");
  });

  it("mantém trial válido quando trial_ends_at é futuro", () => {
    expect(
      resolveEffectiveStatus({ status: "trial", trial_ends_at: iso(72) }, NOW),
    ).toBe("trial");
  });

  it("deriva trial_expirado quando trial_ends_at já passou (Cliente 30)", () => {
    expect(
      resolveEffectiveStatus(
        { status: "trial", trial_ends_at: "2026-07-31T00:46:15Z" },
        NOW,
      ),
    ).toBe("trial_expirado");
  });

  it("trata status 'expirado' do cron como trial_expirado", () => {
    expect(resolveEffectiveStatus({ status: "expirado" }, NOW)).toBe("trial_expirado");
  });

  it("nunca reaproveita 'cancelado' para trial vencido", () => {
    expect(resolveEffectiveStatus({ status: "cancelado" }, NOW)).toBe("cancelado");
  });

  it("trial sem trial_ends_at permanece trial", () => {
    expect(resolveEffectiveStatus({ status: "trial", trial_ends_at: null }, NOW)).toBe(
      "trial",
    );
  });

  it("preserva ativo, inadimplente e pendente", () => {
    expect(resolveEffectiveStatus({ status: "ativo", trial_ends_at: iso(-999) }, NOW)).toBe("ativo");
    expect(resolveEffectiveStatus({ status: "inadimplente" }, NOW)).toBe("inadimplente");
    expect(resolveEffectiveStatus({ status: "pendente" }, NOW)).toBe("pendente");
  });

  it("status desconhecido não vira trial silenciosamente", () => {
    expect(resolveEffectiveStatus({ status: "xpto" }, NOW)).toBe("desconhecido");
  });
});

describe("helpers de tempo do trial", () => {
  it("isTrialExpired é falso sem data e verdadeiro no passado", () => {
    expect(isTrialExpired(null, NOW)).toBe(false);
    expect(isTrialExpired(iso(-1), NOW)).toBe(true);
    expect(isTrialExpired(iso(1), NOW)).toBe(false);
  });

  it("isTrialEndingSoon cobre só as últimas 48h", () => {
    expect(isTrialEndingSoon(iso(72), NOW)).toBe(false);
    expect(isTrialEndingSoon(iso(47), NOW)).toBe(true);
    expect(isTrialEndingSoon(iso(-1), NOW)).toBe(false);
  });

  it("dias/horas restantes nunca são negativos", () => {
    expect(trialDaysLeft(iso(-100), NOW)).toBe(0);
    expect(trialHoursLeft(iso(-100), NOW)).toBe(0);
    expect(trialDaysLeft(iso(72), NOW)).toBe(3);
    expect(trialDaysLeft(iso(2), NOW)).toBe(1);
  });
});

describe("isAccountRoute", () => {
  it("libera assinatura, configurações e ajuda", () => {
    expect(isAccountRoute("/dashboard/assinatura")).toBe(true);
    expect(isAccountRoute("/dashboard/configuracoes/")).toBe(true);
    expect(isAccountRoute("/dashboard/ajuda")).toBe(true);
  });

  it("não libera rotas de produto", () => {
    expect(isAccountRoute("/dashboard")).toBe(false);
    expect(isAccountRoute("/dashboard/score")).toBe(false);
  });
});
