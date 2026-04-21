import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { buildPerceptionSnapshot, type PerceptionSnapshot } from "@/lib/perception-tags";

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
}

function randomVariation(base: number, range = 8): number {
  const delta = Math.round((Math.random() - 0.4) * range);
  return Math.max(0, Math.min(100, base + delta));
}

export function useAnalysisHistory() {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

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
      return (data ?? []) as AnalysisRecord[];
    },
  });

  const lastAnalysis = history.data?.length ? history.data[history.data.length - 1] : null;

  const daysSinceLast = lastAnalysis
    ? Math.floor((Date.now() - new Date(lastAnalysis.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const canReanalyze = daysSinceLast === null || daysSinceLast >= 30;
  const daysRemaining = daysSinceLast !== null ? Math.max(0, 30 - daysSinceLast) : 0;

  const runAnalysis = useMutation({
    mutationFn: async (baseScores: { clarity: number; authority: number; conversion: number; positioning: number; experience: number }) => {
      if (!userId) throw new Error("Not authenticated");
      const clarity = randomVariation(baseScores.clarity);
      const authority = randomVariation(baseScores.authority);
      const conversion = randomVariation(baseScores.conversion);
      const positioning = randomVariation(baseScores.positioning);
      const experience = randomVariation(baseScores.experience);
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
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analysis-history", userId] });
    },
  });

  return { history: history.data ?? [], lastAnalysis, canReanalyze, daysRemaining, daysSinceLast, runAnalysis, isLoading: history.isLoading };
}
