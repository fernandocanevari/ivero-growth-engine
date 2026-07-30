import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { mutationErrorToast, mutationSuccessToast } from "@/lib/mutation-toast";

export type AuthoritySubcategory = Database["public"]["Enums"]["authority_subcategory"];
export type AuthorityCatalogItem =
  Database["public"]["Tables"]["autoridade_externa_catalog"]["Row"];

export const AUTHORITY_SUBCATEGORY_ORDER: AuthoritySubcategory[] = [
  "publicacoes_midia",
  "conteudo_autoridade",
  "citacoes_backlinks",
  "comunidades_foruns",
  "reputacao_digital",
  "autoridade_institucional",
  "conteudo_multimidia",
  "seo_geo",
];

export const AUTHORITY_SUBCATEGORY_LABELS: Record<AuthoritySubcategory, string> = {
  publicacoes_midia: "Publicações e Mídia",
  conteudo_autoridade: "Conteúdo de Autoridade",
  citacoes_backlinks: "Citações e Backlinks",
  comunidades_foruns: "Comunidades e Fóruns",
  reputacao_digital: "Reputação Digital",
  autoridade_institucional: "Autoridade Institucional",
  conteudo_multimidia: "Conteúdo Multimídia",
  seo_geo: "SEO e GEO",
};

/** Paleta suave — uma cor por subcategoria. */
export const AUTHORITY_SUBCATEGORY_COLORS: Record<AuthoritySubcategory, string> = {
  publicacoes_midia: "bg-sky-100 text-sky-700",
  conteudo_autoridade: "bg-violet-100 text-violet-700",
  citacoes_backlinks: "bg-emerald-100 text-emerald-700",
  comunidades_foruns: "bg-amber-100 text-amber-700",
  reputacao_digital: "bg-rose-100 text-rose-700",
  autoridade_institucional: "bg-indigo-100 text-indigo-700",
  conteudo_multimidia: "bg-teal-100 text-teal-700",
  seo_geo: "bg-fuchsia-100 text-fuchsia-700",
};

export function useAuthorityCatalog() {
  return useQuery({
    queryKey: ["autoridade-externa-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("autoridade_externa_catalog")
        .select("*")
        .eq("ativo", true)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AuthorityCatalogItem[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Adota um item do catálogo, copiando todos os campos para action_plans. */
export function useAdoptCatalogAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: AuthorityCatalogItem) => {
      const { data: auth } = await supabase.auth.getUser();
      const user_id = auth.user?.id;
      if (!user_id) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("action_plans")
        .insert({
          user_id,
          titulo: item.titulo,
          descricao: item.descricao,
          objetivo: item.objetivo,
          impacto_estimado: item.impacto_estimado,
          tempo_estimado: item.tempo_estimado,
          dificuldade: item.dificuldade,
          prioridade: item.prioridade,
          categoria: "autoridade_externa" as const,
          subcategoria: item.subcategoria,
          catalog_id: item.id,
          origem: "manual" as const,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["action-plans"] });
      mutationSuccessToast("Ação adicionada ao seu plano");
    },
    onError: mutationErrorToast("adicionar a ação"),
  });
}
