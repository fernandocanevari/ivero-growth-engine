/**
 * Textos do cancelamento durante o teste grátis. Para assinatura paga as
 * funções devolvem null e a tela mantém os textos de sempre.
 * Datas em DD/MM no fuso de São Paulo.
 */

/** Cancelamento não confirmado no provedor (HTTP 502, code "cancel_unverified"). */
export const CANCEL_UNVERIFIED_MESSAGE =
  "Não conseguimos confirmar o cancelamento agora e, por isso, nada foi alterado. Tente de novo em instantes.";

export function formatDiaMesSP(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
  }).format(d);
}

/** Antes de cancelar: a linha ainda está no teste grátis, sem pagamento contado. */
export function isTrialBeforeCancel(effectiveStatus: string | null | undefined, ciclosPagos: number): boolean {
  return (effectiveStatus === "trial" || effectiveStatus === "trial_expirado") && ciclosPagos === 0;
}

/** Depois de cancelar: o fim do acesso coincide com o fim do teste e nada foi pago. */
export function isCancelledTrial(args: {
  status: string | null | undefined;
  ciclosPagos: number;
  trialEndsAt: string | null | undefined;
  accessUntil: string | null | undefined;
}): boolean {
  if (args.status !== "cancelado" || args.ciclosPagos !== 0) return false;
  if (!args.trialEndsAt || !args.accessUntil) return false;
  const a = new Date(args.trialEndsAt).getTime();
  const b = new Date(args.accessUntil).getTime();
  return !Number.isNaN(a) && a === b;
}

const trialStillRunning = (trialEndsAt: string | null | undefined, now: Date) => {
  if (!trialEndsAt) return false;
  const ms = new Date(trialEndsAt).getTime();
  return !Number.isNaN(ms) && ms > now.getTime();
};

/** Corpo do diálogo de confirmação. null = assinatura paga (texto de sempre). */
export function cancelDialogTrialCopy(
  isTrial: boolean,
  trialEndsAt: string | null | undefined,
  now: Date = new Date(),
): string | null {
  if (!isTrial) return null;
  return trialStillRunning(trialEndsAt, now)
    ? `Tudo bem, a gente entende. Seu teste grátis continua até ${formatDiaMesSP(trialEndsAt)} e nada será cobrado.`
    : "Tudo bem, a gente entende. Seu teste grátis termina hoje e nada será cobrado.";
}

/** Aviso após cancelar. null = assinatura paga (texto de sempre). */
export function cancelToastTrialCopy(
  response: { isTrial?: boolean; endsNow?: boolean; accessUntil?: string | null } | null | undefined,
): { title: string; description: string } | null {
  if (!response?.isTrial) return null;
  return {
    title: "Assinatura cancelada",
    description:
      response.endsNow || !response.accessUntil
        ? "Seu teste grátis termina hoje. Nada será cobrado."
        : `Seu teste grátis continua até ${formatDiaMesSP(response.accessUntil)}. Nada será cobrado.`,
  };
}

/** Linha do card "Plano atual" após cancelar. null = assinatura paga (texto de sempre). */
export function cancelledCardTrialCopy(isTrial: boolean, accessUntil: string | null | undefined): string | null {
  if (!isTrial || !accessUntil) return null;
  return `Cancelada — seu teste grátis vai até ${formatDiaMesSP(accessUntil)}.`;
}
