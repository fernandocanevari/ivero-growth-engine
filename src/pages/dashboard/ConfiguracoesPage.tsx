import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Upload, Building2, Cpu, Globe, CheckCircle2, X, Plus } from "lucide-react";
import { useBrandSettings, useUpdateBrandSettings } from "@/hooks/useBrandSettings";
import { useCompetitors, useReplaceCompetitors } from "@/hooks/useCompetitors";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { formatPhoneBR } from "@/lib/format-phone";
import { BrandCoverageSection, validateBrandCoverage } from "@/components/dashboard/BrandCoverageSection";

import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

// Ordem fixa de liberação: Presença libera 2, Influência libera 3, Autoridade libera 4.
const MODELS_ORDER: string[] = ["OpenAI", "Gemini", "Google Modo IA", "Claude"];

const MODELS_BY_TIER: Record<"presenca" | "influencia" | "autoridade", number> = {
  presenca: 2,
  influencia: 3,
  autoridade: 4,
};

const MODEL_META: Record<string, { icon: typeof Cpu; desc: string; badge?: string }> = {
  OpenAI: { icon: Cpu, desc: "" },
  Gemini: { icon: Globe, desc: "" },
  "Google Modo IA": { icon: Globe, desc: "", badge: "Novo" },
  Claude: { icon: Cpu, desc: "" },
};


export default function ConfiguracoesPage() {
  const { data: settings, isLoading } = useBrandSettings();
  const updateMutation = useUpdateBrandSettings();
  const { data: competitorRows } = useCompetitors(settings?.id);
  const replaceCompetitors = useReplaceCompetitors();
  const { plano, isAdmin } = useSubscriptionStatus();
  const activeCount = isAdmin ? 4 : MODELS_BY_TIER[plano ?? "presenca"];
  const activeModels = MODELS_ORDER.slice(0, activeCount);
  const lockedModels = MODELS_ORDER.slice(activeCount);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [competitorNames, setCompetitorNames] = useState<string[]>([]);
  const [newCompetitor, setNewCompetitor] = useState("");

  const [form, setForm] = useState({
    brand_name: "",
    website: "",
    sector: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    logo_url: "",
    coverage_type: "national" as "national" | "regional",
    coverage_city: "",
    coverage_state: "",
    coverage_region: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        brand_name: settings.brand_name,
        website: settings.website,
        sector: settings.sector,
        contact_name: settings.contact_name || "",
        contact_email: settings.contact_email || "",
        contact_phone: settings.contact_phone || "",
        logo_url: settings.logo_url || "",
        coverage_type: (settings.coverage_type as "national" | "regional") || "national",
        coverage_city: settings.coverage_city || "",
        coverage_state: settings.coverage_state || "",
        coverage_region: settings.coverage_region || "",
      });
    }
  }, [settings]);

  useEffect(() => {
    if (competitorRows) {
      setCompetitorNames(competitorRows.map((c) => c.nome));
    }
  }, [competitorRows]);

  const addCompetitor = () => {
    const n = newCompetitor.trim();
    if (!n) return;
    if (competitorNames.some((c) => c.toLowerCase() === n.toLowerCase())) {
      setNewCompetitor("");
      return;
    }
    setCompetitorNames((prev) => [...prev, n]);
    setNewCompetitor("");
  };

  const removeCompetitor = (name: string) => {
    setCompetitorNames((prev) => prev.filter((c) => c !== name));
  };

  const qc = useQueryClient();

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/logo.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("brand-logos")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Erro ao enviar logo", variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("brand-logos")
      .getPublicUrl(filePath);

    setForm((p) => ({ ...p, logo_url: urlData.publicUrl }));
    setUploading(false);
    toast({ title: "Logo enviado com sucesso!" });
  };

  const handleSave = async () => {
    const coverageError = validateBrandCoverage({
      coverage_type: form.coverage_type,
      coverage_city: form.coverage_city,
      coverage_state: form.coverage_state,
      coverage_region: form.coverage_region,
    });
    if (coverageError) {
      toast({ title: coverageError, variant: "destructive" });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    let brandId = settings?.id;
    if (settings) {
      updateMutation.mutate({ id: settings.id, ...form });
    } else {
      const { data: inserted, error } = await supabase
        .from("brand_settings")
        .insert({ ...form, user_id: user.id })
        .select("id")
        .single();
      if (error) {
        toast({ title: "Erro ao salvar", variant: "destructive" });
        return;
      }
      brandId = inserted.id;
      qc.invalidateQueries({ queryKey: ["brand_settings"] });
      toast({ title: "Configurações salvas!" });
    }
    if (brandId) {
      try {
        await replaceCompetitors.mutateAsync({ brandId, names: competitorNames });
      } catch {
        /* toast já disparado no hook */
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold font-display text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-1">Gerencie sua marca e preferências.</p>
      </motion.div>

      {/* Logo & Brand */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Dados da Marca</h2>
          
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-border">
              {form.logo_url ? (
                <AvatarImage src={form.logo_url} alt="Logo" />
              ) : null}
              <AvatarFallback className="bg-secondary">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="gap-2"
              >
                <Upload className="h-3.5 w-3.5" />
                {uploading ? "Enviando..." : "Enviar Logo"}
              </Button>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG até 2MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </div>
          </div>

          <div><Label>Nome da Marca</Label><Input value={form.brand_name} onChange={(e) => setForm((p) => ({ ...p, brand_name: e.target.value }))} className="mt-1" /></div>
          <div><Label>Website</Label><Input value={form.website} onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))} className="mt-1" /></div>
          <div><Label>Setor</Label><Input value={form.sector} onChange={(e) => setForm((p) => ({ ...p, sector: e.target.value }))} className="mt-1" /></div>
        </CardContent>
      </Card>

      {/* Abrangência Geográfica */}
      <BrandCoverageSection
        values={{
          coverage_type: form.coverage_type,
          coverage_city: form.coverage_city,
          coverage_state: form.coverage_state,
          coverage_region: form.coverage_region,
        }}
        onChange={(next) => setForm((p) => ({ ...p, ...next }))}
      />

      {/* Contact Info */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Dados de Contato</h2>
          <div><Label>Nome do Contato</Label><Input value={form.contact_name} onChange={(e) => setForm((p) => ({ ...p, contact_name: e.target.value }))} className="mt-1" placeholder="Nome completo" /></div>
          <div><Label>E-mail</Label><Input type="email" value={form.contact_email} onChange={(e) => setForm((p) => ({ ...p, contact_email: e.target.value }))} className="mt-1" placeholder="email@empresa.com" /></div>
          <div><Label>Celular</Label><Input type="tel" inputMode="numeric" maxLength={16} value={form.contact_phone} onChange={(e) => setForm((p) => ({ ...p, contact_phone: formatPhoneBR(e.target.value) }))} className="mt-1" placeholder="(11) 99999-9999" /></div>
        </CardContent>
      </Card>

      {/* Competitors */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Concorrentes Monitorados</h2>
          <div><Label>Concorrente Principal</Label><Input value={form.main_competitor} onChange={(e) => setForm((p) => ({ ...p, main_competitor: e.target.value }))} className="mt-1" /></div>
          <div><Label>Outros Concorrentes</Label><Input value={form.other_competitors} onChange={(e) => setForm((p) => ({ ...p, other_competitors: e.target.value }))} className="mt-1" placeholder="Separados por vírgula..." /></div>
        </CardContent>
      </Card>


      {/* AI Models Monitorados */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Modelos de IA Monitorados</h2>
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">
              <CheckCircle2 className="h-3 w-3" />
              {activeCount} ativos
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Estes são os modelos de IA que a Ivero consulta em paralelo durante cada análise e simulação.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeModels.map((name) => {
              const meta = MODEL_META[name] || { icon: Cpu, desc: "" };
              const Icon = meta.icon;
              return (
                <div key={name} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/40 border border-border">
                  <div className="mt-0.5 p-1.5 rounded-md bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{name}</p>
                      {meta.badge && (
                        <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          {meta.badge}
                        </span>
                      )}
                    </div>
                    {meta.desc && <p className="text-xs text-muted-foreground mt-0.5">{meta.desc}</p>}
                  </div>
                </div>
              );
            })}
            {lockedModels.map((name) => {
              const meta = MODEL_META[name] || { icon: Cpu, desc: "" };
              const Icon = meta.icon;
              return (
                <div
                  key={name}
                  className="flex items-start gap-3 p-3 rounded-lg bg-secondary/20 border border-dashed border-border opacity-60"
                  title="Disponível em planos superiores"
                >
                  <div className="mt-0.5 p-1.5 rounded-md bg-muted text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-muted-foreground">{name}</p>
                      <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        Upgrade
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-primary text-primary-foreground">
        {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
      </Button>
    </div>
  );
}
