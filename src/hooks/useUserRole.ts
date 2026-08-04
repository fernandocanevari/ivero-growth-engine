import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useUserRole() {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  // Antes da sessão resolver não sabemos nada: o default "não-admin" NÃO pode
  // ser tratado como estado confirmado (causava flash de cadeados / tela premium).
  const [authResolved, setAuthResolved] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUserId(data.session?.user?.id ?? null);
      setAuthResolved(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const newId = session?.user?.id ?? null;
      setAuthResolved(true);
      setUserId((prev) => {
        if (prev !== newId) {
          queryClient.invalidateQueries({ queryKey: ["user_roles"] });
          queryClient.invalidateQueries({ queryKey: ["assinaturas"] });
        }
        return newId;
      });
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [queryClient]);

  const query = useQuery({
    queryKey: ["user_roles", userId],
    enabled: userId !== null,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (error) throw error;
      return (data ?? []).map((r) => r.role);
    },
  });

  // "Loading" cobre 3 janelas: sessão não resolvida, query pendente (inclusive
  // logo após queryClient.clear(), quando ainda não há isFetching) e refetch.
  const isLoading =
    !authResolved ||
    (userId !== null && (query.isPending || query.isFetching));

  return {
    roles: query.data ?? [],
    isAdmin: (query.data ?? []).includes("admin"),
    isLoading,
    authResolved,
  };
}
