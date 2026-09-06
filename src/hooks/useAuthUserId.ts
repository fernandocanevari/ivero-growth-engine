import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Identificador do usuário logado resolvido UMA única vez e mantido em cache
 * compartilhado do React Query.
 *
 * Antes cada hook de dados resolvia o usuário dentro de um useEffect próprio.
 * A cada navegação (montagem do componente) existia um render com
 * `userId = null` → a consulta ficava desabilitada, sem dados e sem sinal de
 * carregamento → a tela piscava mostrando estado vazio/skeleton antes do
 * conteúdo já em cache aparecer.
 */
export function useAuthUserId() {
  const q = useQuery({
    queryKey: ["auth-user-id"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user?.id ?? null;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
  });

  return {
    userId: q.data ?? null,
    /** true enquanto a identidade nunca foi resolvida nesta sessão. */
    isResolving: q.data === undefined && !q.isFetched,
  };
}
