import { motion } from "framer-motion";
import {
  Brain, Lock, Unlock, Eye, ShieldCheck, Target, Rocket, Sparkles,
  CheckCircle2, AlertTriangle, Phone, ArrowRight, RefreshCw, Clock, CalendarDays,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { useAnalysisHistory } from "@/hooks/useAnalysisHistory";
import { toast } from "sonner";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";

const fade = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

/* ── Score level helper ── */
function getScoreLevel(score: number) {
  if (score <= 40) return { label: "Invisível", color: "red", emoji: "🔴", message: "Sua marca está sendo pouco recomendada nas IAs da sua categoria." };
  if (score <= 70) return { label: "Competindo", color: "amber", emoji: "🟡", message: "Você está abaixo do nível competitivo ideal para recomendação em IA." };
  return { label: "Influenciando", color: "emerald", emoji: "🟢", message: "Sua marca já tem forte presença nas IAs — agora é hora de consolidar liderança." };
}

/* ── Mock data (will be replaced by real data) ── */
const radarData = [
  { subject: "Clareza", value: 82, fullMark: 100 },
  { subject: "Autoridade", value: 35, fullMark: 100 },
  { subject: "Conversão", value: 58, fullMark: 100 },
  { subject: "Posicionamento", value: 64, fullMark: 100 },
  { subject: "Experiência", value: 71, fullMark: 100 },
];

const pillarDetails = [
  {
    name: "Clareza", score: 82, icon: Eye, status: "Forte" as const,
    summary: "Sua marca comunica de forma direta o que faz e para quem.",
    strengths: ["Headline objetiva → IA compreende o core business rapidamente", "Benefícios claros → Aumenta chances de recomendação contextual"],
    weaknesses: [],
    recommendation: "Reforce a proposta única de valor e a diferenciação competitiva para maximizar o impacto em respostas de IA.",
  },
  {
    name: "Autoridade", score: 35, icon: ShieldCheck, status: "Crítico" as const,
    summary: "Autoridade baixa reduz drasticamente a chance de recomendação nas IAs.",
    strengths: ["Domínio registrado → Base mínima de presença online identificada"],
    weaknesses: [
      "Ausência de backlinks de qualidade → IA não reconhece referências externas",
      "Sem menções em mídia especializada → Reduz credibilidade algorítmica",
      "Conteúdo técnico insuficiente → Limita profundidade de indexação por IA",
    ],
    recommendation: "Invista em backlinks de alta qualidade, menções em mídia especializada e conteúdo técnico aprofundado.",
  },
  {
    name: "Conversão", score: 58, icon: Target, status: "Moderado" as const,
    summary: "CTAs presentes mas sem otimização para jornadas vindas de IA.",
    strengths: ["CTAs visíveis → Caminho de conversão existente", "Formulário acessível → Ponto de contato disponível"],
    weaknesses: [
      "Sem landing pages para tráfego de IA → Perde visitantes que chegam via respostas",
      "Ausência de prova social contextual → Reduz taxa de conversão em 40%",
    ],
    recommendation: "Crie landing pages específicas para visitantes vindos de respostas de IA, com contexto personalizado e prova social.",
  },
  {
    name: "Posicionamento", score: 64, icon: Rocket, status: "Moderado" as const,
    summary: "Posicionamento técnico sólido, mas falta diferenciação emocional que IAs valorizam.",
    strengths: ["Linguagem profissional → Consistência na comunicação", "Foco em valor → Diferenciação por benefício detectada"],
    weaknesses: [
      "Sem storytelling → IA gera respostas genéricas sobre sua marca",
      "Elementos aspiracionais ausentes → Reduz engajamento nas recomendações",
    ],
    recommendation: "Adicione elementos aspiracionais e storytelling para que IAs gerem respostas mais humanizadas sobre sua marca.",
  },
  {
    name: "Experiência", score: 71, icon: Sparkles, status: "Bom" as const,
    summary: "Estrutura técnica funcional com oportunidades de otimização para crawlers de IA.",
    strengths: ["Navegação intuitiva → Facilita compreensão da estrutura pela IA", "Design consistente → Sinal de profissionalismo para algoritmos"],
    weaknesses: [
      "Dados estruturados ausentes → IA não consegue extrair informações semânticas",
      "Velocidade de carregamento → Impacta indexação por motores de IA",
    ],
    recommendation: "Otimize velocidade de carregamento e implemente dados estruturados para facilitar indexação por motores de IA.",
  },
];

function getWeakestPillarPhrase(): string {
  const weakest = [...radarData].sort((a, b) => a.value - b.value)[0];
  const phrases: Record<string, string> = {
    Clareza: "Falta de clareza diminui a compreensão da IA sobre sua proposta de valor.",
    Autoridade: "Autoridade baixa reduz drasticamente a chance de recomendação nas IAs.",
    Conversão: "Baixa conversão significa que visitantes vindos de IA não se tornam clientes.",
    Posicionamento: "Posicionamento fraco faz a IA recomendar concorrentes no seu lugar.",
    Experiência: "Problemas estruturais limitam a capacidade da IA interpretar sua relevância.",
  };
  return phrases[weakest.subject] || phrases["Autoridade"];
}

const overallScore = Math.round(radarData.reduce((s, d) => s + d.value, 0) / radarData.length);

/* ── Soft blur for locked content ── */
function SoftBlur({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <div className="relative group/soft cursor-default">
      <div className="blur-[1.5px] opacity-60 select-none pointer-events-none transition-all duration-500 group-hover/soft:blur-[3px] group-hover/soft:opacity-40">{children}</div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-card/80 rounded-xl transition-opacity duration-500 group-hover/soft:to-card/90" />
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/soft:opacity-100 transition-all duration-400 z-10">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-ivero-gradient shadow-[0_4px_24px_-4px_hsl(var(--primary)/0.45)] scale-90 group-hover/soft:scale-100 transition-transform duration-400">
          <Lock className="w-3.5 h-3.5 text-primary-foreground" />
          <span className="text-xs font-medium text-primary-foreground">{label || "💜 Queremos você como nosso cliente."}</span>
        </div>
      </div>
    </div>
  );
}

export default function DiagnosticoPage() {
  const { data: settings, isLoading } = useBrandSettings();
  const displayName = settings?.brand_name || "sua marca";
  const { history, canReanalyze, daysRemaining, daysSinceLast, runAnalysis } = useAnalysisHistory();

  // TODO: Replace with real plan status check
  const hasPlan = true;

  const handleReanalyze = () => {
    if (!canReanalyze) return;
    runAnalysis.mutate(
      { clarity: 82, authority: 35, conversion: 58, positioning: 64, experience: 71 },
      {
        onSuccess: () => toast.success("Nova análise realizada com sucesso!"),
        onError: () => toast.error("Erro ao realizar análise. Tente novamente."),
      }
    );
  };

  if (isLoading) return null;

  const level = getScoreLevel(overallScore);

  // Build evolution chart data from history
  const evolutionChartData = history.map((record) => ({
    date: new Date(record.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    score: record.overall_score,
  }));

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <motion.div {...fade}>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-ivero-gradient shadow-sm">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">
              🧠 Diagnóstico de Influência em IA
            </h1>
            <p className="text-xs text-muted-foreground mt-1 italic">Análise inicial — Raio-X de como as IAs percebem sua marca hoje</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Análise completa de como as IAs percebem e recomendam {displayName}.
            </p>
          </div>
        </div>

        {/* Plan status removed — clients accessing dashboard already have a plan */}
      </motion.div>

      {/* Score de Presença */}
      <motion.div {...fade} transition={{ delay: 0.05 }}>
        <Card className="overflow-hidden">
          <CardContent className="p-6 space-y-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Score de Presença GEO
            </h2>

            <div className="flex items-center gap-6">
              <div className="text-center">
                <span className="text-5xl font-display font-bold text-foreground">{overallScore}</span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
              <div className="flex-1">
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      level.color === "red" ? "bg-red-500" :
                      level.color === "amber" ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${overallScore}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </div>
              </div>
            </div>

            {/* Score interpretation */}
            <div className={`rounded-xl p-4 border ${
              level.color === "red" ? "bg-red-50/80 border-red-200/60" :
              level.color === "amber" ? "bg-amber-50/80 border-amber-200/60" :
              "bg-emerald-50/80 border-emerald-200/60"
            }`}>
              <div className="flex items-start gap-3">
                <span className="text-lg">{level.emoji}</span>
                <div>
                  <p className={`text-sm font-display font-bold ${
                    level.color === "red" ? "text-red-700" :
                    level.color === "amber" ? "text-amber-700" : "text-emerald-700"
                  }`}>{level.label}</p>
                  <p className={`text-sm mt-1 ${
                    level.color === "red" ? "text-red-600/80" :
                    level.color === "amber" ? "text-amber-600/80" : "text-emerald-600/80"
                  }`}>{level.message}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Radar Estratégico */}
      <motion.div {...fade} transition={{ delay: 0.1 }}>
        <Card>
          <CardContent className="p-6 space-y-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Radar Estratégico
            </h2>

            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                  <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.6} />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: "hsl(var(--foreground))", fontWeight: 500 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Sua Marca" dataKey="value" stroke="hsl(var(--primary))" fill="url(#radarGradientDash)" fillOpacity={0.3} strokeWidth={2.5} />
                  <defs>
                    <linearGradient id="radarGradientDash" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="hsl(265 70% 28%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(330 85% 55%)" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Weakest pillar warning */}
            <div className="rounded-xl bg-red-50/80 border border-red-200/60 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700 font-medium">{getWeakestPillarPhrase()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-emerald-50/80 border border-emerald-200/60 p-4 text-center">
                <p className="text-xs text-muted-foreground font-medium">Principal ponto forte</p>
                <p className="text-base font-display font-bold text-emerald-700 mt-1">Clareza</p>
                <p className="text-xs text-emerald-600/70 mt-0.5">Score: 82/100</p>
              </div>
              <div className="rounded-xl bg-red-50/80 border border-red-200/60 p-4 text-center">
                <p className="text-xs text-muted-foreground font-medium">Maior vulnerabilidade</p>
                <p className="text-base font-display font-bold text-red-700 mt-1">Autoridade</p>
                <p className="text-xs text-red-600/70 mt-0.5">Score: 35/100</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Diagnóstico Detalhado (5 Pilares) ── */}
      <motion.div {...fade} transition={{ delay: 0.15 }}>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-4">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Diagnóstico Detalhado
        </h2>
        <p className="text-xs text-muted-foreground mb-4">Cada pilar impacta diretamente se a IA recomenda ou ignora sua marca.</p>
      </motion.div>

      <div className="space-y-4">
        {pillarDetails.map((pillar, idx) => {
          const PillarIcon = pillar.icon;
          const scoreColor = pillar.score >= 70 ? "emerald" : pillar.score >= 50 ? "amber" : "red";
          const statusBg = scoreColor === "emerald" ? "bg-emerald-50 border-emerald-200/60 text-emerald-700" : scoreColor === "amber" ? "bg-amber-50 border-amber-200/60 text-amber-700" : "bg-red-50 border-red-200/60 text-red-700";
          const barColor = scoreColor === "emerald" ? "bg-emerald-500" : scoreColor === "amber" ? "bg-amber-500" : "bg-red-500";

          return (
            <motion.div key={pillar.name} {...fade} transition={{ delay: 0.2 + idx * 0.05 }}>
              <Card>
                <CardContent className="p-6 space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-ivero-gradient shadow-sm">
                        <PillarIcon className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="text-base font-display font-bold text-foreground">{pillar.name}</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">{pillar.summary}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-2xl font-display font-bold text-foreground">{pillar.score}</span>
                      <span className="text-xs text-muted-foreground">/100</span>
                      <div className={`mt-1 inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${statusBg}`}>
                        {pillar.status}
                      </div>
                    </div>
                  </div>

                  {/* Score bar */}
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${barColor}`}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${pillar.score}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                    />
                  </div>

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

                  {/* Recommendation — blurred if no plan, visible if plan active */}
                  {hasPlan ? (
                    <div className="rounded-xl bg-primary/5 border border-primary/15 p-4 space-y-1.5">
                      <p className="text-xs font-semibold text-primary uppercase tracking-widest">Estratégia de Domínio</p>
                      <p className="text-sm text-foreground leading-relaxed">{pillar.recommendation}</p>
                    </div>
                  ) : (
                    <SoftBlur>
                      <div className="rounded-xl bg-primary/5 border border-primary/15 p-4 space-y-1.5">
                        <p className="text-xs font-semibold text-primary uppercase tracking-widest">Estratégia de Domínio</p>
                        <p className="text-sm text-foreground leading-relaxed">{pillar.recommendation}</p>
                      </div>
                    </SoftBlur>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* WhatsApp CTA removed — client already in dashboard */}

      {/* ── Diagnóstico Final (Premium) ── */}
      <motion.div {...fade} transition={{ delay: 0.55 }}>
        <Card className="shadow-[0_4px_40px_-8px_hsl(var(--primary)/0.15)] overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-ivero-gradient opacity-60" />
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-ivero-gradient shadow-sm">
                <Brain className="w-4 h-4 text-primary-foreground" />
              </div>
              <h2 className="font-display text-lg font-bold text-foreground">Diagnóstico Final</h2>
            </div>
            <p className="text-xs text-muted-foreground">A análise mais importante sobre o futuro da sua marca em IA</p>

            {hasPlan ? (
              <div className="rounded-xl bg-primary/5 border border-primary/15 p-5 space-y-3">
                <p className="text-sm text-foreground leading-relaxed font-medium">
                  Sua marca adota uma comunicação predominantemente racional e técnica, focada em valor e direcionada a
                  decisores B2B. Embora isso transmita credibilidade, a ausência de elementos emocionais e aspiracionais
                  reduz o impacto em buscas conversacionais feitas por IAs, que priorizam respostas mais humanizadas e
                  contextuais.
                </p>
                <p className="text-sm text-foreground leading-relaxed">
                  Os pilares de <strong>Autoridade</strong> e <strong>Conversão</strong> são os que mais limitam sua capacidade de ser
                  recomendado. Enquanto seus concorrentes investem nesses pontos, sua marca perde mercado de forma invisível.
                </p>
              </div>
            ) : (
              <SoftBlur label="🔒 Estratégia para Superar Seus Concorrentes">
                <div className="rounded-xl bg-primary/5 border border-primary/15 p-5 space-y-3">
                  <p className="text-sm text-foreground leading-relaxed font-medium">
                    Sua marca adota uma comunicação predominantemente racional e técnica, focada em valor e direcionada a
                    decisores B2B. Embora isso transmita credibilidade, a ausência de elementos emocionais e aspiracionais
                    reduz o impacto em buscas conversacionais feitas por IAs, que priorizam respostas mais humanizadas e
                    contextuais.
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    Os pilares de <strong>Autoridade</strong> e <strong>Conversão</strong> são os que mais limitam sua capacidade de ser
                    recomendado. Enquanto seus concorrentes investem nesses pontos, sua marca perde mercado de forma invisível.
                  </p>
                </div>
              </SoftBlur>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* CTA Final removed — client already in dashboard */}
    </div>
  );
}
