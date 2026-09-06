import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { hasSessionDiagnostic } from "@/lib/existing-diagnostic";
import { useAuthUserId } from "@/hooks/useAuthUserId";

/**
 * Returns whether the current user has at least one diagnostic record
 * (in audit_reports or analysis_history) — or um snapshot do /preview ainda
 * na sessão, enquanto a gravação definitiva não confirma.
 *
 * Fica em cache do React Query: navegar entre telas do dashboard não volta
 * ao estado de carregamento (era isso que apagava o Painel a cada visita).
 */
export function useHasDiagnostic() {
  const { userId, isResolving } = useAuthUserId();

  const q = useQuery<boolean>({
    queryKey: ["has-diagnostic", userId],
    enabled: !isResolving,
    queryFn: async () => {
      if (!userId) return false;
      try {
        const [audits, history] = await Promise.all([
          supabase
            .from("audit_reports")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId),
          supabase
            .from("analysis_history")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId),
        ]);
        const total = (audits.count ?? 0) + (history.count ?? 0);
        // Snapshot do preview conta como diagnóstico: o cliente JÁ viu o
        // resultado, então o Painel não pode dizer "ainda não foi gerado".
        return total > 0 || hasSessionDiagnostic();
      } catch (err) {
        console.warn("[useHasDiagnostic] failed:", err);
        return hasSessionDiagnostic();
      }
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
  });

  return {
    hasDiagnostic: q.data ?? null,
    isLoading: isResolving || (q.isLoading && !q.isFetched),
  };
}
