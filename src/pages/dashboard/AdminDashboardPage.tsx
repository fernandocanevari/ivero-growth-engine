import { useUserRole } from "@/hooks/useUserRole";
import { ShieldAlert, Users, UserCheck, UserX, CreditCard, TrendingUp, AlertTriangle, Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";

/* ── Mock Data ─────────────────────────────────────────── */

const kpiData = {
  totalClientes: 147,
  ativos: 112,
  inativos: 35,
  faturamentoMensal: 48750,
  ticketMedio: 435.27,
  churnRate: 4.2,
};

const plansDistribution = [
  { name: "Presença", value: 42, color: "hsl(var(--muted-foreground))" },
  { name: "Influência", value: 38, color: "hsl(var(--ivero-purple-light))" },
  { name: "Autoridade", value: 48, color: "hsl(var(--primary))" },
  { name: "Domínio", value: 19, color: "hsl(var(--accent))" },
];

const revenueHistory = [
  { mes: "Set", valor: 32400 },
  { mes: "Out", valor: 36800 },
  { mes: "Nov", valor: 41200 },
  { mes: "Dez", valor: 44500 },
  { mes: "Jan", valor: 46100 },
  { mes: "Fev", valor: 48750 },
];

const inactiveClients = [
  { name: "TechWear Co.", plano: "Autoridade", ultimoAcesso: "2025-12-14", diasInativo: 69 },
  { name: "SportMax", plano: "Influência", ultimoAcesso: "2026-01-03", diasInativo: 49 },
  { name: "UrbanFit", plano: "Domínio", ultimoAcesso: "2026-01-10", diasInativo: 42 },
  { name: "RunPro Brasil", plano: "Autoridade", ultimoAcesso: "2026-01-18", diasInativo: 34 },
  { name: "Estilo & Forma", plano: "Presença", ultimoAcesso: "2026-01-25", diasInativo: 27 },
];

const topClients = [
  { name: "Nike Brasil", plano: "Domínio", score: 94, status: "ativo" },
  { name: "Adidas BR", plano: "Domínio", score: 91, status: "ativo" },
  { name: "New Balance", plano: "Autoridade", score: 87, status: "ativo" },
  { name: "Puma Sports", plano: "Autoridade", score: 82, status: "ativo" },
  { name: "Mizuno", plano: "Influência", score: 76, status: "ativo" },
];

const planRevenue = [
  { plano: "Presença", clientes: 42, receita: 6300 },
  { plano: "Influência", clientes: 38, receita: 11400 },
  { plano: "Autoridade", clientes: 48, receita: 21600 },
  { plano: "Domínio", clientes: 19, receita: 9450 },
];

/* ── Component ─────────────────────────────────────────── */

export default function AdminDashboardPage() {
  const { isAdmin, isLoading } = useUserRole();

  if (isLoading) {
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
      <div className="flex items-center gap-3">
        <Crown className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>
          <p className="text-sm text-muted-foreground">
            Visão geral do negócio — dados mock
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard icon={Users} label="Total Clientes" value={kpiData.totalClientes} />
        <KPICard icon={UserCheck} label="Ativos" value={kpiData.ativos} accent="text-emerald-600" />
        <KPICard icon={UserX} label="Inativos" value={kpiData.inativos} accent="text-destructive" />
        <KPICard
          icon={CreditCard}
          label="Faturamento"
          value={`R$ ${kpiData.faturamentoMensal.toLocaleString("pt-BR")}`}
        />
        <KPICard
          icon={TrendingUp}
          label="Ticket Médio"
          value={`R$ ${kpiData.ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
        />
        <KPICard
          icon={AlertTriangle}
          label="Churn Rate"
          value={`${kpiData.churnRate}%`}
          accent="text-amber-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue History */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground">Faturamento Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={revenueHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR")}`, "Receita"]}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                />
                <Line type="monotone" dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--primary))" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Plan Distribution */}
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
                <Tooltip
                  formatter={(value: number, name: string) => [value, name]}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                />
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
      </div>

      {/* Revenue by Plan */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground">Receita por Plano</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={planRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="plano" fontSize={12} stroke="hsl(var(--muted-foreground))" />
              <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number, name: string) => [
                  name === "receita" ? `R$ ${value.toLocaleString("pt-BR")}` : value,
                  name === "receita" ? "Receita" : "Clientes",
                ]}
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
              />
              <Bar dataKey="receita" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inactive Clients (paying but not using) */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Clientes Pagantes Sem Uso
            </CardTitle>
            <p className="text-xs text-muted-foreground">Clientes com plano ativo mas sem acesso recente</p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Último Acesso</TableHead>
                  <TableHead className="text-right">Dias Inativo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inactiveClients.map((c) => (
                  <TableRow key={c.name}>
                    <TableCell className="font-medium text-foreground">{c.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{c.plano}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(c.ultimoAcesso).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={c.diasInativo > 50 ? "text-destructive font-semibold" : "text-accent font-medium"}>
                        {c.diasInativo}d
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Clients */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" />
              Top Clientes por Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead className="text-right">Score GEO</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topClients.map((c) => (
                  <TableRow key={c.name}>
                    <TableCell className="font-medium text-foreground">{c.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{c.plano}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-primary">{c.score}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ── KPI Card ──────────────────────────────────────────── */

function KPICard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <Card className="border-border">
      <CardContent className="pt-5 pb-4 px-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className={`text-lg font-bold ${accent || "text-foreground"}`}>{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
