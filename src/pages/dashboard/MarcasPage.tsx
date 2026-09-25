import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Building2, Plus, Globe, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUserId } from "@/hooks/useAuthUserId";
import { useAccountType } from "@/hooks/useAccountType";

interface BrandRow {
  id: string;
  brand_name: string;
  website: string;
  sector: string;
  onboarding_completed_at: string | null;
}

export default function MarcasPage() {
  const navigate = useNavigate();
  const { userId } = useAuthUserId();
  const { agencyName } = useAccountType();

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ["agency-brands", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: links, error } = await supabase
        .from("agency_brands")
        .select("brand_id")
        .eq("agency_user_id", userId!)
        .eq("status", "ativo");
      if (error) throw error;
      const ids = (links ?? []).map((l) => l.brand_id);
      if (ids.length === 0) return [] as BrandRow[];
      const { data, error: bErr } = await supabase
        .from("brand_settings")
        .select("id, brand_name, website, sector, onboarding_completed_at")
        .in("id", ids);
      if (bErr) throw bErr;
      return (data ?? []) as BrandRow[];
    },
  });

  const startNewBrand = () => navigate("/onboarding/perguntas");

  if (isLoading) {
    return <div className="h-40 rounded-xl bg-muted/40 animate-pulse" />;
  }

  if (brands.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 space-y-6">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Building2 className="h-7 w-7 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            Bem-vindo{agencyName ? `, ${agencyName}` : ""}!
          </h1>
          <p className="text-muted-foreground">
            Aqui você acompanha todas as marcas dos seus clientes. Cadastre a primeira para
            gerar o diagnóstico de como as IAs falam dela.
          </p>
        </div>
        <Button variant="hero" size="lg" onClick={startNewBrand} className="gap-2">
          <Plus className="h-4 w-4" /> Cadastrar primeira marca
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Visão Geral das Marcas</h1>
          <p className="text-sm text-muted-foreground">
            {brands.length} {brands.length === 1 ? "marca ativa" : "marcas ativas"}
            {agencyName ? ` · ${agencyName}` : ""}
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((b) => (
          <div key={b.id} className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold text-foreground">{b.brand_name || "Marca sem nome"}</h2>
              {b.onboarding_completed_at ? (
                <span className="inline-flex items-center gap-1 text-xs text-primary">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Ativa
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> Em cadastro
                </span>
              )}
            </div>
            {b.website && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground truncate">
                <Globe className="h-3.5 w-3.5 shrink-0" /> {b.website}
              </p>
            )}
            {b.sector && <p className="text-xs text-muted-foreground">{b.sector}</p>}
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
              Abrir painel da marca
            </Button>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        O cadastro de novas marcas e a troca entre elas chegam na próxima etapa.
      </p>
    </div>
  );
}
