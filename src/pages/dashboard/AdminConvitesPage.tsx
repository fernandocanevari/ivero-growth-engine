import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ShieldAlert, Mail, Plus, Copy, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { InfoTooltip } from "@/components/InfoTooltip";

interface ConviteRow {
  id: string;
  slug: string;
  empresa_nome: string;
  empresa_site: string;
  contato_nome: string | null;
  contato_email: string | null;
  contato_telefone: string | null;
  status: string;
  score_geral: number;
  viewed_at: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  enviada: "Enviada",
  visualizada: "Visualizada",
  em_negociacao: "Em negociação",
  aceita: "Aceita",
  recusada: "Recusada",
  expirada: "Expirada",
};

export default function AdminConvitesPage() {
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ empresa_nome: "", empresa_site: "", contato_nome: "", contato_email: "", contato_telefone: "" });
  const [creating, setCreating] = useState(false);

  const { data: convites, isLoading } = useQuery({
    queryKey: ["admin_convites"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("propostas")
        .select("id, slug, empresa_nome, empresa_site, contato_nome, contato_email, contato_telefone, status, score_geral, viewed_at, created_at")
        .eq("origem", "convite")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ConviteRow[];
    },
  });

  const handleCreate = async () => {
    if (!form.empresa_site.trim()) {
      toast.error("Informe o site da empresa");
      return;
    }
    setCreating(true);

    try {
      // 1. Roda simulate-ai para gerar a auditoria
      toast.info("Gerando auditoria... isso pode levar até 30s");
      const { data: aiData, error: aiErr } = await supabase.functions.invoke("simulate-ai", {
        body: { url: form.empresa_site, mode: "diagnostico" },
      });
      if (aiErr) throw aiErr;

      // 2. Calcula score e radar a partir do retorno
      const pillarKeys = ["Clareza", "Autoridade", "Conversão", "Posicionamento", "Relevância"];
      const modelResults = (aiData as any)?.results || [];
      const radar = pillarKeys.map((name) => {
        const scores = modelResults.filter((r: any) => !r.error).map((r: any) => r.pillars?.[name]?.score || 0);
        const avg = scores.length ? Math.round(scores.reduce((s: number, v: number) => s + v, 0) / scores.length) : 0;
        return { subject: name, value: avg, fullMark: 100 };
      });
      const totalScore = Math.round(radar.reduce((s, r) => s + r.value, 0) / radar.length);

      // 3. Cria proposta via edge function
      const { data: propData, error: propErr } = await supabase.functions.invoke("gerar-proposta-from-preview", {
        body: {
          empresa_nome: form.empresa_nome || form.empresa_site,
          empresa_site: form.empresa_site,
          contato_nome: form.contato_nome || null,
          contato_email: form.contato_email || null,
          contato_telefone: form.contato_telefone || null,
          origem: "convite",
          score_geral: totalScore,
          diagnostico_snapshot: { radar, siteUrl: form.empresa_site, keyword_cloud: (aiData as any)?.keyword_cloud || [] },
        },
      });
      if (propErr || !propData?.slug) throw propErr || new Error("Falha ao criar proposta");

      toast.success("Convite criado");
      qc.invalidateQueries({ queryKey: ["admin_convites"] });
      setOpen(false);
      setForm({ empresa_nome: "", empresa_site: "", contato_nome: "", contato_email: "", contato_telefone: "" });
    } catch (e: any) {
      toast.error(e?.message || "Erro ao criar convite");
    } finally {
      setCreating(false);
    }
  };

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/convite/${slug}`);
    toast.success("Link copiado");
  };

  if (roleLoading || isLoading) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground text-sm">Carregando...</p></div>;
  }
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <ShieldAlert className="h-10 w-10 text-destructive" />
        <p className="text-muted-foreground text-sm">Acesso restrito a administradores.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Mail className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-1">
              Convites
              <InfoTooltip text="Crie convites personalizados com auditoria pré-gerada — envie o link único para o prospect ver a proposta sob medida." />
            </h1>
            <p className="text-sm text-muted-foreground">{convites?.length || 0} convite(s) criado(s)</p>
          </div>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Novo convite</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo convite comercial</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label>Site da empresa *</Label>
                <Input placeholder="ex: empresa.com.br" value={form.empresa_site} onChange={(e) => setForm({ ...form, empresa_site: e.target.value })} />
              </div>
              <div>
                <Label>Nome da empresa</Label>
                <Input value={form.empresa_nome} onChange={(e) => setForm({ ...form, empresa_nome: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Contato</Label>
                  <Input value={form.contato_nome} onChange={(e) => setForm({ ...form, contato_nome: e.target.value })} />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input type="email" value={form.contato_email} onChange={(e) => setForm({ ...form, contato_email: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={form.contato_telefone} onChange={(e) => setForm({ ...form, contato_telefone: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={creating}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando...</>) : "Gerar convite"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {convites && convites.length > 0 ? (
        <div className="border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Criado</TableHead>
                <TableHead className="text-center w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {convites.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="font-medium">{c.empresa_nome || c.empresa_site}</div>
                    <div className="text-xs text-muted-foreground">{c.empresa_site}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.contato_nome || "—"}
                    {c.contato_email && <div className="text-xs text-muted-foreground">{c.contato_email}</div>}
                  </TableCell>
                  <TableCell className="text-center font-bold">{c.score_geral}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs">{STATUS_LABELS[c.status]}</Badge></TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyLink(c.slug)} title="Copiar link"><Copy className="h-3.5 w-3.5" /></Button>
                      <a href={`/convite/${c.slug}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Abrir"><ExternalLink className="h-3.5 w-3.5" /></Button>
                      </a>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground text-sm">Nenhum convite criado. Clique em "Novo convite" para começar.</div>
      )}
    </div>
  );
}
