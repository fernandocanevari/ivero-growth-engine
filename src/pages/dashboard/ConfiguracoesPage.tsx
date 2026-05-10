import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Upload, Building2 } from "lucide-react";
import { useBrandSettings, useUpdateBrandSettings } from "@/hooks/useBrandSettings";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { formatPhoneBR } from "@/lib/format-phone";

export default function ConfiguracoesPage() {
  const { data: settings, isLoading } = useBrandSettings();
  const updateMutation = useUpdateBrandSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    brand_name: "",
    website: "",
    sector: "",
    main_competitor: "",
    other_competitors: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    logo_url: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        brand_name: settings.brand_name,
        website: settings.website,
        sector: settings.sector,
        main_competitor: settings.main_competitor,
        other_competitors: settings.other_competitors,
        contact_name: settings.contact_name || "",
        contact_email: settings.contact_email || "",
        contact_phone: settings.contact_phone || "",
        logo_url: settings.logo_url || "",
      });
    }
  }, [settings]);

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (settings) {
      updateMutation.mutate({ id: settings.id, ...form });
    } else {
      const { error } = await supabase.from("brand_settings").insert({ ...form, user_id: user.id });
      if (error) {
        toast({ title: "Erro ao salvar", variant: "destructive" });
      } else {
        qc.invalidateQueries({ queryKey: ["brand_settings"] });
        toast({ title: "Configurações salvas!" });
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


      <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-primary text-primary-foreground">
        {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
      </Button>
    </div>
  );
}
