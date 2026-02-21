import {
  TrendingUp, TrendingDown, AlertTriangle, Trophy, Target,
  BarChart3, Shield, ArrowUp, ArrowDown, Minus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminKPICard } from "./AdminKPICard";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
};

const clientesTendencia = [
  { name: "Nike Brasil", score: 94, trend: "alta", delta: "+6" },
  { name: "Adidas BR", score: 91, trend: "alta", delta: "+4" },
  { name: "Puma Sports", score: 82, trend: "estagnado", delta: "0" },
  { name: "UrbanFit", score: 54, trend: "risco", delta: "-8" },
  { name: "RunPro Brasil", score: 48, trend: "risco", delta: "-12" },
  { name: "SportMax", score: 61, trend: "estagnado", delta: "-1" },
];

const alertasCategorias = [
  { categoria: "Queda de Ranking", total: 18 },
  { categoria: "Sem Plano de Ação", total: 14 },
  { categoria: "Concorrente Crescendo", total: 11 },
  { categoria: "Sentimento Negativo", total: 7 },
  { categoria: "Prompt Perdido", total: 5 },
];

const benchmarkSetores = [
  { setor: "Moda Esportiva", evolucao: 12.4 },
  { setor: "Tecnologia", evolucao: 8.1 },
  { setor: "Alimentação", evolucao: 3.2 },
  { setor: "Saúde", evolucao: -2.5 },
  { setor: "Educação", evolucao: -5.1 },
];

const trendIcon = (t: string) => {
  if (t === "alta") return <ArrowUp className="h-3.5 w-3.5 text-emerald-600" />;
  if (t === "risco") return <ArrowDown className="h-3.5 w-3.5 text-destructive" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
};

const trendBadge = (t: string) => {
  if (t === "alta") return <Badge className="bg-emerald-600/10 text-emerald-600 text-[10px]">Alta</Badge>;
  if (t === "risco") return <Badge className="bg-destructive/10 text-destructive text-[10px]">Risco</Badge>;
  return <Badge variant="secondary" className="text-[10px]">Estagnado</Badge>;
};

export function AdminSectionEstrategica() {
  return (
    <div className="space-y-6">
      {/* Evolução de Presença */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" /> Evolução de Presença dos Clientes
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminKPICard icon={Target} label="Índice Estratégico Médio" value="68,4" />
          <AdminKPICard icon={TrendingUp} label="Em Alta" value={42} accent="text-emerald-600" />
          <AdminKPICard icon={AlertTriangle} label="Em Risco" value={18} accent="text-destructive" />
          <AdminKPICard icon={Minus} label="Estagnados" value={29} accent="text-amber-600" />
        </div>
      </div>

      {/* Client Trends Table */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground">Tendência por Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-center">Tendência</TableHead>
                <TableHead className="text-right">Δ Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientesTendencia.map((c) => (
                <TableRow key={c.name}>
                  <TableCell className="font-medium text-foreground">{c.name}</TableCell>
                  <TableCell className="text-center font-semibold text-primary">{c.score}</TableCell>
                  <TableCell className="text-center">{trendBadge(c.trend)}</TableCell>
                  <TableCell className="text-right flex items-center justify-end gap-1">
                    {trendIcon(c.trend)}
                    <span className="text-sm">{c.delta}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Alertas & Benchmark */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertas */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Alertas
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AdminKPICard icon={AlertTriangle} label="Alertas Ativos" value={55} accent="text-destructive" />
            <AdminKPICard icon={Shield} label="Sem Plano de Ação" value={14} accent="text-amber-600" />
          </div>
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">Categorias de Alerta</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={alertasCategorias} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                  <YAxis type="category" dataKey="categoria" fontSize={11} stroke="hsl(var(--muted-foreground))" width={140} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="total" fill="hsl(var(--accent))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Benchmark */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Trophy className="h-4 w-4" /> Benchmark por Segmento
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AdminKPICard icon={Trophy} label="Maior Evolução" value="Moda Esportiva" subtitle="+12,4%" accent="text-emerald-600" />
            <AdminKPICard icon={TrendingDown} label="Maior Queda" value="Educação" subtitle="-5,1%" accent="text-destructive" />
          </div>
          <AdminKPICard icon={BarChart3} label="Gap Médio Competitivo" value="14,2 pts" />
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">Evolução por Setor</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={benchmarkSetores}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="setor" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip formatter={(v: number) => [`${v > 0 ? "+" : ""}${v}%`, "Evolução"]} contentStyle={tooltipStyle} />
                  <Bar dataKey="evolucao" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
