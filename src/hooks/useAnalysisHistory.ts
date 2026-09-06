import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUserId } from "@/hooks/useAuthUserId";
import { buildPerceptionSnapshot, type PerceptionSnapshot } from "@/lib/perception-tags";
import type { KeywordCloud } from "@/lib/keyword-cloud";
import { mutationErrorToast } from "@/lib/mutation-toast";


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
  perception_snapshot?: PerceptionSnapshot | Record<string, never>;
  keyword_cloud?: KeywordCloud;
  /** Modelos de IA que responderam nessa análise. Deltas só comparam bases iguais. */
  models_ok?: string[];
}


function randomVariation(base: number, range = 8): number {
  const delta = Math.round((Math.random() - 0.4) * range);
  return Math.max(0, Math.min(100, base + delta));
}

export function useAnalysisHistory() {
  const queryClient = useQueryClient();
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

  const daysSinceLast = lastAnalysis
    ? Math.floor((Date.now() - new Date(lastAnalysis.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const canReanalyze = daysSinceLast === null || daysSinceLast >= 30;
  const daysRemaining = daysSinceLast !== null ? Math.max(0, 30 - daysSinceLast) : 0;

  const runAnalysis = useMutation({
    mutationFn: async (input: {
      clarity: number;
      authority: number;
      conversion: number;
      positioning: number;
      experience: number;
      keyword_cloud?: KeywordCloud;
      models_ok?: string[];
    }) => {
      if (!userId) throw new Error("Not authenticated");
      const clarity = randomVariation(input.clarity);
      const authority = randomVariation(input.authority);
      const conversion = randomVariation(input.conversion);
      const positioning = randomVariation(input.positioning);
      const experience = randomVariation(input.experience);
      const overall = Math.round((clarity + authority + conversion + positioning + experience) / 5);
      const perception_snapshot = buildPerceptionSnapshot({
        clarity, authority, conversion, positioning, experience,
      });

      const { error } = await supabase.from("analysis_history").insert({
        user_id: userId,
        overall_score: overall,
        clarity_score: clarity,
        authority_score: authority,
        conversion_score: conversion,
        positioning_score: positioning,
        experience_score: experience,
        perception_snapshot: perception_snapshot as unknown as never,
        keyword_cloud: (input.keyword_cloud ?? []) as unknown as never,
        models_ok: ([...(input.models_ok ?? [])].sort()) as unknown as never,
      });
      if (error) throw error;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analysis-history", userId] });
    },
    onError: mutationErrorToast("salvar a análise"),
  });

  return {
    history: history.data ?? [],
    lastAnalysis,
    canReanalyze,
    daysRemaining,
    daysSinceLast,
    runAnalysis,
    isLoading: isResolving || (!!userId && history.isLoading && !history.isFetched),
  };
}

