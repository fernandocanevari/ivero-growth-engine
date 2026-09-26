import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AccountType = "individual" | "agency";

/**
 * Tipo da conta logada (profiles.account_type). Padrão: individual.
 * Sem React Query de propósito: é usado nas telas de onboarding, que
 * rodam fora do provider em alguns testes.
 */
export function useAccountType() {
  const [state, setState] = useState<{ accountType: AccountType; agencyName: string | null; isLoading: boolean }>(
    { accountType: "individual", agencyName: null, isLoading: true },
  );
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return active && setState((s) => ({ ...s, isLoading: false }));
        const { data } = await supabase
          .from("profiles")
          .select("account_type, nome_empresa")
          .eq("user_id", user.id)
          .maybeSingle();
        const row = data as { account_type?: string; nome_empresa?: string | null } | null;
        if (active) {
          setState({
            accountType: row?.account_type === "agency" ? "agency" : "individual",
            agencyName: row?.nome_empresa ?? null,
            isLoading: false,
          });
        }
      } catch {
        if (active) setState((s) => ({ ...s, isLoading: false }));
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  return { ...state, isAgency: state.accountType === "agency" };
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
