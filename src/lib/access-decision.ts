/** Decisão pura do guarda de acesso (mesmas regras do ProtectedRoute anterior). */
import {
  cancelAccessUntil,
  resolveEffectiveStatus,
  isAccountRoute,
  isAgencyAccountRoute,
  blockedRedirectFor,
  isRecentPendingCheckout,
} from "@/lib/subscription-status";
import type { AccessEntry } from "@/lib/access-cache";

export type Gate = {
  isInGracePeriod: boolean;
  status: string | null;
  carenciaAte: string | null;
  isPendingCheckout?: boolean;
};

export type AccessDecision =
  | { kind: "allow"; gate: Gate; reconcile: boolean }
  | { kind: "block"; to: string };

export function decideAccess(
  e: Pick<AccessEntry, "isAdmin" | "isAgency" | "sub">,
  pathname: string,
  now: Date = new Date(),
): AccessDecision {
  if (e.isAdmin) {
    return { kind: "allow", gate: { isInGracePeriod: false, status: "admin", carenciaAte: null }, reconcile: false };
  }
  const sub = e.sub;
  const status = sub ? resolveEffectiveStatus(sub, now) : null;
  const carenciaAte = sub?.carencia_ate ?? null;
  const block = (target: string): AccessDecision => ({ kind: "block", to: blockedRedirectFor(e.isAgency, target) });
  const allow = (gate: Gate, reconcile = false): AccessDecision => ({ kind: "allow", gate, reconcile });

  const pendingRecente = isRecentPendingCheckout(sub ?? null, now);
  const accountRoute = e.isAgency ? isAgencyAccountRoute(pathname) : !!sub && isAccountRoute(pathname);
  if (accountRoute) {
    return allow(
      { isInGracePeriod: status === "inadimplente", status, carenciaAte, isPendingCheckout: pendingRecente },
      pendingRecente,
    );
  }
  if (pendingRecente) return allow({ isInGracePeriod: false, status, carenciaAte, isPendingCheckout: true }, true);
  if (!sub || status === "pendente") return block("/escolher-plano");
  if (status === "trial_expirado") return block("/escolher-plano?motivo=trial_expirado");
  if (status === "ativo" || status === "trial") return allow({ isInGracePeriod: false, status, carenciaAte });
  if (status === "inadimplente") {
    const inGrace = carenciaAte ? new Date(carenciaAte).getTime() > now.getTime() : false;
    return inGrace
      ? allow({ isInGracePeriod: true, status, carenciaAte })
      : block("/escolher-plano?motivo=inadimplente");
  }
  if (status === "cancelado") {
    if (cancelAccessUntil(sub, now)) return allow({ isInGracePeriod: false, status, carenciaAte });
    return block("/escolher-plano?motivo=cancelado");
  }
  return block("/escolher-plano");
}
