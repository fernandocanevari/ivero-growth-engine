/**
 * Cache compartilhado do guarda de acesso (ProtectedRoute).
 *
 * Guarda a LINHA de assinatura (não o status): o status efetivo é sempre
 * derivado com a data atual (resolveEffectiveStatus), então um trial que
 * vence durante a sessão é pego na navegação seguinte sem nova consulta.
 * O cache só é usado para LIBERAR rápido; qualquer bloqueio é decidido com
 * dados frescos do servidor, para ninguém com direito ficar preso por cache.
 */
import { supabase } from "@/integrations/supabase/client";
import { primeAccountType, clearAccountType } from "@/hooks/useAccountType";

export type SubRow = {
  status: string | null;
  carencia_ate: string | null;
  trial_ends_at: string | null;
  data_vencimento?: string | null;
  updated_at: string | null;
  asaas_checkout_id?: string | null;
  asaas_checkout_created_at?: string | null;
};

export type AccessEntry = {
  userId: string;
  isAdmin: boolean;
  isAgency: boolean;
  sub: SubRow | null;
  fetchedAt: number;
};

/** Esperas só para cadastro recém-criado (linha de assinatura ainda invisível). */
export const RETRY_DELAYS_MS = [400, 800, 1200];

let entry: AccessEntry | null = null;
let generation = 0;

export function getCachedAccess(userId?: string | null): AccessEntry | null {
  if (!entry) return null;
  if (userId && entry.userId !== userId) return null;
  return entry;
}

/** Pagamento, troca de plano, cancelamento, retorno do Asaas e logout. */
export function invalidateAccessCache() {
  entry = null;
  generation++;
}

/** Logout / troca de usuário: limpa também o tipo de conta em memória. */
export function resetAccessForUser(userId: string | null) {
  if (!userId || (entry && entry.userId !== userId)) {
    invalidateAccessCache();
    clearAccountType();
  }
}

async function fetchSub(userId: string): Promise<SubRow | null> {
  const { data } = await supabase
    .from("assinaturas")
    .select("status, carencia_ate, trial_ends_at, data_vencimento, updated_at, asaas_checkout_id, asaas_checkout_created_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1);
  return ((data as SubRow[] | null) ?? [])[0] ?? null;
}

/**
 * Busca fresca: perfil, papel e assinatura em paralelo. Retry só quando a
 * consulta de assinatura volta com ZERO linhas.
 */
export async function fetchAccess(
  userId: string,
  opts: { isCancelled?: () => boolean; sleep?: (ms: number) => Promise<void> } = {},
): Promise<AccessEntry | null> {
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const gen = generation;
  const [profRes, rolesRes, firstSub] = await Promise.all([
    Promise.resolve(
      supabase.from("profiles").select("account_type, nome_empresa").eq("user_id", userId).maybeSingle(),
    ).catch(() => ({ data: null })),
    Promise.resolve(supabase.from("user_roles").select("role").eq("user_id", userId)).catch(() => ({ data: [] })),
    fetchSub(userId).catch(() => null),
  ]);
  const prof = (profRes as { data: { account_type?: string; nome_empresa?: string | null } | null }).data;
  const isAgency = prof?.account_type === "agency";
  const roles = ((rolesRes as { data: { role: string }[] | null }).data ?? []) as { role: string }[];
  const isAdmin = roles.some((r) => r.role === "admin");
  primeAccountType(userId, isAgency ? "agency" : "individual", prof?.nome_empresa ?? null);

  let sub = firstSub;
  if (!sub && !isAdmin) {
    for (let i = 0; i < RETRY_DELAYS_MS.length && !sub; i++) {
      console.log(`[ProtectedRoute] Nenhuma linha de assinatura. Nova tentativa em ${RETRY_DELAYS_MS[i]}ms (${i + 1}/${RETRY_DELAYS_MS.length})...`);
      await sleep(RETRY_DELAYS_MS[i]);
      if (opts.isCancelled?.()) return null;
      sub = await fetchSub(userId).catch(() => null);
    }
  }
  const next: AccessEntry = { userId, isAdmin, isAgency, sub, fetchedAt: Date.now() };
  // Só grava se ninguém invalidou no meio (ex.: pagamento confirmado).
  if (gen === generation) entry = next;
  return next;
}
