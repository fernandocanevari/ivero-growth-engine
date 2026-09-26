import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Plus, Globe, CheckCircle2, Clock, TrendingUp, TrendingDown, ShoppingBag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAccountType } from "@/hooks/useAccountType";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useAgencyBrands, useSwitchBrand, useActiveBrandId } from "@/hooks/useAgencyBrands";

const PLAN_LABEL: Record<string, string> = { presenca: "Presença", influencia: "Influência", autoridade: "Autoridade" };

export default function MarcasPage() {
  const navigate = useNavigate();
  const { agencyName } = useAccountType();
  const { plano } = useSubscriptionStatus();
  const { data: brands = [], isLoading } = useAgencyBrands();
  const switchBrand = useSwitchBrand();
  const activeId = useActiveBrandId();
  const [creating, setCreating] = useState(false);

  const startNewBrand = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase.rpc("create_agency_brand" as never);
      if (error || !data) throw error ?? new Error("Não foi possível criar a marca");
      switchBrand(data as unknown as string);
      navigate("/onboarding/perguntas");
    } catch (e) {
      toast({ title: "Erro ao cadastrar marca", description: (e as Error).message, variant: "destructive" });
      setCreating(false);
    }
  };

  const openBrand = (id: string, done: boolean) => {
    switchBrand(id);
    navigate(done ? "/dashboard" : "/onboarding/perguntas");
  };

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
        <Button variant="hero" size="lg" onClick={startNewBrand} disabled={creating} className="gap-2">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Cadastrar primeira marca
        </Button>
      </div>
    );
  }

  const planLabel = plano ? PLAN_LABEL[plano] ?? plano : "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Visão Geral das Marcas</h1>
          <p className="text-sm text-muted-foreground">
            {brands.length} {brands.length === 1 ? "marca" : "marcas"}
            {agencyName ? ` · ${agencyName}` : ""}
          </p>
        </div>
        <Button variant="hero" onClick={startNewBrand} disabled={creating} className="gap-2">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Nova Marca
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((b) => {
          const done = !!b.onboarding_completed_at;
          return (
            <div
              key={b.id}
              data-testid="agency-brand-card"
              className={`rounded-xl border bg-card p-5 space-y-4 ${b.id === activeId ? "border-primary" : "border-border"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-foreground">{b.brand_name || "Marca sem nome"}</h2>
                {done ? (
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
              <dl className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-muted/50 p-2">
                  <dt className="text-[11px] text-muted-foreground">Plano</dt>
                  <dd className="text-sm font-semibold text-foreground">{planLabel}</dd>
                </div>
                <div className="rounded-lg bg-muted/50 p-2">
                  <dt className="text-[11px] text-muted-foreground">Score</dt>
                  <dd className="text-sm font-semibold text-foreground flex items-center justify-center gap-1">
                    {b.score ?? "—"}
                    {b.delta !== null && b.delta !== 0 && (
                      <span className={`inline-flex items-center text-[11px] ${b.delta > 0 ? "text-primary" : "text-destructive"}`}>
                        {b.delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {b.delta > 0 ? "+" : ""}{b.delta}
                      </span>
                    )}
                  </dd>
                </div>
                <div className="rounded-lg bg-muted/50 p-2">
                  <dt className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                    <ShoppingBag className="h-3 w-3" /> Vitrine
                  </dt>
                  <dd className="text-sm font-semibold text-foreground">
                    {b.vitrineTerms} {b.vitrineTerms === 1 ? "termo" : "termos"}
                  </dd>
                </div>
              </dl>
              <Button variant="outline" size="sm" className="w-full" onClick={() => openBrand(b.id, done)}>
                {done ? "Abrir painel da marca" : "Continuar cadastro"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
