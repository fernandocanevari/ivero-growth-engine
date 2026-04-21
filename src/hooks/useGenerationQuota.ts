import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSubscriptionStatus } from "./useSubscriptionStatus";
import { TRIAL_GENERATION_LIMIT } from "@/lib/access-control";

/**
 * useGenerationQuota — quanto o usuário já consumiu da cota do trial
 * de gerações de conteúdo. Admins e usuários pagos têm cota ilimitada.
 */
export function useGenerationQuota() {
  const { isPaid, isAdmin, isLoading: subLoading } = useSubscriptionStatus();
  const unlimited = isPaid || isAdmin;

  const query = useQuery({
    queryKey: ["generation_quota"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      const { count, error } = await supabase
        .from("generated_content")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !subLoading,
  });

  const used = query.data ?? 0;
  const limit = TRIAL_GENERATION_LIMIT;
  const remaining = unlimited ? Infinity : Math.max(0, limit - used);
  const exhausted = !unlimited && used >= limit;

  return {
    used,
    limit,
    remaining,
    unlimited,
    exhausted,
    isLoading: subLoading || query.isLoading,
  };
}
