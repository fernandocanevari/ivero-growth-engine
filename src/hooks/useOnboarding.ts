import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface OnboardingData {
  id: string;
  question_1: string;
  question_2: string;
  question_3: string;
  completed: boolean;
}

export function useOnboarding() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["client_onboarding"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("client_onboarding")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as OnboardingData | null;
    },
  });

  const saveAnswers = useMutation({
    mutationFn: async (answers: { question_1: string; question_2: string; question_3: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const existing = query.data;

      if (existing) {
        const { error } = await supabase
          .from("client_onboarding")
          .update({ ...answers, completed: true })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("client_onboarding")
          .insert({ ...answers, completed: true, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_onboarding"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Não foi possível salvar suas respostas",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    needsOnboarding: !query.isLoading && !query.data?.completed,
    saveAnswers,
  };
}
