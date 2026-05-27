import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useBrandSettings, useUpdateBrandSettings } from "@/hooks/useBrandSettings";
import { BrandCoverageSection, validateBrandCoverage, type BrandCoverageValues } from "./BrandCoverageSection";

/**
 * Wrapper auto-contido: carrega e salva a abrangência da marca
 * usando os hooks existentes. Reutilizado em telas que precisam
 * apenas dessa seção (ex: Diagnóstico).
 */
export function BrandCoverageInlineCard() {
  const { data: settings } = useBrandSettings();
  const updateMutation = useUpdateBrandSettings();
  const qc = useQueryClient();

  const [values, setValues] = useState<BrandCoverageValues>({
    coverage_type: "national",
    coverage_city: "",
    coverage_state: "",
    coverage_region: "",
  });

  useEffect(() => {
    if (settings) {
      setValues({
        coverage_type: (settings.coverage_type as "national" | "regional") || "national",
        coverage_city: settings.coverage_city || "",
        coverage_state: settings.coverage_state || "",
        coverage_region: settings.coverage_region || "",
      });
    }
  }, [settings]);

  const handleSave = async () => {
    const err = validateBrandCoverage(values);
    if (err) {
      toast.error(err);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (settings) {
      updateMutation.mutate({ id: settings.id, ...values });
    } else {
      const { error } = await supabase.from("brand_settings").insert({ ...values, user_id: user.id });
      if (error) {
        toast.error("Erro ao salvar abrangência.");
      } else {
        qc.invalidateQueries({ queryKey: ["brand_settings"] });
        toast.success("Abrangência salva!");
      }
    }
  };

  return (
    <div className="space-y-3">
      <BrandCoverageSection values={values} onChange={setValues} />
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateMutation.isPending} size="sm">
          {updateMutation.isPending ? "Salvando..." : "Salvar abrangência"}
        </Button>
      </div>
    </div>
  );
}
