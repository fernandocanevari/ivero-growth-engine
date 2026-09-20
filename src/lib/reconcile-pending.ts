import { supabase } from "@/integrations/supabase/client";

/**
 * Reconciliação sob demanda do pagamento pendente.
 *
 * O webhook do Asaas pode não chegar (sandbox, falha de rede, aba fechada no
 * checkout). Antes, `reconcile-asaas` só rodava no polling de /bem-vindo — quem
 * entrava direto no app ficava preso em "pendente" indefinidamente.
 *
 * A trava por sessão evita disparar a função a cada navegação.
 */
export type ReconcileResult = {
  reconciled?: boolean;
  expired?: boolean;
  status?: string;
  checkoutStatus?: string;
  error?: string;
} | null;

let inFlight: Promise<ReconcileResult> | null = null;
let lastRunAt = 0;

/** Intervalo mínimo entre disparos automáticos (não vale para o botão manual). */
const MIN_INTERVAL_MS = 30_000;

export async function reconcilePendingPayment(
  options: { force?: boolean } = {},
): Promise<ReconcileResult> {
  const { force = false } = options;
  if (inFlight) return inFlight;
  if (!force && Date.now() - lastRunAt < MIN_INTERVAL_MS) return null;

  inFlight = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke("reconcile-asaas");
      if (error) return { error: error.message };
      return (data as ReconcileResult) ?? null;
    } catch (err) {
      return { error: (err as Error).message };
    } finally {
      lastRunAt = Date.now();
      inFlight = null;
    }
  })();

  return inFlight;
}

/** Usado apenas nos testes para isolar a trava entre cenários. */
export function __resetReconcileLock() {
  inFlight = null;
  lastRunAt = 0;
}
