import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, History, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuditReport } from "@/hooks/useAuditReports";
import DiagnosticoPage from "./DiagnosticoPage";

export default function AuditoriaDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const { data: report, isLoading, error } = useAuditReport(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-2xl">
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-muted-foreground">Auditoria não encontrada ou você não tem acesso a ela.</p>
            <Button asChild variant="outline">
              <Link to="/dashboard/auditorias">Voltar ao histórico</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dateLabel = new Date(report.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      {/* Histórico breadcrumb */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-3 max-w-4xl"
      >
        <div className="flex items-center gap-2 text-sm">
          <Button asChild variant="ghost" size="sm" className="gap-1.5 -ml-2">
            <Link to="/dashboard/auditorias">
              <ArrowLeft className="w-4 h-4" />
              Voltar ao histórico
            </Link>
          </Button>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/15">
          <History className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium text-foreground">
            Auditoria de <strong>{dateLabel}</strong>
          </span>
        </div>
      </motion.div>

      <DiagnosticoPage
        readOnly
        snapshotOverride={{
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pillarDetails: report.pillar_details as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          radar: report.radar_data as any,
          overallScore: report.overall_score,
          createdAt: report.created_at,
          siteUrl: report.site_url,
        }}
      />
    </div>
  );
}
