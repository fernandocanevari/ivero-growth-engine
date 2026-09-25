import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUserId } from "@/hooks/useAuthUserId";

export type AccountType = "individual" | "agency";

/** Tipo da conta logada (profiles.account_type). Padrão: individual. */
export function useAccountType() {
  const { userId } = useAuthUserId();
  const q = useQuery({
    queryKey: ["account-type", userId],
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("account_type, nome_empresa")
        .eq("user_id", userId!)
        .maybeSingle();
      const row = data as { account_type?: string; nome_empresa?: string | null } | null;
      return {
        accountType: (row?.account_type === "agency" ? "agency" : "individual") as AccountType,
        agencyName: row?.nome_empresa ?? null,
      };
    },
  });
  return {
    accountType: q.data?.accountType ?? "individual",
    agencyName: q.data?.agencyName ?? null,
    isAgency: q.data?.accountType === "agency",
    isLoading: q.isLoading,
  };
}

/** Vincula a marca à agência logada (idempotente). Ignora contas individuais. */
export async function linkBrandToAgencyIfNeeded(userId: string, brandId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("user_id", userId)
    .maybeSingle();
  if ((data as { account_type?: string } | null)?.account_type !== "agency") return false;
  const { error } = await supabase
    .from("agency_brands")
    .upsert(
      { agency_user_id: userId, brand_id: brandId, status: "ativo" } as never,
      { onConflict: "agency_user_id,brand_id" },
    );
  if (error) throw error;
  return true;
}
