// Nomes de exibição dos planos (texto visto pelo cliente no Asaas).
export const PLAN_DISPLAY_NAMES: Record<string, string> = {
  presenca: "Presença",
  influencia: "Influência",
  autoridade: "Autoridade",
};

/** Código conhecido → nome acentuado; vazio → "—"; outro → 1ª letra maiúscula. */
export function planDisplayName(plano: string | null | undefined): string {
  if (!plano) return "—";
  return PLAN_DISPLAY_NAMES[plano] ?? plano.charAt(0).toUpperCase() + plano.slice(1);
}
