import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  type ActionCategory,
  type ActionOrigin,
  type ActionPlan,
  type ActionPriority,
  type ActionStatus,
  sortActionPlans,
} from "@/lib/action-plans";
import { mutationErrorToast, mutationSuccessToast } from "@/lib/mutation-toast";

interface Filters {
  categoria?: ActionCategory;
  status?: ActionStatus;
  origem?: ActionOrigin;
}

export function useActionPlans(filters: Filters = {}) {
  return useQuery({
    queryKey: ["action-plans", filters],
    queryFn: async () => {
      let q = supabase.from("action_plans").select("*");
      if (filters.categoria) q = q.eq("categoria", filters.categoria);
      if (filters.status) q = q.eq("status", filters.status);
      if (filters.origem) q = q.eq("origem", filters.origem);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return sortActionPlans((data ?? []) as ActionPlan[]);
    },
  });
}

export interface CreateActionPlanInput {
  titulo: string;
  categoria: ActionCategory;
  prioridade?: ActionPriority;
  descricao?: string | null;
  impacto_estimado?: string | null;
}

export function useCreateActionPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateActionPlanInput) => {
      const { data: auth } = await supabase.auth.getUser();
      const user_id = auth.user?.id;
      if (!user_id) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("action_plans")
        .insert({
          user_id,
          titulo: input.titulo.trim(),
          categoria: input.categoria,
          prioridade: input.prioridade ?? "media",
          descricao: input.descricao?.trim() || null,
          impacto_estimado: input.impacto_estimado?.trim() || null,
          origem: "manual",
        })
        .select()
        .single();
      if (error) throw error;
      return data as ActionPlan;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["action-plans"] });
      mutationSuccessToast("Ação adicionada! Veja em 'Todas as Ações'.");
    },
    onError: mutationErrorToast("criar a ação"),
  });
}

export interface UpdateActionPlanInput {
  id: string;
  titulo?: string;
  descricao?: string | null;
  categoria?: ActionCategory;
  prioridade?: ActionPriority;
  impacto_estimado?: string | null;
}

export function useUpdateActionPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rest }: UpdateActionPlanInput) => {
      const patch: Record<string, unknown> = {};
      if (rest.titulo !== undefined) patch.titulo = rest.titulo.trim();
      if (rest.descricao !== undefined) patch.descricao = rest.descricao?.trim() || null;
      if (rest.categoria !== undefined) patch.categoria = rest.categoria;
      if (rest.prioridade !== undefined) patch.prioridade = rest.prioridade;
      if (rest.impacto_estimado !== undefined)
        patch.impacto_estimado = rest.impacto_estimado?.trim() || null;
      const { data, error } = await supabase
        .from("action_plans")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as ActionPlan;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["action-plans"] });
      mutationSuccessToast("Ação atualizada");
    },
    onError: mutationErrorToast("atualizar a ação"),
  });
}

export function useSetActionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ActionStatus }) => {
      const { data, error } = await supabase
        .from("action_plans")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as ActionPlan;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["action-plans"] });
    },
    onError: mutationErrorToast("atualizar o status da ação"),
  });
}

export function useDeleteActionPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("action_plans").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["action-plans"] });
      mutationSuccessToast("Ação excluída");
    },
    onError: mutationErrorToast("excluir a ação"),
  });
}
