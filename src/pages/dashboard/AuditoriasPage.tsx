import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  History, ArrowRight, Trash2, Globe, Search, Calendar as CalendarIcon,
  X, GitCompareArrows, ArrowUpRight, ArrowDownRight, Minus, Brain,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuditReports, type AuditReport } from "@/hooks/useAuditReports";
import { EmptyStatePage } from "@/components/dashboard/EmptyStatePage";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { type DateRange } from "react-day-picker";

function getScoreBand(score: number) {
  if (score < 40) return { label: "Crítico", cls: "bg-red-50 text-red-700 border-red-200/60" };
  if (score < 60) return { label: "Insuficiente", cls: "bg-orange-50 text-orange-700 border-orange-200/60" };
  if (score < 75) return { label: "Moderado", cls: "bg-amber-50 text-amber-700 border-amber-200/60" };
  if (score < 90) return { label: "Sólido", cls: "bg-sky-50 text-sky-700 border-sky-200/60" };
  return { label: "Referência", cls: "bg-emerald-50 text-emerald-700 border-emerald-200/60" };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ── Comparison helpers ── */
interface RadarPoint { subject: string; value: number }

function readRadar(r: AuditReport): RadarPoint[] {
  return ((r.radar_data ?? []) as unknown as RadarPoint[]).filter(
    (p) => p && typeof p.subject === "string" && typeof p.value === "number",
  );
}

function DeltaCell({ value }: { value: number }) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground tabular-nums">
        <Minus className="w-3 h-3" /> 0
      </span>
    );
  }
  const positive = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${
        positive ? "text-emerald-600" : "text-red-600"
      }`}
    >
      {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {positive ? "+" : ""}{value}
    </span>
  );
}

/** Modal de comparação lado a lado de dois relatórios. */
function CompareDialog({
  open,
  onOpenChange,
  a,
  b,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  a: AuditReport | null;
  b: AuditReport | null;
}) {
  if (!a || !b) return null;

  // Garante: A = mais antigo, B = mais recente — para deltas significarem "evolução de A → B"
  const [older, newer] =
    new Date(a.created_at).getTime() <= new Date(b.created_at).getTime() ? [a, b] : [b, a];

  const radarOlder = readRadar(older);
  const radarNewer = readRadar(newer);
  const subjects = Array.from(
    new Set([...radarOlder.map((r) => r.subject), ...radarNewer.map((r) => r.subject)]),
  );
  const rows = subjects.map((subject) => {
    const oVal = radarOlder.find((r) => r.subject === subject)?.value ?? 0;
    const nVal = radarNewer.find((r) => r.subject === subject)?.value ?? 0;
    return { subject, older: oVal, newer: nVal, delta: nVal - oVal };
  });
  const overallDelta = newer.overall_score - older.overall_score;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompareArrows className="w-4 h-4 text-primary" />
            Comparativo de Relatórios
          </DialogTitle>
          <DialogDescription>
            Variação dos pilares entre dois relatórios selecionados.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="text-muted-foreground font-semibold uppercase tracking-wider">Pilar</div>
          <div className="text-center space-y-0.5">
            <div className="font-semibold text-foreground">Anterior</div>
            <div className="text-muted-foreground">{formatDate(older.created_at)}</div>
          </div>
          <div className="text-center space-y-0.5">
            <div className="font-semibold text-foreground">Mais recente</div>
            <div className="text-muted-foreground">{formatDate(newer.created_at)}</div>
          </div>
        </div>

        <div className="rounded-xl border border-border divide-y divide-border">
          {/* Score geral */}
          <div className="grid grid-cols-3 gap-3 p-3 items-center bg-muted/30">
            <div className="text-sm font-semibold text-foreground">Score Geral</div>
            <div className="text-center text-lg font-display font-bold text-foreground tabular-nums">
              {older.overall_score}
            </div>
            <div className="text-center flex items-center justify-center gap-2">
              <span className="text-lg font-display font-bold text-foreground tabular-nums">
                {newer.overall_score}
              </span>
              <DeltaCell value={overallDelta} />
            </div>
          </div>
          {rows.map((r) => (
            <div key={r.subject} className="grid grid-cols-3 gap-3 p-3 items-center">
              <div className="text-sm text-foreground">{r.subject}</div>
              <div className="text-center text-sm tabular-nums text-muted-foreground">{r.older}</div>
              <div className="text-center flex items-center justify-center gap-2">
                <span className="text-sm tabular-nums text-foreground">{r.newer}</span>
                <DeltaCell value={r.delta} />
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <p className="text-xs text-muted-foreground">
            Deltas comparam o relatório mais recente em relação ao anterior.
          </p>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to={`/dashboard/auditorias/${older.id}`}>Abrir anterior</Link>
            </Button>
            <Button asChild size="sm">
              <Link to={`/dashboard/auditorias/${newer.id}`}>Abrir mais recente</Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AuditoriasPage() {
  const { reports, isLoading, remove } = useAuditReports();
  const { data: settings } = useBrandSettings();
  const hasBrand = !!settings?.brand_name;

  // ── Filtros ──
  const [query, setQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // ── Modo comparação ──
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports.filter((r) => {
      if (q && !(r.site_url ?? "").toLowerCase().includes(q)) return false;
      const created = new Date(r.created_at);
      if (dateRange?.from && created < dateRange.from) return false;
      if (dateRange?.to) {
        // include the whole "to" day
        const end = new Date(dateRange.to);
        end.setHours(23, 59, 59, 999);
        if (created > end) return false;
      }
      return true;
    });
  }, [reports, query, dateRange]);

  if (isLoading) return null;

  if (reports.length === 0) {
    return (
      <EmptyStatePage
        icon={<History className="h-12 w-12" />}
        title="Histórico de Auditorias"
        subtitle="Acesse todos os relatórios de auditoria já gerados para sua marca."
        message="Nenhuma auditoria salva ainda. Rode seu primeiro Diagnóstico para começar a montar seu histórico."
        hasBrand={hasBrand}
      />
    );
  }

  const handleDelete = (id: string) => {
    if (!confirm("Remover esta auditoria do histórico? Esta ação não pode ser desfeita.")) return;
    remove.mutate(id, {
      onSuccess: () => {
        toast.success("Auditoria removida");
        setSelected((prev) => prev.filter((s) => s !== id));
      },
      onError: () => toast.error("Erro ao remover auditoria"),
    });
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) {
        toast.info("Você só pode comparar 2 auditorias por vez. Desmarque uma para trocar.");
        return prev;
      }
      return [...prev, id];
    });
  };

  const reportA = reports.find((r) => r.id === selected[0]) ?? null;
  const reportB = reports.find((r) => r.id === selected[1]) ?? null;

  const clearFilters = () => {
    setQuery("");
    setDateRange(undefined);
  };

  const filtersActive = query.trim().length > 0 || !!dateRange?.from || !!dateRange?.to;

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-ivero-gradient shadow-sm">
              <History className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-foreground">Histórico de Auditorias</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {reports.length} {reports.length === 1 ? "auditoria salva" : "auditorias salvas"}
                {filtersActive && ` · ${filtered.length} após filtro`}
              </p>
            </div>
          </div>

          <Button
            variant={compareMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setCompareMode((v) => !v);
              setSelected([]);
            }}
            className="gap-1.5"
          >
            <GitCompareArrows className="w-4 h-4" />
            {compareMode ? "Sair do modo comparação" : "Comparar auditorias"}
          </Button>
        </div>
      </motion.div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por site (ex.: minhamarca.com)..."
              className="pl-9"
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="default"
                className={cn(
                  "justify-start text-left font-normal gap-2 sm:w-[260px]",
                  !dateRange?.from && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="w-4 h-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd/MM/yy", { locale: ptBR })} —{" "}
                      {format(dateRange.to, "dd/MM/yy", { locale: ptBR })}
                    </>
                  ) : (
                    format(dateRange.from, "dd/MM/yy", { locale: ptBR })
                  )
                ) : (
                  <span>Intervalo de datas</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                locale={ptBR}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5">
              <X className="w-4 h-4" />
              Limpar
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Barra de comparação */}
      {compareMode && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-foreground">
                <strong>{selected.length}/2</strong> auditorias selecionadas para comparação.
                {selected.length < 2 && " Marque mais uma para visualizar os deltas lado a lado."}
              </p>
              <div className="flex items-center gap-2">
                {selected.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                    Limpar seleção
                  </Button>
                )}
                <Button
                  size="sm"
                  disabled={selected.length !== 2}
                  onClick={() => setCompareOpen(true)}
                  className="gap-1.5"
                >
                  <GitCompareArrows className="w-4 h-4" />
                  Comparar agora
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Lista */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma auditoria encontrada com esses filtros.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r, idx) => {
            const band = getScoreBand(r.overall_score);
            // delta vs. próximo na lista filtrada (que é o anterior cronológico)
            const previous = filtered[idx + 1];
            const delta = previous ? r.overall_score - previous.overall_score : null;
            const isSelected = selected.includes(r.id);

            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
              >
                <Card
                  className={cn(
                    "hover:shadow-md transition-shadow group",
                    compareMode && isSelected && "ring-2 ring-primary border-primary/40",
                  )}
                >
                  <CardContent className="p-5 flex items-center gap-4">
                    {compareMode && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(r.id)}
                        className="shrink-0"
                      />
                    )}

                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 shrink-0">
                      <span className="text-lg font-display font-bold text-primary tabular-nums">
                        {r.overall_score}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">
                          Auditoria de {formatDate(r.created_at)}
                        </p>
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wider ${band.cls}`}
                        >
                          {band.label}
                        </span>
                        {delta !== null && delta !== 0 && (
                          <span
                            className={`inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums ${
                              delta > 0 ? "text-emerald-600" : "text-red-600"
                            }`}
                          >
                            {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        {r.site_url && (
                          <span className="flex items-center gap-1 truncate">
                            <Globe className="w-3 h-3 shrink-0" />
                            <span className="truncate">{r.site_url}</span>
                          </span>
                        )}
                        <span className="capitalize">
                          · {r.source === "preview" ? "análise inicial" : "re-análise"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!compareMode && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(r.id)}
                          className="text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remover do histórico"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                      {compareMode ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleSelect(r.id)}
                        >
                          {isSelected ? "Selecionada" : "Selecionar"}
                        </Button>
                      ) : (
                        <Button asChild size="sm" variant="outline" className="gap-1.5">
                          <Link to={`/dashboard/auditorias/${r.id}`}>
                            Abrir relatório
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <CompareDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        a={reportA}
        b={reportB}
      />
    </div>
  );
}
