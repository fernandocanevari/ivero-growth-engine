import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { History, ArrowRight, Trash2, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuditReports } from "@/hooks/useAuditReports";
import { EmptyStatePage } from "@/components/dashboard/EmptyStatePage";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { toast } from "sonner";

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

export default function AuditoriasPage() {
  const { reports, isLoading, remove } = useAuditReports();
  const { data: settings } = useBrandSettings();
  const hasBrand = !!settings?.brand_name;

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

  // Reports vêm desc; calcula delta (atual vs. próximo na lista, que é o anterior)
  const handleDelete = (id: string) => {
    if (!confirm("Remover esta auditoria do histórico? Esta ação não pode ser desfeita.")) return;
    remove.mutate(id, {
      onSuccess: () => toast.success("Auditoria removida"),
      onError: () => toast.error("Erro ao remover auditoria"),
    });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-ivero-gradient shadow-sm">
            <History className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Histórico de Auditorias</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {reports.length} {reports.length === 1 ? "auditoria salva" : "auditorias salvas"} — clique para reabrir o relatório completo.
            </p>
          </div>
        </div>
      </motion.div>

      <div className="space-y-3">
        {reports.map((r, idx) => {
          const band = getScoreBand(r.overall_score);
          const previous = reports[idx + 1];
          const delta = previous ? r.overall_score - previous.overall_score : null;

          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
            >
              <Card className="hover:shadow-md transition-shadow group">
                <CardContent className="p-5 flex items-center gap-4">
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
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wider ${band.cls}`}>
                        {band.label}
                      </span>
                      {delta !== null && delta !== 0 && (
                        <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums ${
                          delta > 0 ? "text-emerald-600" : "text-red-600"
                        }`}>
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(r.id)}
                      className="text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remover do histórico"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button asChild size="sm" variant="outline" className="gap-1.5">
                      <Link to={`/dashboard/auditorias/${r.id}`}>
                        Abrir relatório
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
