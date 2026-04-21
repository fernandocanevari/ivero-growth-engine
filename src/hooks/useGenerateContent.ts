import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { track } from "@/lib/analytics";
import type { GeneratedContentRow } from "./useContentHistory";

export interface GenerateContentInput {
  topic: string;
  tone: string;
  formats: string[];
  context: {
    weakPillars?: { name: string; score: number }[];
    strongPillars?: { name: string; score: number }[];
    mainCompetitor?: string;
    sector?: string;
    brandName?: string;
    uncoveredPrompts?: string[];
  };
}

export function useGenerateContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: GenerateContentInput): Promise<GeneratedContentRow> => {
      const { data, error } = await supabase.functions.invoke<{
        content: GeneratedContentRow;
        error?: string;
      }>("generate-content", { body: input });

      // FunctionsHttpError: try to read error from data when present
      if (error) {
        const msg =
          (data as any)?.error || error.message || "Falha ao gerar conteúdo.";
        throw new Error(msg);
      }
      if (!data?.content) {
        throw new Error("Resposta vazia do servidor.");
      }
      return data.content;
    },
    onSuccess: (content, input) => {
      track("content_generation_attempt", {
        result: "success",
        format: input.formats.join(","),
        has_context: Object.keys(input.context ?? {}).length > 0,
      });
      qc.invalidateQueries({ queryKey: ["content_history"] });
      qc.invalidateQueries({ queryKey: ["generation_quota"] });
      toast({ title: "Conteúdo gerado com sucesso" });
    },
    onError: (err: Error, input) => {
      const isQuota = /trial_quota_exceeded|Limite do trial/i.test(err.message);
      track("content_generation_attempt", {
        result: isQuota ? "blocked_quota" : "error",
        format: input.formats.join(","),
        has_context: Object.keys(input.context ?? {}).length > 0,
      });
      toast({
        title: "Não foi possível gerar",
        description: err.message,
        variant: "destructive",
      });
    },
  });
}
