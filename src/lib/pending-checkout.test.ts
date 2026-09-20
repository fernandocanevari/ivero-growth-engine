import { describe, it, expect } from "vitest";
import {
  isRecentPendingCheckout,
  isStalePendingCheckout,
  resolveEffectiveStatus,
} from "@/lib/subscription-status";

const NOW = new Date("2026-09-20T20:00:00Z");
const minutesAgo = (m: number) =>
  new Date(NOW.getTime() - m * 60_000).toISOString();

const pendente = (checkoutMinutesAgo: number | null, checkoutId = "chk_1") => ({
  status: "pendente",
  asaas_checkout_id: checkoutId,
  asaas_checkout_created_at:
    checkoutMinutesAgo === null ? null : minutesAgo(checkoutMinutesAgo),
});

describe("janela de tolerância pós-checkout", () => {
  it("checkout de 5 min atrás libera o acesso", () => {
    expect(isRecentPendingCheckout(pendente(5), NOW)).toBe(true);
  });

  it("checkout de 29 min ainda está na janela; 31 min não", () => {
    expect(isRecentPendingCheckout(pendente(29), NOW)).toBe(true);
    expect(isRecentPendingCheckout(pendente(31), NOW)).toBe(false);
  });

  it("pendente sem checkout registrado não recebe tolerância", () => {
    expect(isRecentPendingCheckout(pendente(null), NOW)).toBe(false);
    expect(isRecentPendingCheckout({ status: "pendente" }, NOW)).toBe(false);
  });

  it("status pago/trial nunca entra na janela", () => {
    expect(isRecentPendingCheckout({ status: "ativo", ...pendente(5) }, NOW)).toBe(false);
    expect(
      isRecentPendingCheckout({ status: "trial", trial_ends_at: minutesAgo(-100) }, NOW),
    ).toBe(false);
  });
});

describe("checkout abandonado", () => {
  it("menos de 1h não é considerado abandonado", () => {
    expect(isStalePendingCheckout(pendente(45), NOW)).toBe(false);
  });

  it("mais de 1h é abandonado", () => {
    expect(isStalePendingCheckout(pendente(90), NOW)).toBe(true);
  });

  it("conta presa há dias é abandonada", () => {
    expect(isStalePendingCheckout(pendente(60 * 24 * 8), NOW)).toBe(true);
  });

  it("recente e abandonado são mutuamente exclusivos", () => {
    for (const m of [1, 10, 29, 31, 59, 61, 500]) {
      const row = pendente(m);
      expect(isRecentPendingCheckout(row, NOW) && isStalePendingCheckout(row, NOW)).toBe(
        false,
      );
    }
  });
});

describe("fim do ping-pong de redirect", () => {
  // Regra: pendente recente vai para /dashboard (sem bloqueio);
  // pendente antigo permanece em /escolher-plano (nada de redirect de volta).
  const destino = (row: Parameters<typeof isRecentPendingCheckout>[0]) => {
    const effective = resolveEffectiveStatus(row, NOW);
    if (effective === "pendente") {
      return isRecentPendingCheckout(row, NOW) ? "/dashboard" : "ficar";
    }
    if (effective === "trial_expirado") return "ficar";
    return effective === "ativo" || effective === "trial"
      ? "/dashboard"
      : "/dashboard/assinatura";
  };

  it("pendente recente entra no app", () => {
    expect(destino(pendente(3))).toBe("/dashboard");
  });

  it("pendente antigo não é devolvido para assinatura", () => {
    expect(destino(pendente(60 * 24 * 8))).toBe("ficar");
  });

  it("pagamento confirmado segue para o app", () => {
    expect(destino({ status: "ativo" })).toBe("/dashboard");
  });
});
