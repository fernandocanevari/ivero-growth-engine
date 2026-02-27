import { useState } from "react";
import { motion } from "framer-motion";
import {
  Eye, ShieldCheck, Target, Rocket, Sparkles,
  CheckCircle2, AlertTriangle, TrendingUp, TrendingDown, ArrowRight,
  Info,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InfoTooltip } from "@/components/InfoTooltip";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";

const fade = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

/* ── Mock evolution data (last 6 months) ── */
const months = ["Set", "Out", "Nov", "Dez", "Jan", "Fev"];

const evolutionData: Record<string, { month: string; score: number; benchmark: number }[]> = {
  Clareza: months.map((m, i) => ({ month: m, score: [68, 72, 74, 78, 80, 82][i], benchmark: [70, 71, 72, 73, 73, 74][i] })),
  Autoridade: months.map((m, i) => ({ month: m, score: [22, 25, 28, 30, 32, 35][i], benchmark: [55, 56, 57, 58, 58, 59][i] })),
  Conversão: months.map((m, i) => ({ month: m, score: [42, 45, 48, 52, 55, 58][i], benchmark: [60, 61, 62, 63, 63, 64][i] })),
  Posicionamento: months.map((m, i) => ({ month: m, score: [50, 53, 56, 58, 61, 64][i], benchmark: [62, 63, 64, 65, 65, 66][i] })),
  Experiência: months.map((m, i) => ({ month: m, score: [58, 62, 64, 67, 69, 71][i], benchmark: [65, 66, 67, 68, 68, 69][i] })),
};

/* ── Pillar definitions ── */
const pillars = [
  {
    key: "Clareza",
    score: 82,
    previousScore: 80,
    icon: Eye,
    status: "Forte" as const,
    summary: "Sua marca comunica de forma direta o que faz e para quem.",
    impact: "IAs compreendem seu core business rapidamente → maior chance de recomendação contextual.",
    metrics: [
      { label: "Headline clara", value: "92%", status: "good" },
      { label: "Proposta de valor explícita", value: "88%", status: "good" },
      { label: "Público-alvo definido", value: "78%", status: "moderate" },
      { label: "Diferenciação competitiva", value: "70%", status: "moderate" },
    ],
    strengths: [
      "Headline objetiva → IA compreende o core business rapidamente",
      "Benefícios claros → Aumenta chances de recomendação contextual",
    ],
    weaknesses: [
      "Diferenciação competitiva pode ser reforçada → IA agrupa com concorrentes genéricos",
    ],
    benchmark: 74,
    benchmarkLabel: "Média do setor",
  },
  {
    key: "Autoridade",
    score: 35,
    previousScore: 32,
    icon: ShieldCheck,
    status: "Crítico" as const,
    summary: "Autoridade baixa reduz drasticamente a chance de recomendação nas IAs.",
    impact: "Sem referências externas fortes, a IA não valida sua marca como fonte confiável.",
    metrics: [
      { label: "Backlinks de qualidade", value: "12%", status: "critical" },
      { label: "Menções em mídia", value: "8%", status: "critical" },
      { label: "Conteúdo técnico", value: "25%", status: "critical" },
      { label: "Presença em diretórios", value: "45%", status: "moderate" },
    ],
    strengths: [
      "Domínio registrado → Base mínima de presença online identificada",
    ],
    weaknesses: [
      "Ausência de backlinks de qualidade → IA não reconhece referências externas",
      "Sem menções em mídia especializada → Reduz credibilidade algorítmica",
      "Conteúdo técnico insuficiente → Limita profundidade de indexação por IA",
    ],
    benchmark: 59,
    benchmarkLabel: "Média do setor",
  },
  {
    key: "Conversão",
    score: 58,
    previousScore: 55,
    icon: Target,
    status: "Moderado" as const,
    summary: "CTAs presentes mas sem otimização para jornadas vindas de IA.",
    impact: "Visitantes chegam via IA mas não encontram caminhos otimizados para converter.",
    metrics: [
      { label: "CTAs visíveis", value: "75%", status: "moderate" },
      { label: "Landing pages IA", value: "15%", status: "critical" },
      { label: "Prova social", value: "35%", status: "critical" },
      { label: "Formulários otimizados", value: "68%", status: "moderate" },
    ],
    strengths: [
      "CTAs visíveis → Caminho de conversão existente",
      "Formulário acessível → Ponto de contato disponível",
    ],
    weaknesses: [
      "Sem landing pages para tráfego de IA → Perde visitantes que chegam via respostas",
      "Ausência de prova social contextual → Reduz taxa de conversão em 40%",
    ],
    benchmark: 64,
    benchmarkLabel: "Média do setor",
  },
  {
    key: "Posicionamento",
    score: 64,
    previousScore: 61,
    icon: Rocket,
    status: "Moderado" as const,
    summary: "Posicionamento técnico sólido, mas falta diferenciação emocional que IAs valorizam.",
    impact: "IAs geram respostas genéricas sobre sua marca por falta de storytelling.",
    metrics: [
      { label: "Linguagem profissional", value: "82%", status: "good" },
      { label: "Storytelling", value: "22%", status: "critical" },
      { label: "Elementos aspiracionais", value: "30%", status: "critical" },
      { label: "Diferenciação emocional", value: "40%", status: "moderate" },
    ],
    strengths: [
      "Linguagem profissional → Consistência na comunicação",
      "Foco em valor → Diferenciação por benefício detectada",
    ],
    weaknesses: [
      "Sem storytelling → IA gera respostas genéricas sobre sua marca",
      "Elementos aspiracionais ausentes → Reduz engajamento nas recomendações",
    ],
    benchmark: 66,
    benchmarkLabel: "Média do setor",
  },
  {
    key: "Experiência",
    score: 71,
    previousScore: 69,
    icon: Sparkles,
    status: "Bom" as const,
    summary: "Estrutura técnica funcional com oportunidades de otimização para crawlers de IA.",
    impact: "IA consegue navegar pela estrutura, mas dados semânticos estão ausentes.",
    metrics: [
      { label: "Navegação intuitiva", value: "85%", status: "good" },
      { label: "Design consistente", value: "80%", status: "good" },
      { label: "Dados estruturados", value: "20%", status: "critical" },
      { label: "Velocidade", value: "62%", status: "moderate" },
    ],
    strengths: [
      "Navegação intuitiva → Facilita compreensão da estrutura pela IA",
      "Design consistente → Sinal de profissionalismo para algoritmos",
    ],
    weaknesses: [
      "Dados estruturados ausentes → IA não consegue extrair informações semânticas",
      "Velocidade de carregamento → Impacta indexação por motores de IA",
    ],
    benchmark: 69,
    benchmarkLabel: "Média do setor",
  },
];

const radarData = pillars.map((p) => ({ subject: p.key, value: p.score, benchmark: p.benchmark, fullMark: 100 }));

function getScoreColor(score: number) {
  if (score >= 70) return "emerald";
  if (score >= 50) return "amber";
  return "red";
}

function getStatusStyle(status: string) {
  if (status === "good") return "bg-emerald-50 text-emerald-700 border-emerald-200/60";
  if (status === "moderate") return "bg-amber-50 text-amber-700 border-amber-200/60";
  return "bg-red-50 text-red-700 border-red-200/60";
}

function MetricBar({ label, value, status }: { label: string; value: string; status: string }) {
  const numericValue = parseInt(value);
  const barColor = status === "good" ? "bg-emerald-500" : status === "moderate" ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${getStatusStyle(status)}`}>
          {value}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          whileInView={{ width: `${numericValue}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

/* ── Pillar Detail Card ── */
function PillarDetailCard({ pillar }: { pillar: typeof pillars[0] }) {
  const PillarIcon = pillar.icon;
  const color = getScoreColor(pillar.score);
  const trend = pillar.score - pillar.previousScore;
  const trendUp = trend >= 0;
  const statusBg = color === "emerald" ? "bg-emerald-50 border-emerald-200/60 text-emerald-700" : color === "amber" ? "bg-amber-50 border-amber-200/60 text-amber-700" : "bg-red-50 border-red-200/60 text-red-700";
  const barColor = color === "emerald" ? "bg-emerald-500" : color === "amber" ? "bg-amber-500" : "bg-red-500";

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-6 border-b border-border/60">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-ivero-gradient shadow-sm">
                <PillarIcon className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-display font-bold text-foreground">{pillar.key}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{pillar.impact}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-display font-bold text-foreground">{pillar.score}</span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
              <div className="flex items-center gap-2 mt-1 justify-end">
                <Badge className={`text-[10px] border ${statusBg}`} variant="outline">
                  {pillar.status}
                </Badge>
                <span className={`text-xs font-medium flex items-center gap-0.5 ${trendUp ? "text-emerald-600" : "text-red-500"}`}>
                  {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {trendUp ? "+" : ""}{trend}
                </span>
              </div>
            </div>
          </div>

          {/* Score bar */}
          <div className="mt-4 space-y-2">
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${barColor}`}
                initial={{ width: 0 }}
                whileInView={{ width: `${pillar.score}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Sua marca: {pillar.score}%</span>
              <span>{pillar.benchmarkLabel}: {pillar.benchmark}%</span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="metrics" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b border-border/60 bg-transparent px-6 h-auto">
            <TabsTrigger value="metrics" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 text-xs">
              Métricas
            </TabsTrigger>
            <TabsTrigger value="evolution" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 text-xs">
              Evolução
            </TabsTrigger>
            <TabsTrigger value="analysis" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 text-xs">
              Análise
            </TabsTrigger>
          </TabsList>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="p-6 space-y-4 mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pillar.metrics.map((m) => (
                <MetricBar key={m.label} {...m} />
              ))}
            </div>

            {/* Benchmark comparison */}
            <div className="rounded-xl bg-muted/50 border border-border/60 p-4 mt-4">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Benchmark do Setor</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-foreground font-medium">Sua marca</span>
                    <span className="font-semibold">{pillar.score}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pillar.score}%` }} />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-foreground font-medium">Média setor</span>
                    <span className="font-semibold">{pillar.benchmark}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-muted-foreground/30" style={{ width: `${pillar.benchmark}%` }} />
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                {pillar.score >= pillar.benchmark
                  ? `Você está ${pillar.score - pillar.benchmark} pontos acima da média do setor neste pilar.`
                  : `Você está ${pillar.benchmark - pillar.score} pontos abaixo da média do setor — isso impacta diretamente suas recomendações em IA.`}
              </p>
            </div>
          </TabsContent>

          {/* Evolution Tab */}
          <TabsContent value="evolution" className="p-6 mt-0">
            <div className="space-y-3">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full bg-primary inline-block" /> Sua marca</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full bg-muted-foreground/40 inline-block" /> Média do setor</span>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolutionData[pillar.key]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--primary))" }} name="Sua marca" />
                    <Line type="monotone" dataKey="benchmark" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Média setor" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className={`rounded-xl p-3 border text-xs ${trendUp ? "bg-emerald-50/80 border-emerald-200/60 text-emerald-700" : "bg-red-50/80 border-red-200/60 text-red-700"}`}>
                {trendUp
                  ? `↗ ${pillar.key} cresceu ${trend} pontos no último mês. Continue investindo nessa direção.`
                  : `↘ ${pillar.key} caiu ${Math.abs(trend)} pontos no último mês. Ação imediata recomendada.`}
              </div>
            </div>
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="p-6 space-y-5 mt-0">
            {/* Strengths */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Análise detectada</p>
              <div className="space-y-1.5">
                {pillar.strengths.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="text-foreground">{s}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Weaknesses */}
            {pillar.weaknesses.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Impacto competitivo</p>
                <div className="space-y-1.5">
                  {pillar.weaknesses.map((w, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span className="text-foreground">{w}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Consequence */}
            <div className={`rounded-xl p-4 border ${
              color === "red" ? "bg-red-50/80 border-red-200/60" :
              color === "amber" ? "bg-amber-50/80 border-amber-200/60" :
              "bg-emerald-50/80 border-emerald-200/60"
            }`}>
              <p className={`text-sm font-medium ${
                color === "red" ? "text-red-700" :
                color === "amber" ? "text-amber-700" : "text-emerald-700"
              }`}>
                {pillar.summary}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default function PilaresPage() {
  const { data: settings, isLoading } = useBrandSettings();
  const [selectedPillar, setSelectedPillar] = useState<string | null>(null);
  const displayName = settings?.brand_name || "sua marca";

  if (isLoading) return null;

  const filteredPillars = selectedPillar
    ? pillars.filter((p) => p.key === selectedPillar)
    : pillars;

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <motion.div {...fade}>
        <h1 className="text-2xl font-bold font-display text-foreground">
          📈 Evolução Estratégica
        </h1>
        <p className="text-xs text-muted-foreground mt-1 italic">Monitoramento contínuo — Acompanhe a evolução dos seus pilares ao longo do tempo</p>
        <p className="text-muted-foreground mt-1">
          Métricas detalhadas, evolução temporal e benchmarks de cada pilar que determina se a IA recomenda {displayName}.
        </p>
      </motion.div>

      {/* Radar Overview */}
      <motion.div {...fade} transition={{ delay: 0.05 }}>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-4">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Visão Geral dos Pilares
                  <InfoTooltip text="Comparação da sua marca com a média do setor em cada pilar estratégico." />
                </h2>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                      <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.6} />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: "hsl(var(--foreground))", fontWeight: 500 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="Sua Marca" dataKey="value" stroke="hsl(var(--primary))" fill="url(#radarGradPilares)" fillOpacity={0.3} strokeWidth={2.5} />
                      <Radar name="Média Setor" dataKey="benchmark" stroke="hsl(var(--muted-foreground))" fill="transparent" strokeWidth={1.5} strokeDasharray="5 5" />
                      <defs>
                        <linearGradient id="radarGradPilares" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="hsl(265 70% 28%)" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="hsl(330 85% 55%)" stopOpacity={0.4} />
                        </linearGradient>
                      </defs>
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Quick stats */}
              <div className="lg:w-64 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Resumo por pilar</p>
                {pillars.map((p) => {
                  const color = getScoreColor(p.score);
                  const isSelected = selectedPillar === p.key;
                  return (
                    <button
                      key={p.key}
                      onClick={() => setSelectedPillar(isSelected ? null : p.key)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                        isSelected
                          ? "border-primary/40 bg-primary/5 shadow-sm"
                          : "border-border/60 bg-card hover:border-primary/20 hover:bg-primary/5"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <p.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium text-foreground">{p.key}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${
                          color === "emerald" ? "text-emerald-600" :
                          color === "amber" ? "text-amber-600" : "text-red-600"
                        }`}>{p.score}</span>
                        <span className={`text-[10px] ${p.score - p.previousScore >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                          {p.score - p.previousScore >= 0 ? "↑" : "↓"}{Math.abs(p.score - p.previousScore)}
                        </span>
                      </div>
                    </button>
                  );
                })}
                {selectedPillar && (
                  <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setSelectedPillar(null)}>
                    Ver todos os pilares
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Pillar Detail Cards */}
      <div className="space-y-6">
        {filteredPillars.map((pillar, idx) => (
          <motion.div key={pillar.key} {...fade} transition={{ delay: 0.1 + idx * 0.05 }}>
            <PillarDetailCard pillar={pillar} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
