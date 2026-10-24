import { describe, it, expect } from "vitest";
import { decideAccess } from "@/lib/access-decision";
import { resolveEffectiveStatus } from "@/lib/subscription-status";
import { overdueBlockedText, overdueGraceText, overdueNextChargeText } from "@/lib/overdue-copy";

// Vencimento 10/10/2026; tolerância até 13/10 23:59:59.999 em Brasília.
const CARENCIA = "2026-10-14T02:59:59.999Z";
const row = (status = "inadimplente") => ({ status, trial_ends_at: null, carencia_ate: CARENCIA, updated_at: CARENCIA });
const at = (iso: string) => new Date(iso);
const access = (now: string, status?: string) =>
  decideAccess({ isAdmin: false, isAgency: false, sub: row(status) as never }, "/dashboard/score", at(now));

describe("linha do tempo da mensalidade vencida (vencimento dia 10)", () => {
  it("dia 0 (10/10): acesso normal", () => expect(access("2026-10-10T15:00:00Z").kind).toBe("allow"));
  it("dia 1 (11/10): acesso normal", () => expect(access("2026-10-11T15:00:00Z").kind).toBe("allow"));
  it("dia 3 (13/10 23:59 Brasília): acesso normal", () => expect(access("2026-10-14T02:59:00Z").kind).toBe("allow"));
  it("dia 4 (14/10 00:00 Brasília): pausado, vai para a tela de cobrança", () =>
    expect(access("2026-10-14T03:00:00Z")).toEqual({ kind: "block", to: "/dashboard/assinatura" }));
  it("dia 10: continua pausado na tela de cobrança", () =>
    expect(access("2026-10-20T15:00:00Z")).toEqual({ kind: "block", to: "/dashboard/assinatura" }));
  it("pausado ainda abre a tela de cobrança", () =>
    expect(decideAccess({ isAdmin: false, isAgency: false, sub: row() as never }, "/dashboard/assinatura", at("2026-10-20T15:00:00Z")).kind).toBe("allow"));
  it("carência nula = pausado", () =>
    expect(decideAccess({ isAdmin: false, isAgency: false, sub: { ...row(), carencia_ate: null } as never }, "/dashboard/score", at("2026-10-11T15:00:00Z"))).toEqual({ kind: "block", to: "/dashboard/assinatura" }));
  it("'atrasado' antigo vale como inadimplente", () => {
    expect(resolveEffectiveStatus({ status: "atrasado" })).toBe("inadimplente");
    expect(access("2026-10-11T15:00:00Z", "atrasado").kind).toBe("allow");
  });
  it("status desconhecido bloqueia na tela de cobrança", () =>
    expect(access("2026-10-11T15:00:00Z", "xpto")).toEqual({ kind: "block", to: "/dashboard/assinatura" }));
});

describe("textos da mensalidade vencida", () => {
  it("tolerância", () =>
    expect(overdueGraceText(497, "2026-10-10", CARENCIA)).toBe(
      "Não conseguimos cobrar sua mensalidade de R$ 497, que venceu em 10/10. Seu acesso continua normal até 13/10. Atualize o pagamento agora para não ter interrupção.",
    ));
  it("pausado", () =>
    expect(overdueBlockedText(497, CARENCIA)).toBe(
      "Seu acesso está pausado desde 14/10 porque a mensalidade de R$ 497 não foi paga. Pague agora e tudo volta ao normal na hora.",
    ));
  it("card de cobrança", () => expect(overdueNextChargeText(497, "2026-10-10")).toBe("Mensalidade vencida em 10/10 · R$ 497"));
});
