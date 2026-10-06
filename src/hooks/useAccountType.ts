import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AccountType = "individual" | "agency";

type Known = { userId: string; accountType: AccountType; agencyName: string | null };

/**
 * Tipo da conta logada (profiles.account_type), em cache compartilhado em
 * memória. O ProtectedRoute já preenche este cache antes de liberar o
 * dashboard, então o menu nasce com o tipo certo (sem "salto").
 * Store de módulo (não React Query): é usado em telas de onboarding que rodam
 * fora do QueryClientProvider em alguns testes.
 */
let known: Known | null = null;
let inflight: { userId: string; p: Promise<void> } | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function primeAccountType(userId: string, accountType: AccountType, agencyName: string | null) {
  if (known && known.userId === userId && known.accountType === accountType && known.agencyName === agencyName) return;
  known = { userId, accountType, agencyName };
  emit();
}

/** Logout / troca de usuário. */
export function clearAccountType() {
  if (!known && !inflight) return;
  known = null;
  inflight = null;
  emit();
}

export function getKnownAccountType(): Known | null {
  return known;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

async function load() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  if (known?.userId === user.id) return;
  if (inflight?.userId === user.id) return inflight.p;
  const p = (async () => {
    const { data } = await supabase
      .from("profiles")
      .select("account_type, nome_empresa")
      .eq("user_id", user.id)
      .maybeSingle();
    const row = data as { account_type?: string; nome_empresa?: string | null } | null;
    primeAccountType(user.id, row?.account_type === "agency" ? "agency" : "individual", row?.nome_empresa ?? null);
  })().finally(() => {
    inflight = null;
  });
  inflight = { userId: user.id, p };
  return p;
}

export function useAccountType() {
  const snap = useSyncExternalStore(subscribe, () => known, () => known);
  const [loadDone, setLoadDone] = useStateFlag();
  useEffect(() => {
    let active = true;
    load()
      .catch(() => {})
      .finally(() => active && setLoadDone());
    return () => {
      active = false;
    };
  }, [setLoadDone]);
  const accountType: AccountType = snap?.accountType ?? "individual";
  return {
    accountType,
    agencyName: snap?.agencyName ?? null,
    isLoading: !snap && !loadDone,
    isAgency: accountType === "agency",
  };
}

import { useCallback, useState } from "react";
function useStateFlag(): [boolean, () => void] {
  const [v, setV] = useState(false);
  const set = useCallback(() => setV(true), []);
  return [v, set];
}

/** Vincula a marca à agência logada (idempotente). Ignora contas individuais. */
export async function linkBrandToAgencyIfNeeded(userId: string, brandId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("user_id", userId)
    .maybeSingle();
  if ((data as { account_type?: string } | null)?.account_type !== "agency") return false;
  // Marca criada pela agência (create_agency_brand) já nasce vinculada.
  const { data: link } = await supabase
    .from("agency_brands")
    .select("id")
    .eq("agency_user_id", userId)
    .eq("brand_id", brandId)
    .maybeSingle();
  if (link) return true;
  const { error } = await supabase
    .from("agency_brands")
    .upsert(
      { agency_user_id: userId, brand_id: brandId, status: "ativo" } as never,
      { onConflict: "agency_user_id,brand_id" },
    );
  if (error) throw error;
  return true;
}
