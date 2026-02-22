import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Info, Bell } from "lucide-react";
import { alertsData } from "@/lib/mock-data";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { EmptyStatePage } from "@/components/dashboard/EmptyStatePage";

const iconMap = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  danger: <AlertTriangle className="h-5 w-5 text-red-500" />,
  info: <Info className="h-5 w-5 text-blue-500" />,
};

export default function AlertasPage() {
  const { data: settings, isLoading } = useBrandSettings();
  const hasBrand = !!settings?.brand_name;
  const hasData = false;

  if (isLoading) return null;

  if (!hasData) {
    return (
      <EmptyStatePage
        icon={<Bell className="h-12 w-12" />}
        title="Alertas"
        subtitle="Notificações sobre mudanças na sua presença nas IAs."
        message="Nenhum alerta disponível ainda"
        hasBrand={hasBrand}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
          <Bell className="h-6 w-6" /> Alertas
        </h1>
        <p className="text-muted-foreground mt-1">Notificações sobre mudanças na sua presença nas IAs.</p>
      </motion.div>

      <div className="space-y-3">
        {alertsData.map((alert) => (
          <Card key={alert.id} className={!alert.read ? "border-l-4 border-l-primary" : ""}>
            <CardContent className="p-4 flex items-start gap-3">
              {iconMap[alert.type]}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{alert.title}</p>
                  {!alert.read && <Badge className="bg-primary/10 text-primary text-[10px] hover:bg-primary/10">Novo</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{alert.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(alert.date).toLocaleString("pt-BR")}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
