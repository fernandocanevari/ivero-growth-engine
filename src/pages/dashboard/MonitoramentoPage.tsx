import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { InfoTooltip } from "@/components/InfoTooltip";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { monitoringData } from "@/lib/mock-data";

export default function MonitoramentoPage() {
  const totalMentions = monitoringData.models.reduce((s, m) => s + m.mentions, 0);

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold font-display text-foreground flex items-center">Monitoramento Multi-IA <InfoTooltip text="Mostra quantas vezes cada IA menciona sua marca. Identifique onde você já tem presença forte e onde precisa investir para ser mais recomendado." /></h1>
        <p className="text-muted-foreground mt-1">Acompanhe menções da sua marca em cada modelo de IA.</p>
      </motion.div>

      <div className="flex items-center gap-4">
        <Card className="px-5 py-3">
          <p className="text-sm text-muted-foreground">Total de Menções</p>
          <p className="text-3xl font-bold font-display">{totalMentions}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {monitoringData.models.map((model) => (
          <Card key={model.name}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-base font-semibold text-foreground">{model.name}</p>
                  <p className="text-2xl font-bold font-display mt-1">{model.mentions} <span className="text-sm font-normal text-muted-foreground">menções</span></p>
                </div>
                <Badge className={model.trend === "up" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-red-100 text-red-600 hover:bg-red-100"}>
                  {model.trend === "up" ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {model.trendValue > 0 ? "+" : ""}{model.trendValue}%
                </Badge>
              </div>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={model.weeklyData}>
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis hide />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Line type="monotone" dataKey="mentions" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
