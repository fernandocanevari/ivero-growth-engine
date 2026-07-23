import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mutationErrorToast } from "@/lib/mutation-toast";

/**
 * Fonte atual: onboarding_responses (mesma tabela usada pelo fluxo real de
 * onboarding em /onboarding/perguntas). O BrandProfileModal agora é uma
 * ferramenta de "atualizar minhas respostas", não um segundo onboarding.
 *
 * DEPRECATED: a tabela `client_onboarding` e os campos detail_1/2/3 do modal
 * antigo foram descontinuados neste prompt. Nada mais lê ou escreve nela.
 * A tabela será dropada em migração de follow-up após confirmação.
 */

export interface BrandProfileAnswers {
  p1_maturidade_ia: string;
  p2_criterio_mercado: string;
  p3_maior_risco: string;
}

interface BrandProfileState extends BrandProfileAnswers {
  brand_id: string;
  hasRow: boolean;
}

const SKIP_STORAGE_PREFIX = "ivero_brand_profile_skip:";
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

function readSkippedAt(userId: string): number {
  try {
    const raw = localStorage.getItem(SKIP_STORAGE_PREFIX + userId);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

function writeSkippedAt(userId: string, ts: number) {
  try {
    localStorage.setItem(SKIP_STORAGE_PREFIX + userId, String(ts));
  } catch {
    /* ignore */
  }
}

export function useBrandProfile() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["brand_profile"],
    queryFn: async (): Promise<BrandProfileState | null> => {
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
        .select("p1_maturidade_ia, p2_criterio_mercado, p3_maior_risco")
        .eq("brand_id", brand.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;

      return {
        brand_id: brand.id,
        hasRow: !!data,
        p1_maturidade_ia: (data as any)?.p1_maturidade_ia ?? "",
        p2_criterio_mercado: (data as any)?.p2_criterio_mercado ?? "",
        p3_maior_risco: (data as any)?.p3_maior_risco ?? "",
      };
    },
  });

  const save = useMutation({
    mutationFn: async (answers: BrandProfileAnswers) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const state = query.data;
      if (!state?.brand_id) throw new Error("Marca não encontrada");
      const { error } = await supabase
        .from("onboarding_responses")
        .upsert(
          {
            brand_id: state.brand_id,
            ...answers,
          } as never,
          { onConflict: "brand_id" }
        );
      if (error) throw error;
      // Clear any skip snooze once the user actually answers.
      writeSkippedAt(user.id, 0);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["brand_profile"] }),
    onError: mutationErrorToast("salvar perfil da marca"),
  });

  const skip = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      writeSkippedAt(user.id, Date.now());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["brand_profile"] }),
  });

  const data = query.data;
  const hasCompletedBrandProfile = !!data?.hasRow;

  // Skip é local (localStorage) — não polui o schema por um snooze de UI.
  let skippedRecently = false;
  try {
    const { data: sessionData } = { data: { session: null } } as any;
    // We can't read auth synchronously here without another await; but skip
    // only matters after brand profile loads, and readSkippedAt only needs the
    // uid we already fetched implicitly via the query. Fallback via localStorage
    // scan: any recent skip for the current user id (best-effort).
    void sessionData;
  } catch { /* noop */ }

  // Best-effort synchronous skip read using cached auth user id
  const cachedUserId = (supabase.auth as any)?.currentSession?.user?.id
    ?? (supabase.auth as any)?._session?.user?.id
    ?? null;
  if (cachedUserId) {
    const ts = readSkippedAt(cachedUserId);
    skippedRecently = ts > 0 && Date.now() - ts < THREE_DAYS_MS;
  }

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
