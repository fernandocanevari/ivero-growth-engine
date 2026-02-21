import {
  Activity, LogIn, Clock, Eye, Map, TrendingUp, Bot, Zap,
  AlertCircle, BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminKPICard } from "./AdminKPICard";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from "recharts";
import { Badge } from "@/components/ui/badge";

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
};

const usoPorSemana = [
  { semana: "Sem 1", ativos: 89, logins: 245 },
  { semana: "Sem 2", ativos: 94, logins: 278 },
  { semana: "Sem 3", ativos: 101, logins: 312 },
  { semana: "Sem 4", ativos: 107, logins: 340 },
];

const promptsGrowth = [
  { mes: "Set", total: 1200 },
  { mes: "Out", total: 1580 },
  { mes: "Nov", total: 1890 },
  { mes: "Dez", total: 2340 },
  { mes: "Jan", total: 2780 },
  { mes: "Fev", total: 3200 },
];

const iaMetrics = [
  { label: "Análises Geradas", value: "12.450", icon: Bot },
  { label: "Tempo Médio Resposta", value: "2,4s", icon: Clock },
  { label: "Taxa de Fallback", value: "3,1%", icon: AlertCircle, accent: "text-amber-600" },
  { label: "Erros de API", value: "0,8%", icon: Zap, accent: "text-emerald-600" },
];

export function AdminSectionProduto() {
  return (
    <div className="space-y-6">
      {/* Uso da Plataforma */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4" /> Uso da Plataforma
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminKPICard icon={Activity} label="Clientes Ativos (7d)" value={107} subtitle="de 147 totais" trend={{ value: 5.9, label: "vs sem ant" }} />
          <AdminKPICard icon={LogIn} label="Logins/Cliente (média)" value="3,2" subtitle="por semana" />
          <AdminKPICard icon={Clock} label="Tempo Médio no Dashboard" value="18 min" />
          <AdminKPICard icon={Eye} label="Visualizaram Insights" value="74%" accent="text-emerald-600" />
        </div>
      </div>

      {/* Chart: Uso semanal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground">Atividade Semanal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={usoPorSemana}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="semana" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="ativos" name="Ativos" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                <Bar dataKey="logins" name="Logins" fill="hsl(var(--ivero-purple-light))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Prompts Growth */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground">Crescimento de Prompts Monitorados</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={promptsGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="total" stroke="hsl(var(--accent))" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--accent))" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Mapa de Prompts */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Map className="h-4 w-4" /> Uso do Mapa de Prompts
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminKPICard icon={Map} label="Total Prompts Monitorados" value="3.200" trend={{ value: 15.1, label: "vs jan" }} />
          <AdminKPICard icon={TrendingUp} label="Crescimento Mensal" value="15,1%" accent="text-emerald-600" />
          <AdminKPICard icon={BarChart3} label="Prompts/Cliente" value="21,8" />
          <AdminKPICard icon={Eye} label="Usam Monit. Competitivo" value="62%" />
        </div>
      </div>

      {/* Camada de IA */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Bot className="h-4 w-4" /> Camada de IA
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {iaMetrics.map((m) => (
            <AdminKPICard key={m.label} icon={m.icon} label={m.label} value={m.value} accent={m.accent} />
          ))}
        </div>
      </div>
    </div>
  );
}
