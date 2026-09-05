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

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // O supabase-js emite INITIAL_SESSION (e às vezes outros eventos) sem
      // sessão antes da recuperação terminar. Tratar isso como "resolvido"
      // fazia o estado virar "sem usuário / não-admin" por alguns frames.
      // Só um SIGNED_OUT explícito (ou o getSession acima) resolve sem sessão.
      if (!session && event !== "SIGNED_OUT") return;

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
    // A cada foco de janela o react-query revalidava do zero: isFetching entrava
    // no isLoading e todo consumidor voltava ao estado "carregando" (cadeados
    // piscando na sidebar, skeleton no card de cobrança). Papel do staleTime +
    // placeholderData: revalidar em segundo plano sem perder o valor conhecido.
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
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

  // "Loading" cobre só a PRIMEIRA carga: sessão não resolvida ou query ainda
  // sem dado algum. Revalidação em background NÃO é loading.
  const isLoading =
    !authResolved || (userId !== null && query.isPending && query.data === undefined);

  return {
    roles: query.data ?? [],
    isAdmin: (query.data ?? []).includes("admin"),
    isLoading,
    /** Revalidando em segundo plano com valor já conhecido em tela. */
    isValidating: query.isFetching && !isLoading,
    authResolved,
  };
}
