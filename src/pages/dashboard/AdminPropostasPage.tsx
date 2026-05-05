import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import {
  ShieldAlert, FileText, Search, X, Trash2, Copy, ExternalLink,
  TrendingUp, Eye, CheckCircle2, XCircle, Clock,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { AdminKPICard } from "@/components/admin/AdminKPICard";
import { InfoTooltip } from "@/components/InfoTooltip";
import { toast } from "sonner";
import { STATUS_LABELS, MOTIVO_RECUSA_LABELS, PLANOS } from "@/lib/pricing-rules";

const STATUS_COLORS: Record<string, string> = {
  enviada: "bg-blue-100 text-blue-700 border-blue-200",
  visualizada: "bg-amber-100 text-amber-700 border-amber-200",
  em_negociacao: "bg-purple-100 text-purple-700 border-purple-200",
  aceita: "bg-emerald-100 text-emerald-700 border-emerald-200",
  recusada: "bg-red-100 text-red-700 border-red-200",
  expirada: "bg-muted text-muted-foreground border-border",
};

interface Proposta {
  id: string;
  slug: string;
  empresa_nome: string;
  empresa_site: string;
  origem: string;
  score_geral: number;
  plano_sugerido: string;
  valor_proposto: number;
  valor_negociado: number | null;
  status: string;
  motivo_recusa_categoria: string | null;
  motivo_recusa_texto: string | null;
  notas_admin: string;
  expires_at: string;
  viewed_at: string | null;
  responded_at: string | null;
  created_at: string;
  diagnostico_snapshot: any;
}

export default function AdminPropostasPage() {
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [origemFilter, setOrigemFilter] = useState<string>("all");
  const [editing, setEditing] = useState<{ id: string; field: "valor_negociado" | "status" | "notas_admin" } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [drawer, setDrawer] = useState<Proposta | null>(null);

  const { data: propostas, isLoading } = useQuery({
    queryKey: ["admin_propostas"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("propostas")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Proposta[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Proposta> }) => {
      const { error } = await supabase.from("propostas").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_propostas"] });
      toast.success("Atualizado");
      setEditing(null);
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao atualizar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("propostas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_propostas"] });
      toast.success("Proposta excluída");
    },
  });

  const filtered = useMemo(() => {
    return (propostas || []).filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (origemFilter !== "all" && p.origem !== origemFilter) return false;
      const q = search.toLowerCase();
      if (q && !p.empresa_nome?.toLowerCase().includes(q) && !p.empresa_site?.toLowerCase().includes(q) && !p.slug?.includes(q)) return false;
      return true;
    });
  }, [propostas, statusFilter, origemFilter, search]);

  // Métricas
  const metrics = useMemo(() => {
    const list = propostas || [];
    const total = list.length;
    const visualizadas = list.filter((p) => p.viewed_at).length;
    const aceitas = list.filter((p) => p.status === "aceita").length;
    const respondidas = list.filter((p) => p.responded_at).length;
    const ticketMedio = aceitas > 0
      ? list.filter((p) => p.status === "aceita").reduce((s, p) => s + Number(p.valor_negociado ?? p.valor_proposto), 0) / aceitas
      : 0;
    const taxaVisualizacao = total > 0 ? Math.round((visualizadas / total) * 100) : 0;
    const taxaAceitacao = total > 0 ? Math.round((aceitas / total) * 100) : 0;

    // Mapa de objeções
    const objecoes: Record<string, number> = {};
    list.filter((p) => p.status === "recusada" && p.motivo_recusa_categoria).forEach((p) => {
      const k = p.motivo_recusa_categoria!;
      objecoes[k] = (objecoes[k] || 0) + 1;
    });

    return { total, visualizadas, aceitas, respondidas, ticketMedio, taxaVisualizacao, taxaAceitacao, objecoes };
  }, [propostas]);

  const copyLink = (slug: string, origem: string) => {
    const path = origem === "convite" ? "convite" : "propostacomercial";
    const url = `${window.location.origin}/${path}/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  };

  const startEdit = (id: string, field: "valor_negociado" | "status" | "notas_admin", current: any) => {
    setEditing({ id, field });
    setEditValue(current == null ? "" : String(current));
  };

  const commitEdit = () => {
    if (!editing) return;
    const patch: any = {};
    if (editing.field === "valor_negociado") {
      const num = parseFloat(editValue.replace(",", "."));
      if (isNaN(num)) return setEditing(null);
      patch.valor_negociado = num;
    } else if (editing.field === "status") {
      patch.status = editValue;
    } else if (editing.field === "notas_admin") {
      patch.notas_admin = editValue;
    }
    updateMutation.mutate({ id: editing.id, patch });
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
          <FileText className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-1">
              Propostas
              <InfoTooltip text="CRM completo das propostas comerciais geradas via /preview ou criadas como convite. Edite valor negociado, status e notas inline." />
            </h1>
            <p className="text-sm text-muted-foreground">{metrics.total} proposta(s) no funil</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <AdminKPICard icon={FileText} label="Total" value={metrics.total} />
        <AdminKPICard icon={Eye} label="Taxa visualização" value={`${metrics.taxaVisualizacao}%`} accent="text-blue-600" />
        <AdminKPICard icon={CheckCircle2} label="Aceitas" value={metrics.aceitas} accent="text-emerald-600" />
        <AdminKPICard icon={TrendingUp} label="Taxa aceitação" value={`${metrics.taxaAceitacao}%`} accent="text-primary" />
        <AdminKPICard icon={Clock} label="Ticket médio" value={metrics.ticketMedio > 0 ? `R$ ${Math.round(metrics.ticketMedio)}` : "—"} />
      </div>

      {/* Mapa de objeções */}
      {Object.keys(metrics.objecoes).length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" /> Mapa de objeções
          </h2>
          <div className="space-y-2">
            {Object.entries(metrics.objecoes)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, count]) => {
                const pct = Math.round((count / metrics.total) * 100);
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-40 truncate">{MOTIVO_RECUSA_LABELS[cat] || cat}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-red-400" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-medium text-foreground w-10 text-right">{count}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar empresa, site ou slug..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="w-[160px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-[140px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Origem</label>
          <Select value={origemFilter} onValueChange={setOrigemFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="preview">Preview</SelectItem>
              <SelectItem value="convite">Convite</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(statusFilter !== "all" || origemFilter !== "all" || search) && (
          <Button variant="ghost" size="sm" onClick={() => { setStatusFilter("all"); setOrigemFilter("all"); setSearch(""); }} className="gap-1 text-muted-foreground">
            <X className="h-3.5 w-3.5" /> Limpar
          </Button>
        )}
      </div>

      {/* Table */}
      {filtered.length > 0 ? (
        <div className="border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead className="text-right">Proposto</TableHead>
                <TableHead className="text-right">Negociado</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead className="text-center">Expira</TableHead>
                <TableHead className="text-center w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const dias = Math.ceil((new Date(p.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setDrawer(p)}>
                    <TableCell className="font-medium text-foreground" onClick={(e) => e.stopPropagation()}>
                      <div>
                        {p.empresa_nome || "—"}
                        <div className="text-xs text-muted-foreground">{p.empresa_site}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-display font-bold">{p.score_geral}</TableCell>
                    <TableCell className="text-sm">{PLANOS[p.plano_sugerido as keyof typeof PLANOS]?.name || p.plano_sugerido}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">R$ {Number(p.valor_proposto).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right text-sm" onClick={(e) => { e.stopPropagation(); startEdit(p.id, "valor_negociado", p.valor_negociado); }}>
                      {editing?.id === p.id && editing.field === "valor_negociado" ? (
                        <Input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(null); }}
                          className="h-7 w-24 text-right"
                        />
                      ) : (
                        <span className="font-medium text-foreground">
                          {p.valor_negociado != null ? `R$ ${Number(p.valor_negociado).toLocaleString("pt-BR")}` : "—"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select value={p.status} onValueChange={(v) => updateMutation.mutate({ id: p.id, patch: { status: v } as any })}>
                        <SelectTrigger className={`h-7 text-xs border ${STATUS_COLORS[p.status]}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{p.origem}</Badge></TableCell>
                    <TableCell className="text-center text-xs">
                      {p.status === "expirada" || dias < 0 ? (
                        <span className="text-muted-foreground">expirada</span>
                      ) : (
                        <span className={dias <= 2 ? "text-red-600 font-medium" : "text-muted-foreground"}>{dias}d</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyLink(p.slug, p.origem)} title="Copiar link">
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <a href={`/${p.origem === "convite" ? "convite" : "propostacomercial"}/${p.slug}`} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Abrir">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir proposta?</AlertDialogTitle>
                              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(p.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground text-sm">Nenhuma proposta encontrada.</div>
      )}

      {/* Drawer detalhe */}
      <Sheet open={!!drawer} onOpenChange={(o) => !o && setDrawer(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {drawer && (
            <>
              <SheetHeader>
                <SheetTitle>{drawer.empresa_nome || drawer.empresa_site}</SheetTitle>
                <SheetDescription>
                  Slug: <code className="text-xs">{drawer.slug}</code>
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-5 mt-6">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">Score</p><p className="font-bold">{drawer.score_geral}</p></div>
                  <div><p className="text-xs text-muted-foreground">Plano</p><p className="font-bold">{PLANOS[drawer.plano_sugerido as keyof typeof PLANOS]?.name}</p></div>
                  <div><p className="text-xs text-muted-foreground">Criada em</p><p>{new Date(drawer.created_at).toLocaleString("pt-BR")}</p></div>
                  <div><p className="text-xs text-muted-foreground">Expira em</p><p>{new Date(drawer.expires_at).toLocaleString("pt-BR")}</p></div>
                  <div><p className="text-xs text-muted-foreground">Visualizada</p><p>{drawer.viewed_at ? new Date(drawer.viewed_at).toLocaleString("pt-BR") : "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Respondida</p><p>{drawer.responded_at ? new Date(drawer.responded_at).toLocaleString("pt-BR") : "—"}</p></div>
                </div>

                {drawer.status === "recusada" && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm">
                    <p className="font-medium text-red-900">Motivo: {MOTIVO_RECUSA_LABELS[drawer.motivo_recusa_categoria || ""] || "—"}</p>
                    {drawer.motivo_recusa_texto && <p className="text-red-700 text-xs mt-1">{drawer.motivo_recusa_texto}</p>}
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Notas do admin (privado)</label>
                  <Textarea
                    defaultValue={drawer.notas_admin}
                    onBlur={(e) => updateMutation.mutate({ id: drawer.id, patch: { notas_admin: e.target.value } as any })}
                    placeholder="Anotações internas..."
                    className="mt-1.5"
                  />
                </div>

                <details className="rounded-lg border border-border p-3 text-xs">
                  <summary className="cursor-pointer font-medium">Snapshot do diagnóstico</summary>
                  <pre className="mt-2 overflow-auto max-h-64 text-[10px] bg-muted/40 p-2 rounded">
                    {JSON.stringify(drawer.diagnostico_snapshot, null, 2)}
                  </pre>
                </details>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
