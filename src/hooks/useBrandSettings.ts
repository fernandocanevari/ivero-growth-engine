import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getBrandScope } from "@/lib/brand-scope";

export interface BrandSettings {
  id: string;
  brand_name: string;
  website: string;
  sector: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  logo_url: string;
  coverage_type: "national" | "regional";
  coverage_city: string | null;
  coverage_state: string | null;
  coverage_region: string | null;
}

export function useBrandSettings() {
  return useQuery({
    queryKey: ["brand_settings"],
    queryFn: async () => {
      const scope = await getBrandScope();
      if (!scope) throw new Error("Not authenticated");
      if (scope.isAgency) {
        if (!scope.brandId) return null;
        const { data, error } = await supabase
          .from("brand_settings")
          .select("*")
          .eq("id", scope.brandId)
          .maybeSingle();
        if (error) throw error;
        return data as BrandSettings | null;
      }
      const { data, error } = await supabase
        .from("brand_settings")
        .select("*")
        .eq("user_id", scope.userId)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as BrandSettings | null;
    },
    // Mantém o dado conhecido ao navegar entre telas (sem piscar).
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}


export function useUpdateBrandSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<BrandSettings> & { id: string }) => {
      const { id, ...rest } = values;
      const scope = await getBrandScope();
      if (!scope) throw new Error("Not authenticated");
      let q = supabase.from("brand_settings").update(rest).eq("id", id);
      if (!scope.isAgency) q = q.eq("user_id", scope.userId);
      const { error } = await q;
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
