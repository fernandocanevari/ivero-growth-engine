import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mutationErrorToast } from "@/lib/mutation-toast";

export interface BrandProfileAnswers {
  question_1: string;
  question_2: string;
  question_3: string;
  detail_1?: string;
  detail_2?: string;
  detail_3?: string;
}

interface BrandProfileRow extends BrandProfileAnswers {
  id: string;
  completed: boolean;
  skipped_at: string | null;
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export function useBrandProfile() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["brand_profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("client_onboarding")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as BrandProfileRow | null;
    },
  });

  const upsert = async (patch: Partial<BrandProfileRow> & { user_id?: string }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const existing = query.data;
    if (existing) {
      const { error } = await supabase
        .from("client_onboarding")
        .update(patch)
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("client_onboarding")
        .insert({
          user_id: user.id,
          question_1: "",
          question_2: "",
          question_3: "",
          ...patch,
        } as never);
      if (error) throw error;
    }
  };

  const save = useMutation({
    mutationFn: async (answers: BrandProfileAnswers) => {
      await upsert({ ...answers, completed: true, skipped_at: null });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["brand_profile"] }),
    onError: mutationErrorToast("salvar perfil da marca"),
  });

  const skip = useMutation({
    mutationFn: async () => {
      await upsert({ skipped_at: new Date().toISOString() });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["brand_profile"] }),
    onError: mutationErrorToast("adiar perfil da marca"),
  });

  const data = query.data;
  const hasCompletedBrandProfile = !!data?.completed;
  const skippedAt = data?.skipped_at ? new Date(data.skipped_at).getTime() : 0;
  const skippedRecently = skippedAt > 0 && Date.now() - skippedAt < THREE_DAYS_MS;
  // Lembra sempre que o perfil não está completo e o usuário não pediu para adiar nos últimos 3 dias.
  const shouldRemind = !hasCompletedBrandProfile && !skippedRecently;

  return {
    data,
    isLoading: query.isLoading,
    hasCompletedBrandProfile,
    skippedRecently,
    shouldRemind,
    save,
    skip,
  };
}
