import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("brand_settings")
        .select("*")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as BrandSettings | null;
    },
  });
}

export function useUpdateBrandSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<BrandSettings> & { id: string }) => {
      const { id, ...rest } = values;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("brand_settings").update(rest).eq("id", id).eq("user_id", user.id);
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
