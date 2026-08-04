import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Download, Search, Mail, Clock, CalendarIcon, X, Zap, Trash2,
  ChevronLeft, ChevronRight, Eye, MessageCircle, UserCheck, Globe,
  Phone, StickyNote,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AdminKPICard } from "@/components/admin/AdminKPICard";
import { toast } from "sonner";
import * as XLSX from "xlsx";

type LeadStatus = "novo" | "contatado" | "qualificado" | "descartado";

const STATUS_LABEL: Record<LeadStatus, string> = {
  novo: "Novo",
  contatado: "Contatado",
  qualificado: "Qualificado",
  descartado: "Descartado",
};

const STATUS_STYLE: Record<LeadStatus, string> = {
  novo: "bg-primary/10 text-primary border-primary/30",
  contatado: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  qualificado: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  descartado: "bg-muted text-muted-foreground border-border",
};

interface LeadRow {
  id: string;
  email: string;
  name: string;
  site: string;
  phone: string;
  source: string;
  status: LeadStatus;
  status_updated_at: string | null;
  admin_notes: string;
  created_at: string;
}

const onlyDigits = (v: string) => (v || "").replace(/\D/g, "");

function waLink(phone: string, name: string) {
  const digits = onlyDigits(phone);
  const withCountry = digits.length > 11 ? digits : `55${digits}`;
  const msg = encodeURIComponent(
    `Olá${name ? ` ${name.split(" ")[0]}` : ""}, sou da Ivero. Vi que você rodou um diagnóstico de influência em IA no nosso site e queria te mostrar o que encontramos.`,
  );
  return `https://wa.me/${withCountry}?text=${msg}`;
}

function mailtoLink(email: string, name: string) {
  const subject = encodeURIComponent("Seu diagnóstico de influência em IA — Ivero");
  const body = encodeURIComponent(
    `Olá${name ? ` ${name.split(" ")[0]}` : ""},\n\nVi que você rodou um diagnóstico de influência em IA no nosso site. Posso te enviar a leitura completa do resultado?\n\nAbraço,\nEquipe Ivero`,
  );
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

export function AdminLeadsPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("acao"); // padrão: Novo + Contatado
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<LeadRow | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const perPage = 15;

  const { data, isLoading } = useQuery({
    queryKey: ["admin_leads_panel"],
    staleTime: 5 * 60 * 1000,
    placeholderData: (previous) => previous,
    queryFn: async () => {
      const [leadsRes, profilesRes] = await Promise.all([
        supabase.from("leads").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("email"),
      ]);
      if (leadsRes.error) throw leadsRes.error;
      const accountEmails = new Set(
        (profilesRes.data ?? [])
          .map((p) => (p.email ?? "").trim().toLowerCase())
          .filter(Boolean),
      );
      return {
        leads: (leadsRes.data ?? []) as unknown as LeadRow[],
        accountEmails,
      };
    },
  });

  const leads = data?.leads;
  const accountEmails = data?.accountEmails ?? new Set<string>();
  const hasAccount = (email: string) => accountEmails.has((email ?? "").trim().toLowerCase());

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LeadStatus }) => {
      const { error } = await supabase.from("leads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_leads_panel"] });
      toast.success("Status atualizado.");
    },
    onError: () => toast.error("Erro ao atualizar status."),
  });

  const notesMutation = useMutation({
    mutationFn: async ({ id, admin_notes }: { id: string; admin_notes: string }) => {
      const { error } = await supabase.from("leads").update({ admin_notes }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_leads_panel"] });
      toast.success("Anotação salva.");
    },
    onError: () => toast.error("Erro ao salvar anotação."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_leads_panel"] });
      toast.success("Lead excluído com sucesso.");
    },
    onError: () => toast.error("Erro ao excluir lead."),
  });

  const sources = useMemo(() => {
    const set = new Set<string>();
    leads?.forEach((l) => set.add(l.source));
    return Array.from(set).sort();
  }, [leads]);

  const hasActiveFilters =
    sourceFilter !== "all" || statusFilter !== "acao" || !!dateFrom || !!dateTo || !!search;

  const clearFilters = () => {
    setSourceFilter("all");
    setStatusFilter("acao");
    setDateFrom(undefined);
    setDateTo(undefined);
    setSearch("");
    setPage(1);
  };

  const filtered = useMemo(
    () =>
      leads?.filter((l) => {
        const q = search.toLowerCase();
        if (
          q &&
          !l.email.toLowerCase().includes(q) &&
          !l.name?.toLowerCase().includes(q) &&
          !l.phone?.includes(q)
        )
          return false;
        if (sourceFilter !== "all" && l.source !== sourceFilter) return false;
        if (statusFilter === "acao" && !(l.status === "novo" || l.status === "contatado"))
          return false;
        if (statusFilter !== "acao" && statusFilter !== "all" && l.status !== statusFilter)
          return false;
        const created = new Date(l.created_at);
        if (dateFrom && created < dateFrom) return false;
        if (dateTo) {
          const end = new Date(dateTo);
          end.setHours(23, 59, 59, 999);
          if (created > end) return false;
        }
        return true;
      }),
    [leads, search, sourceFilter, statusFilter, dateFrom, dateTo],
  );

  const total = leads?.length ?? 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const leadsToday = leads?.filter((l) => new Date(l.created_at) >= today).length ?? 0;
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const leadsWeek = leads?.filter((l) => new Date(l.created_at) >= weekAgo).length ?? 0;
  const pendentes = leads?.filter((l) => l.status === "novo").length ?? 0;

  const exportToExcel = () => {
    if (!filtered?.length) return;
    const rows = filtered.map((l) => ({
      Nome: l.name || "—",
      "E-mail": l.email,
      Site: l.site || "—",
      Celular: l.phone || "—",
      Origem: l.source,
      Status: STATUS_LABEL[l.status],
      "Tem conta": hasAccount(l.email) ? "Sim" : "Não",
      "Anotações": l.admin_notes || "—",
      "Status atualizado em": l.status_updated_at
        ? new Date(l.status_updated_at).toLocaleString("pt-BR")
        : "—",
      "Data Captura": new Date(l.created_at).toLocaleString("pt-BR"),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, `leads-ivero-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const openDetail = (l: LeadRow) => {
    setSelected(l);
    setNotesDraft(l.admin_notes || "");
  };

  if (isLoading && !leads) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground text-sm">Carregando...</p>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil((filtered?.length ?? 0) / perPage));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * perPage;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <p className="text-sm text-muted-foreground">
          Visitantes que preencheram o formulário do diagnóstico e ainda não criaram conta —{" "}
          {total} lead(s)
        </p>
        <Button onClick={exportToExcel} variant="outline" className="gap-2" disabled={!filtered?.length}>
          <Download className="h-4 w-4" /> Exportar Excel
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminKPICard icon={Mail} label="Total de Leads" value={total} />
        <AdminKPICard icon={Zap} label="Leads Hoje" value={leadsToday} accent="text-emerald-600" />
        <AdminKPICard icon={Clock} label="Últimos 7 dias" value={leadsWeek} accent="text-primary" />
        <AdminKPICard icon={UserCheck} label="Aguardando contato" value={pendentes} accent="text-amber-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar nome, e-mail ou telefone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>

        <div className="w-[190px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="acao">Novo + Contatado</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="novo">Novo</SelectItem>
              <SelectItem value="contatado">Contatado</SelectItem>
              <SelectItem value="qualificado">Qualificado</SelectItem>
              <SelectItem value="descartado">Descartado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-[180px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Origem</label>
          <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {sources.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">De</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Início"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Até</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, "dd/MM/yyyy") : "Fim"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
            <X className="h-3.5 w-3.5" /> Limpar filtros
          </Button>
        )}
      </div>

      {/* Table */}
      {filtered && filtered.length > 0 ? (
        <>
          <div className="border border-border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead className="w-[170px]">Status</TableHead>
                  <TableHead className="text-center">Captura</TableHead>
                  <TableHead className="text-center w-[110px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(start, start + perPage).map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{l.name || "—"}</span>
                        {hasAccount(l.email) && (
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                            Tem conta
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-foreground">{l.email}</div>
                      <div className="text-xs text-muted-foreground">{l.phone || ""}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{l.site || "—"}</TableCell>
                    <TableCell><Badge variant="secondary">{l.source}</Badge></TableCell>
                    <TableCell>
                      <Select
                        value={l.status}
                        onValueChange={(v) => statusMutation.mutate({ id: l.id, status: v as LeadStatus })}
                      >
                        <SelectTrigger className={cn("h-8 text-xs border", STATUS_STYLE[l.status])}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(STATUS_LABEL) as LeadStatus[]).map((s) => (
                            <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {new Date(l.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(l)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir lead?</AlertDialogTitle>
                              <AlertDialogDescription>
                                O lead <strong>{l.email}</strong> será removido permanentemente. Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(l.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                {start + 1}–{Math.min(safePage * perPage, filtered.length)} de {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                  .reduce<(number | string)[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    typeof p === "string" ? (
                      <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-sm">…</span>
                    ) : (
                      <Button key={p} variant={p === safePage ? "default" : "outline"} size="icon" className="h-8 w-8 text-xs" onClick={() => setPage(p)}>
                        {p}
                      </Button>
                    ),
                  )}
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Nenhum lead encontrado com os filtros atuais.
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl flex items-center gap-3 flex-wrap">
                  {selected.name || selected.email}
                  <Badge variant="outline" className={cn("text-xs border", STATUS_STYLE[selected.status])}>
                    {STATUS_LABEL[selected.status]}
                  </Badge>
                  {hasAccount(selected.email) && (
                    <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                      Tem conta
                    </Badge>
                  )}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5 mt-2">
                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Mail className="h-4 w-4 text-primary" /> Dados capturados
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium text-foreground">{selected.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium text-foreground">{selected.phone || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium text-foreground">{selected.site || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Capturado em {new Date(selected.created_at).toLocaleString("pt-BR")} · origem{" "}
                        {selected.source}
                      </span>
                    </div>
                    {selected.status_updated_at && (
                      <div className="text-xs text-muted-foreground">
                        Status alterado em {new Date(selected.status_updated_at).toLocaleString("pt-BR")}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" className="gap-2">
                    <a href={mailtoLink(selected.email, selected.name)}>
                      <Mail className="h-4 w-4" /> Enviar e-mail
                    </a>
                  </Button>
                  {selected.phone && (
                    <Button asChild variant="outline" className="gap-2">
                      <a href={waLink(selected.phone, selected.name)} target="_blank" rel="noreferrer">
                        <MessageCircle className="h-4 w-4" /> WhatsApp
                      </a>
                    </Button>
                  )}
                </div>

                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-primary" /> Follow-up
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                      <Select
                        value={selected.status}
                        onValueChange={(v) => {
                          statusMutation.mutate({ id: selected.id, status: v as LeadStatus });
                          setSelected({ ...selected, status: v as LeadStatus });
                        }}
                      >
                        <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(STATUS_LABEL) as LeadStatus[]).map((s) => (
                            <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                        <StickyNote className="h-3.5 w-3.5" /> Anotações internas
                      </label>
                      <Textarea
                        value={notesDraft}
                        onChange={(e) => setNotesDraft(e.target.value)}
                        rows={4}
                        placeholder="Contexto da conversa, objeções, próximo passo..."
                      />
                      <Button
                        size="sm"
                        className="mt-2"
                        disabled={notesDraft === (selected.admin_notes || "") || notesMutation.isPending}
                        onClick={() => {
                          notesMutation.mutate({ id: selected.id, admin_notes: notesDraft });
                          setSelected({ ...selected, admin_notes: notesDraft });
                        }}
                      >
                        Salvar anotação
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
