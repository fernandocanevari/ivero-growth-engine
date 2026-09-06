import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OnboardingResponses {
  id: string;
  brand_id: string;
  p1_maturidade_ia: string;
  p2_criterio_mercado: string;
  p3_maior_risco: string;
  dashboard_hint_dismissed_at: string | null;
}

/**
 * Lê as respostas do onboarding (P1/P2/P3) da marca do usuário atual.
 * Retorna null quando o usuário ainda não respondeu.
 */
export function useOnboardingResponses() {
  return useQuery({
    queryKey: ["onboarding_responses"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: brand } = await supabase
        .from("brand_settings")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!brand) return null;

      const { data, error } = await supabase
        .from("onboarding_responses")
        .select("*")
        .eq("brand_id", brand.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as OnboardingResponses | null) ?? null;
    },
    // Revalidação em segundo plano nunca deve zerar a tela: mantém o último
    // dado conhecido e não recarrega ao voltar o foco da aba (evita piscada).
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Marca dashboard_hint_dismissed_at = now() para que o card de
 * "Comece por aqui" desapareça definitivamente após o 1º uso.
 */
export function useDismissDashboardHint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("onboarding_responses")
        .update({ dashboard_hint_dismissed_at: new Date().toISOString() } as never)
        .eq("id", id)
        .is("dashboard_hint_dismissed_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onboarding_responses"] });
    },
  });
}
