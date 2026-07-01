import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Competitor {
  id: string;
  brand_id: string;
  nome: string;
  url: string | null;
  sugerido_por_ia: boolean;
  aprovado_pelo_usuario: boolean;
  created_at: string;
}

/**
 * Fetches the list of approved competitors for a given brand_id.
 * Replaces the legacy brand_settings.main_competitor / other_competitors columns
 * (see PROMPT 3.5 migration).
 */
export function useCompetitors(brandId: string | null | undefined) {
  return useQuery({
    queryKey: ["competitors", brandId],
    enabled: !!brandId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitors")
        .select("*")
        .eq("brand_id", brandId!)
        .eq("aprovado_pelo_usuario", true)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Competitor[];
    },
  });
}

export function useReplaceCompetitors() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ brandId, names }: { brandId: string; names: string[] }) => {
      const clean = Array.from(
        new Map(
          names
            .map((n) => n.trim())
            .filter((n) => n.length > 0)
            .map((n) => [n.toLowerCase(), n]),
        ).values(),
      );
      const { error: delErr } = await supabase
        .from("competitors")
        .delete()
        .eq("brand_id", brandId);
      if (delErr) throw delErr;
      if (clean.length > 0) {
        const rows = clean.map((nome) => ({
          brand_id: brandId,
          nome,
          sugerido_por_ia: false,
          aprovado_pelo_usuario: true,
        }));
        const { error: insErr } = await supabase.from("competitors").insert(rows);
        if (insErr) throw insErr;
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["competitors", vars.brandId] });
    },
    onError: () => {
      toast({ title: "Erro ao salvar concorrentes", variant: "destructive" });
    },
  });
}
