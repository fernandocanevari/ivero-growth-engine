import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  ShieldAlert, Download, Search, Mail, Globe, Clock,
  CalendarIcon, X, Zap,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminKPICard } from "@/components/admin/AdminKPICard";
import { InfoTooltip } from "@/components/InfoTooltip";
import * as XLSX from "xlsx";

interface LeadRow {
  id: string;
  email: string;
  source: string;
  created_at: string;
}

export default function AdminLeadsPage() {
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const { data: leads, isLoading } = useQuery({
    queryKey: ["admin_leads"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as LeadRow[];
    },
  });

  const sources = useMemo(() => {
    const set = new Set<string>();
    leads?.forEach((l) => set.add(l.source));
    return Array.from(set).sort();
  }, [leads]);

  const hasActiveFilters = sourceFilter !== "all" || !!dateFrom || !!dateTo || !!search;

  const clearFilters = () => {
    setSourceFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setSearch("");
  };

  const filtered = leads?.filter((l) => {
    if (search && !l.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (sourceFilter !== "all" && l.source !== sourceFilter) return false;
    const created = new Date(l.created_at);
    if (dateFrom && created < dateFrom) return false;
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      if (created > end) return false;
    }
    return true;
  });

  const total = leads?.length ?? 0;

  // Leads today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const leadsToday = leads?.filter((l) => new Date(l.created_at) >= today).length ?? 0;

  // Leads this week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const leadsWeek = leads?.filter((l) => new Date(l.created_at) >= weekAgo).length ?? 0;

  const exportToExcel = () => {
    if (!filtered?.length) return;
    const rows = filtered.map((l) => ({
      "E-mail": l.email,
      Origem: l.source,
      "Data Captura": new Date(l.created_at).toLocaleString("pt-BR"),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, `leads-ivero-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (roleLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground text-sm">Carregando...</p>
      </div>
    );
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
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Mail className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-1">
              Leads
              <InfoTooltip text="E-mails capturados nos formulários de conversão do site. Exporte para Excel para integrar com seu CRM." />
            </h1>
            <p className="text-sm text-muted-foreground">
              {total} lead(s) capturado(s)
            </p>
          </div>
        </div>
        <Button onClick={exportToExcel} variant="outline" className="gap-2" disabled={!filtered?.length}>
          <Download className="h-4 w-4" /> Exportar Excel
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AdminKPICard icon={Mail} label="Total de Leads" value={total} />
        <AdminKPICard icon={Zap} label="Leads Hoje" value={leadsToday} accent="text-emerald-600" />
        <AdminKPICard icon={Clock} label="Últimos 7 dias" value={leadsWeek} accent="text-primary" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="w-[180px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Origem</label>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {sources.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
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
        <div className="border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-mail</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead className="text-center">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium text-foreground">{l.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{l.source}</Badge>
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {new Date(l.created_at).toLocaleString("pt-BR")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Nenhum lead encontrado.
        </div>
      )}
    </div>
  );
}
