import {
  DollarSign, TrendingUp, Users, UserPlus, RefreshCw, ArrowUpRight,
  BarChart3, Clock, Percent,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminKPICard } from "./AdminKPICard";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

const mrrHistory = [
  { mes: "Set", valor: 32400 },
  { mes: "Out", valor: 36800 },
  { mes: "Nov", valor: 41200 },
  { mes: "Dez", valor: 44500 },
  { mes: "Jan", valor: 46100 },
  { mes: "Fev", valor: 48750 },
];

const receitaPorPlano = [
  { plano: "Presença", receita: 6300, clientes: 42 },
  { plano: "Influência", receita: 11400, clientes: 38 },
  { plano: "Autoridade", receita: 21600, clientes: 48 },
  { plano: "Domínio", receita: 9450, clientes: 19 },
];

const plansDistribution = [
  { name: "Presença", value: 42, color: "hsl(var(--muted-foreground))" },
  { name: "Influência", value: 38, color: "hsl(var(--ivero-purple-light))" },
  { name: "Autoridade", value: 48, color: "hsl(var(--primary))" },
  { name: "Domínio", value: 19, color: "hsl(var(--accent))" },
];

const aquisicaoMensal = [
  { mes: "Set", novos: 12, conversao: 58 },
  { mes: "Out", novos: 18, conversao: 61 },
  { mes: "Nov", novos: 15, conversao: 55 },
  { mes: "Dez", novos: 22, conversao: 67 },
  { mes: "Jan", novos: 19, conversao: 63 },
  { mes: "Fev", novos: 24, conversao: 70 },
];

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
};

export function AdminSectionNegocio() {
  return (
    <div className="space-y-6">
      {/* KPIs Row 1: Receita & Crescimento */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <DollarSign className="h-4 w-4" /> Receita & Crescimento
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminKPICard icon={DollarSign} label="MRR" value="R$ 48.750" trend={{ value: 5.7, label: "vs jan" }} />
          <AdminKPICard icon={TrendingUp} label="ARR Projetado" value="R$ 585k" />
          <AdminKPICard icon={ArrowUpRight} label="Crescimento Mensal" value="5,7%" accent="text-emerald-600" />
          <AdminKPICard icon={BarChart3} label="Ticket Médio" value="R$ 435,27" />
        </div>
      </div>

      {/* KPIs Row 2: Retenção */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> Retenção
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminKPICard icon={Percent} label="Churn Rate Mensal" value="4,2%" accent="text-amber-600" />
          <AdminKPICard icon={DollarSign} label="LTV Estimado" value="R$ 10.360" />
          <AdminKPICard icon={Clock} label="Permanência Média" value="14 meses" />
          <AdminKPICard icon={ArrowUpRight} label="Taxa de Upgrade" value="12,5%" accent="text-emerald-600" />
        </div>
      </div>

      {/* KPIs Row 3: Aquisição */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <UserPlus className="h-4 w-4" /> Aquisição
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AdminKPICard icon={UserPlus} label="Novos Clientes (Fev)" value={24} trend={{ value: 26, label: "vs jan" }} />
          <AdminKPICard icon={Users} label="Conversão Trial → Pago" value="70%" accent="text-emerald-600" subtitle="14 dias gratuitos" />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MRR History */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground">Evolução MRR</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={mrrHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR")}`, "MRR"]} contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--primary))" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Plan Distribution Pie */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground">Distribuição por Plano</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={240}>
              <PieChart>
                <Pie data={plansDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" stroke="none">
                  {plansDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number, n: string) => [v, n]} contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 flex-1">
              {plansDistribution.map((plan) => (
                <div key={plan.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: plan.color }} />
                    <span className="text-foreground">{plan.name}</span>
                  </div>
                  <span className="font-semibold text-foreground">{plan.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Revenue by Plan */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground">Receita por Plano</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={receitaPorPlano}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="plano" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number, n: string) => [n === "receita" ? `R$ ${v.toLocaleString("pt-BR")}` : v, n === "receita" ? "Receita" : "Clientes"]} contentStyle={tooltipStyle} />
                <Bar dataKey="receita" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Acquisition Trend */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground">Aquisição Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={aquisicaoMensal}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="novos" name="Novos Clientes" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
