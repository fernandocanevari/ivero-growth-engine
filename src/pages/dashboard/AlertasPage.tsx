import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Bell, ArrowRight } from "lucide-react";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { EmptyStatePage } from "@/components/dashboard/EmptyStatePage";
import { usePerceptionAlerts } from "@/hooks/usePerceptionAlerts";
import { useNavigate } from "react-router-dom";

const severityIcon = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  danger: <AlertTriangle className="h-5 w-5 text-red-500" />,
  info: <Bell className="h-5 w-5 text-blue-500" />,
} as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AlertasPage() {
  const navigate = useNavigate();
  const { data: settings, isLoading: brandLoading } = useBrandSettings();
  const { alerts, isLoading: alertsLoading } = usePerceptionAlerts();
  const hasBrand = !!settings?.brand_name;

  if (brandLoading || alertsLoading) return null;

  if (alerts.length === 0) {
    return (
      <EmptyStatePage
        icon={<Bell className="h-12 w-12" />}
        title="Alertas"
        subtitle="Notificações sobre mudanças de percepção das IAs sobre sua marca."
        message="Nenhum alerta de percepção ainda — execute mais auditorias para começar a monitorar mudanças."
        hasBrand={hasBrand}
      />
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
          <Bell className="h-6 w-6" /> Alertas de Percepção
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Notificações automáticas quando algum pilar muda de cor entre auditorias —
          quanto antes você reage, mais difícil é o concorrente abrir vantagem.
        </p>
      </motion.div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <Card
            key={alert.id}
            className={
              alert.severity === "danger"
                ? "border-l-4 border-l-red-500"
                : alert.severity === "warning"
                  ? "border-l-4 border-l-amber-500"
                  : alert.severity === "success"
                    ? "border-l-4 border-l-emerald-500"
                    : ""
            }
          >
            <CardContent className="p-4 flex items-start gap-3">
              {severityIcon[alert.severity]}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground">
                    {alert.title}
                  </p>
                  {alert.severity === "danger" && (
                    <Badge variant="destructive" className="text-[10px]">
                      Crítico
                    </Badge>
                  )}
                  {alert.severity === "warning" && (
                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px]">
                      Atenção
                    </Badge>
                  )}
                  {alert.severity === "success" && (
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]">
                      Recuperação
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {alert.message}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {formatDate(alert.date)}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate("/dashboard/tags-percepcao")}
                className="shrink-0"
              >
                Investigar <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
