import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface GeneratedContentRow {
  id: string;
  user_id: string;
  topic: string;
  tone: string;
  formats: string[];
  context_used: Record<string, any>;
  article_md: string;
  faq_json: { question: string; answer: string }[];
  summary_md: string;
  model_used: string;
  created_at: string;
}

const HISTORY_LIMIT = 20;

export function useContentHistory() {
  return useQuery({
    queryKey: ["content_history"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [] as GeneratedContentRow[];
      const { data, error } = await supabase
        .from("generated_content")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(HISTORY_LIMIT);
      if (error) throw error;
      return (data ?? []) as unknown as GeneratedContentRow[];
    },
  });
}

export function useDeleteGeneratedContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("generated_content").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content_history"] });
      qc.invalidateQueries({ queryKey: ["generation_quota"] });
      toast({ title: "Conteúdo removido" });
    },
    onError: () => {
      toast({ title: "Erro ao remover", variant: "destructive" });
    },
  });
}
