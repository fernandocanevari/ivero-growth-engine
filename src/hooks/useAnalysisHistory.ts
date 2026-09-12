import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUserId } from "@/hooks/useAuthUserId";
import type { PerceptionSnapshot } from "@/lib/perception-tags";
import type { KeywordCloud } from "@/lib/keyword-cloud";


export interface AnalysisRecord {
  id: string;
  user_id: string;
  overall_score: number;
  clarity_score: number;
  authority_score: number;
  conversion_score: number;
  positioning_score: number;
  experience_score: number;
  created_at: string;
  /** 'preview' = diagnóstico feito antes de virar cliente; 'reanalise' = rodado no painel. */
  source?: "preview" | "reanalise";
  perception_snapshot?: PerceptionSnapshot | Record<string, never>;
  keyword_cloud?: KeywordCloud;
  /** Modelos de IA que responderam nessa análise. Deltas só comparam bases iguais. */
  models_ok?: string[];
}

/**
 * Série histórica das análises. A gravação NÃO acontece aqui: quem escreve é
 * `persistDiagnostic` (src/lib/diagnostic-engine.ts), sempre a partir de uma
 * rodada real de `simulate-ai`. Este hook é somente leitura + cooldown.
 */
export function useAnalysisHistory() {
  const { userId, isResolving } = useAuthUserId();

  const history = useQuery<AnalysisRecord[]>({
    queryKey: ["analysis-history", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analysis_history")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as AnalysisRecord[];
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });


  const lastAnalysis = history.data?.length ? history.data[history.data.length - 1] : null;

  // O intervalo de 30 dias conta apenas as reanálises feitas no painel. O
  // diagnóstico trazido do /preview aparece na série de evolução, mas não pode
  // bloquear a primeira reanálise de quem acabou de se cadastrar.
  const lastReanalysis = [...(history.data ?? [])]
    .reverse()
    .find((r) => (r.source ?? "reanalise") === "reanalise") ?? null;

  const daysSinceLast = lastReanalysis
    ? Math.floor((Date.now() - new Date(lastReanalysis.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const canReanalyze = daysSinceLast === null || daysSinceLast >= 30;
  const daysRemaining = daysSinceLast !== null ? Math.max(0, 30 - daysSinceLast) : 0;

  return {
    history: history.data ?? [],
    lastAnalysis,
    canReanalyze,
    daysRemaining,
    daysSinceLast,
    isLoading: isResolving || (!!userId && history.isLoading && !history.isFetched),
  };
}


