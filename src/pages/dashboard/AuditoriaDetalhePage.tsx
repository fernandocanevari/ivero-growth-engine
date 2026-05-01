import { useParams, Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, History, Loader2, Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuditReport, useAuditReports } from "@/hooks/useAuditReports";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { exportReportToPDF, safeFileSlug } from "@/lib/report-pdf";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import DiagnosticoPage from "./DiagnosticoPage";

export default function AuditoriaDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: report, isLoading, error } = useAuditReport(id);
  const { data: settings } = useBrandSettings();
  const { userId } = useAuditReports();
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const handleExportPDF = async () => {
    if (!report || exporting) return;
    const root = document.getElementById("diagnostico-report-root") as HTMLElement | null;
    if (!root) {
      toast.error("Conteúdo do relatório não encontrado.");
      return;
    }
    setExporting(true);
    const dateSlug = new Date(report.created_at).toISOString().slice(0, 10);
    try {
      await exportReportToPDF(root, {
        filename: `auditoria-ivero-${safeFileSlug(report.site_url || settings?.brand_name || "marca")}-${dateSlug}.pdf`,
      });
      toast.success("PDF gerado com sucesso!");
    } catch (e) {
      console.error(e);
      toast.error("Falha ao gerar PDF. Tente novamente.");
    } finally {
      setExporting(false);
    }
  };

  /**
   * Restaura este snapshot como o relatório ativo do Diagnóstico.
   *  - Reescreve `ivero:lastDiagnostic` (sessionStorage) para que o /dashboard/diagnostico
   *    abra hidratado com este conteúdo.
   *  - Cria uma nova entrada em `audit_reports` (source='reanalise') marcando a restauração
   *    como o relatório ativo mais recente, sem alterar o snapshot histórico original.
   *  - Insere também em `analysis_history` para refletir no gráfico de evolução.
   */
  const handleRestoreActive = async () => {
    if (!report || restoring || !userId) return;
    setRestoring(true);
    try {
      // 1. Reescrever sessionStorage no formato esperado pelo DiagnosticoPage
      const sessionPayload = {
        pillarDetails: report.pillar_details,
        radar: report.radar_data,
        geoScore: report.overall_score,
        keyword_cloud: report.keyword_cloud,
      };
      sessionStorage.setItem("ivero:lastDiagnostic", JSON.stringify(sessionPayload));

      // 2. Salvar uma nova entrada em audit_reports preservando o snapshot
      // (mantém o original intacto e marca um novo "ativo" no topo do histórico).
      const { error: arErr } = await supabase.from("audit_reports").insert({
        user_id: userId,
        source: "reanalise",
        site_url: report.site_url,
        overall_score: report.overall_score,
        status_label: report.status_label,
        radar_data: report.radar_data,
        pillar_details: report.pillar_details,
        keyword_cloud: report.keyword_cloud,
        ai_engines: report.ai_engines,
      } as never);
      if (arErr) throw arErr;

      // 3. Espelhar pilares em analysis_history para o gráfico de evolução.
      const radar = (report.radar_data ?? []) as { subject: string; value: number }[];
      const byName = (n: string) => radar.find((r) => r.subject === n)?.value ?? 0;
      await supabase.from("analysis_history").insert({
        user_id: userId,
        overall_score: report.overall_score,
        clarity_score: byName("Clareza"),
        authority_score: byName("Autoridade"),
        conversion_score: byName("Conversão"),
        positioning_score: byName("Posicionamento"),
        experience_score: byName("Relevância"),
        keyword_cloud: (report.keyword_cloud ?? []) as never,
      } as never);

      queryClient.invalidateQueries({ queryKey: ["audit-reports"] });
      queryClient.invalidateQueries({ queryKey: ["analysis-history"] });
      toast.success("Snapshot restaurado como relatório ativo!");
      navigate("/dashboard/diagnostico");
    } catch (e) {
      console.error(e);
      toast.error("Falha ao restaurar snapshot.");
    } finally {
      setRestoring(false);
    }
  };

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
      {/* Histórico breadcrumb + ações */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 max-w-4xl"
      >
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <Button asChild variant="ghost" size="sm" className="gap-1.5 -ml-2">
            <Link to="/dashboard/auditorias">
              <ArrowLeft className="w-4 h-4" />
              Voltar ao histórico
            </Link>
          </Button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/15">
            <History className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-foreground">
              Auditoria de <strong>{dateLabel}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRestoreActive}
            disabled={restoring}
            className="gap-1.5"
            title="Tornar este snapshot o relatório ativo do Diagnóstico"
          >
            {restoring ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5" />
            )}
            Restaurar como ativo
          </Button>
          <Button
            size="sm"
            onClick={handleExportPDF}
            disabled={exporting}
            className="gap-1.5"
          >
            {exporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            Exportar PDF
          </Button>
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
