import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface BrandSettings {
  id: string;
  brand_name: string;
  website: string;
  sector: string;
  main_competitor: string;
  other_competitors: string;
}

export function useBrandSettings() {
  return useQuery({
    queryKey: ["brand_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_settings")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data as BrandSettings;
    },
  });
}

export function useUpdateBrandSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<BrandSettings> & { id: string }) => {
      const { id, ...rest } = values;
      const { error } = await supabase.from("brand_settings").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brand_settings"] });
      toast({ title: "Configurações salvas!" });
    },
    onError: () => {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    },
  });
}
