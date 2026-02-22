import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  ShieldAlert, Users, Download, Search, TrendingUp, TrendingDown,
  AlertTriangle, Clock, UserCheck, UserX, BarChart3, Eye, Filter,
  CalendarIcon, X,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminKPICard } from "@/components/admin/AdminKPICard";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import * as XLSX from "xlsx";

interface ClientRow {
  user_id: string;
  display_name: string | null;
  created_at: string;
  onboarding?: {
    question_1: string;
    question_2: string;
    question_3: string;
    completed: boolean;
    created_at: string;
  } | null;
  brand?: {
    brand_name: string;
    sector: string;
    website: string;
    main_competitor: string;
  } | null;
  campaigns_count: number;
}

export default function AdminClientesPage() {
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [diagFilter, setDiagFilter] = useState<string>("all");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const { data: clients, isLoading } = useQuery({
    queryKey: ["admin_clients_full"],
    enabled: isAdmin,
    queryFn: async () => {
      // Fetch profiles
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, display_name, created_at")
        .order("created_at", { ascending: false });
      if (pErr) throw pErr;
      if (!profiles?.length) return [];

      const userIds = profiles.map((p) => p.user_id);

      // Fetch onboarding, brand_settings, campaigns in parallel
      const [onboardingRes, brandRes, campaignsRes, rolesRes] = await Promise.all([
        supabase.from("client_onboarding").select("*").in("user_id", userIds),
        supabase.from("brand_settings").select("*").in("user_id", userIds),
        supabase.from("campaigns").select("user_id").in("user_id", userIds),
        supabase.from("user_roles").select("user_id, role"),
      ]);

      const onboardingMap = new Map(
        (onboardingRes.data ?? []).map((o) => [o.user_id, o])
      );
      const brandMap = new Map(
        (brandRes.data ?? []).map((b) => [b.user_id, b])
      );
      const adminIds = new Set(
        (rolesRes.data ?? []).filter((r) => r.role === "admin").map((r) => r.user_id)
      );

      // Count campaigns per user
      const campaignCounts = new Map<string, number>();
      (campaignsRes.data ?? []).forEach((c) => {
        campaignCounts.set(c.user_id!, (campaignCounts.get(c.user_id!) ?? 0) + 1);
      });

      return profiles
        .filter((p) => !adminIds.has(p.user_id)) // exclude admins from client list
        .map((p): ClientRow => ({
          user_id: p.user_id,
          display_name: p.display_name,
          created_at: p.created_at,
          onboarding: onboardingMap.get(p.user_id) ?? null,
          brand: brandMap.get(p.user_id) ?? null,
          campaigns_count: campaignCounts.get(p.user_id) ?? 0,
        }));
    },
  });

  // Unique sectors for filter
  const sectors = useMemo(() => {
    const set = new Set<string>();
    clients?.forEach((c) => {
      if (c.brand?.sector) set.add(c.brand.sector);
    });
    return Array.from(set).sort();
  }, [clients]);

  const hasActiveFilters = diagFilter !== "all" || sectorFilter !== "all" || !!dateFrom || !!dateTo;

  const clearFilters = () => {
    setDiagFilter("all");
    setSectorFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setSearch("");
  };

  const filtered = clients?.filter((c) => {
    // Text search
    const term = search.toLowerCase();
    if (term && !(
      (c.display_name?.toLowerCase().includes(term)) ||
      (c.brand?.brand_name?.toLowerCase().includes(term)) ||
      (c.brand?.sector?.toLowerCase().includes(term))
    )) return false;

    // Diagnostic filter
    if (diagFilter === "completed" && !c.onboarding?.completed) return false;
    if (diagFilter === "pending" && c.onboarding?.completed) return false;

    // Sector filter
    if (sectorFilter !== "all" && c.brand?.sector !== sectorFilter) return false;

    // Date range
    const created = new Date(c.created_at);
    if (dateFrom && created < dateFrom) return false;
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      if (created > end) return false;
    }

    return true;
  });

  // Analytics
  const total = clients?.length ?? 0;
  const withOnboarding = clients?.filter((c) => c.onboarding?.completed).length ?? 0;
  const withBrand = clients?.filter((c) => c.brand).length ?? 0;
  const withCampaigns = clients?.filter((c) => c.campaigns_count > 0).length ?? 0;

  const exportToExcel = () => {
    if (!filtered?.length) return;
    const rows = filtered.map((c) => ({
      Nome: c.display_name || "Sem nome",
      Marca: c.brand?.brand_name || "—",
      Setor: c.brand?.sector || "—",
      Site: c.brand?.website || "—",
      "Concorrente Principal": c.brand?.main_competitor || "—",
      "Diagnóstico Concluído": c.onboarding?.completed ? "Sim" : "Não",
      "Percepção (Q1)": c.onboarding?.question_1 || "—",
      "Ambição (Q2)": c.onboarding?.question_2 || "—",
      "Risco (Q3)": c.onboarding?.question_3 || "—",
      Campanhas: c.campaigns_count,
      "Data Cadastro": new Date(c.created_at).toLocaleDateString("pt-BR"),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    XLSX.writeFile(wb, `clientes-ivero-${new Date().toISOString().slice(0, 10)}.xlsx`);
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
          <Users className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
            <p className="text-sm text-muted-foreground">
              Perfis, diagnósticos e análises — {total} cliente(s)
            </p>
          </div>
        </div>
        <Button onClick={exportToExcel} variant="outline" className="gap-2" disabled={!filtered?.length}>
          <Download className="h-4 w-4" /> Exportar Excel
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminKPICard icon={Users} label="Total de Clientes" value={total} />
        <AdminKPICard
          icon={UserCheck}
          label="Diagnóstico Concluído"
          value={withOnboarding}
          subtitle={total > 0 ? `${Math.round((withOnboarding / total) * 100)}%` : "0%"}
          accent="text-emerald-600"
        />
        <AdminKPICard
          icon={BarChart3}
          label="Marca Configurada"
          value={withBrand}
          subtitle={total > 0 ? `${Math.round((withBrand / total) * 100)}%` : "0%"}
          accent="text-primary"
        />
        <AdminKPICard
          icon={TrendingUp}
          label="Com Campanhas"
          value={withCampaigns}
          subtitle={total > 0 ? `${Math.round((withCampaigns / total) * 100)}%` : "0%"}
          accent="text-amber-600"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Search */}
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar nome, marca, setor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Diagnostic status */}
        <div className="w-[180px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Diagnóstico</label>
          <Select value={diagFilter} onValueChange={setDiagFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sector */}
        <div className="w-[180px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Setor</label>
          <Select value={sectorFilter} onValueChange={setSectorFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {sectors.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date from */}
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
              <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
        </div>

        {/* Date to */}
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
              <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
        </div>

        {/* Clear filters */}
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
                <TableHead>Cliente</TableHead>
                <TableHead>Marca / Setor</TableHead>
                <TableHead className="text-center">Diagnóstico</TableHead>
                <TableHead className="text-center">Campanhas</TableHead>
                <TableHead className="text-center">Cadastro</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.user_id}>
                  <TableCell className="font-medium text-foreground">
                    {c.display_name || "Sem nome"}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-foreground">{c.brand?.brand_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{c.brand?.sector || ""}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={c.onboarding?.completed ? "default" : "secondary"}>
                      {c.onboarding?.completed ? "Concluído" : "Pendente"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-semibold text-foreground">
                    {c.campaigns_count}
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedClient(c)}
                      className="gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" /> Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Nenhum cliente encontrado.
        </div>
      )}

      {/* Client Detail Dialog */}
      <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedClient && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">
                  {selectedClient.display_name || "Sem nome"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Profile */}
                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" /> Perfil
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Marca:</span>{" "}
                      <span className="font-medium text-foreground">{selectedClient.brand?.brand_name || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Setor:</span>{" "}
                      <span className="font-medium text-foreground">{selectedClient.brand?.sector || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Site:</span>{" "}
                      <span className="font-medium text-foreground">{selectedClient.brand?.website || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Concorrente:</span>{" "}
                      <span className="font-medium text-foreground">{selectedClient.brand?.main_competitor || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Campanhas:</span>{" "}
                      <span className="font-semibold text-foreground">{selectedClient.campaigns_count}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cadastro:</span>{" "}
                      <span className="font-medium text-foreground">
                        {new Date(selectedClient.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Diagnostic */}
                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" /> Diagnóstico de Onboarding
                      <Badge variant={selectedClient.onboarding?.completed ? "default" : "secondary"} className="ml-auto">
                        {selectedClient.onboarding?.completed ? "Concluído" : "Pendente"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedClient.onboarding ? (
                      <>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            Percepção
                          </p>
                          <p className="text-sm text-foreground bg-secondary/50 rounded-lg p-3">
                            {selectedClient.onboarding.question_1 || "Sem resposta"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            Ambição
                          </p>
                          <p className="text-sm text-foreground bg-secondary/50 rounded-lg p-3">
                            {selectedClient.onboarding.question_2 || "Sem resposta"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            Risco
                          </p>
                          <p className="text-sm text-foreground bg-secondary/50 rounded-lg p-3">
                            {selectedClient.onboarding.question_3 || "Sem resposta"}
                          </p>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Diagnóstico não iniciado.</p>
                    )}
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
