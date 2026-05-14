import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DashboardOnboardingProgress {
  id: string;
  user_id: string;
  visited_diagnostico: boolean;
  visited_score: boolean;
  visited_acoes: boolean;
}

type StepKey = "visited_diagnostico" | "visited_score" | "visited_acoes";

const ROUTE_TO_STEP: Record<string, StepKey> = {
  "/dashboard/diagnostico": "visited_diagnostico",
  "/dashboard/score": "visited_score",
  "/dashboard/acoes": "visited_acoes",
};

export function useDashboardOnboarding() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["dashboard_onboarding_progress"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("dashboard_onboarding_progress")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return (data as DashboardOnboardingProgress | null) ?? {
        id: "",
        user_id: user.id,
        visited_diagnostico: false,
        visited_score: false,
        visited_acoes: false,
      };
    },
  });

  const markStep = useMutation({
    mutationFn: async (step: StepKey) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from("dashboard_onboarding_progress")
        .upsert(
          { user_id: user.id, [step]: true },
          { onConflict: "user_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard_onboarding_progress"] });
    },
  });

  return { data: query.data, isLoading: query.isLoading, markStep };
}

/** Auto-marca a etapa correspondente quando o usuário visita a rota. */
export function useTrackOnboardingVisit() {
  const { pathname } = useLocation();
  const { data, markStep } = useDashboardOnboarding();

  useEffect(() => {
    const step = ROUTE_TO_STEP[pathname];
    if (!step || !data) return;
    if (data[step]) return;
    markStep.mutate(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, data?.visited_diagnostico, data?.visited_score, data?.visited_acoes]);
}
