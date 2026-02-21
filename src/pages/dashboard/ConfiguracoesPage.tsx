import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useBrandSettings, useUpdateBrandSettings } from "@/hooks/useBrandSettings";

export default function ConfiguracoesPage() {
  const { data: settings, isLoading } = useBrandSettings();
  const updateMutation = useUpdateBrandSettings();

  const [form, setForm] = useState({
    brand_name: "",
    website: "",
    sector: "",
    main_competitor: "",
    other_competitors: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        brand_name: settings.brand_name,
        website: settings.website,
        sector: settings.sector,
        main_competitor: settings.main_competitor,
        other_competitors: settings.other_competitors,
      });
    }
  }, [settings]);

  const handleSave = () => {
    if (!settings) return;
    updateMutation.mutate({ id: settings.id, ...form });
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

      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Dados da Marca</h2>
          <div><Label>Nome da Marca</Label><Input value={form.brand_name} onChange={(e) => setForm((p) => ({ ...p, brand_name: e.target.value }))} className="mt-1" /></div>
          <div><Label>Website</Label><Input value={form.website} onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))} className="mt-1" /></div>
          <div><Label>Setor</Label><Input value={form.sector} onChange={(e) => setForm((p) => ({ ...p, sector: e.target.value }))} className="mt-1" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Concorrentes Monitorados</h2>
          <div><Label>Concorrente Principal</Label><Input value={form.main_competitor} onChange={(e) => setForm((p) => ({ ...p, main_competitor: e.target.value }))} className="mt-1" /></div>
          <div><Label>Outros Concorrentes</Label><Input value={form.other_competitors} onChange={(e) => setForm((p) => ({ ...p, other_competitors: e.target.value }))} className="mt-1" placeholder="Separados por vírgula..." /></div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Notificações</h2>
          <p className="text-sm text-muted-foreground">Configurações de alertas e relatórios por email.</p>
          <Separator />
          <p className="text-xs text-muted-foreground">Em breve — configurações de notificação serão adicionadas aqui.</p>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-primary text-primary-foreground">
        {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
      </Button>
    </div>
  );
}
