import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, ArrowRight, CheckCircle2, AlertTriangle, Info, CheckCheck, Zap, Settings, BarChart3, Bell, Search, Target, Brain, Sparkles } from "lucide-react";
import { InfoTooltip } from "@/components/InfoTooltip";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import {
  geoScore, sentimentData, alertsData, monitoringData,
  comparativeData, actionsData, promptsData, brandName, competitorName,
} from "@/lib/mock-data";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { useCompetitors } from "@/hooks/useCompetitors";
import { useHasDiagnostic } from "@/hooks/useHasDiagnostic";
import { useBrandProfile } from "@/hooks/useBrandProfile";
import { EmptyStateCard } from "@/components/dashboard/EmptyStateCard";
import { OnboardingChecklistCard } from "@/components/dashboard/OnboardingChecklistCard";
import { OnboardingStepper } from "@/components/dashboard/OnboardingStepper";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { WELCOME_FEATURES } from "@/lib/welcome-features";
import { FeatureHighlightCard } from "@/components/welcome/FeatureHighlightCard";
import BrandProfileModal from "@/components/dashboard/BrandProfileModal";
import { RecommendedToolCard } from "@/components/dashboard/RecommendedToolCard";

const fade = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

export default function DashboardOverview() {
  const navigate = useNavigate();
  const { data: settings, isLoading } = useBrandSettings();
  const { data: competitors } = useCompetitors(settings?.id);
  const { hasDiagnostic, isLoading: loadingDiag } = useHasDiagnostic();
  const { hasCompletedBrandProfile } = useBrandProfile();
  const [brandModalOpen, setBrandModalOpen] = useState(false);

  // Determine what data the client has configured
  const hasBrand = !!settings?.brand_name;
  const mainCompetitor = competitors?.[0]?.nome ?? "";
  const hasCompetitor = !!mainCompetitor;
  const displayName = settings?.brand_name || "sua marca";
  const displayCompetitor = mainCompetitor;

  // For now, real monitoring/score data doesn't exist yet — show empty states
  // In the future, these flags would check actual data tables
  const hasMonitoringData = false;
  const hasScoreData = false;
  const hasSentimentData = false;
  const hasAlerts = false;
  const hasActions = false;
  const hasPrompts = false;

  const topActions = actionsData.filter((a) => !a.completed).slice(0, 3);
  const topPrompt = promptsData.find((p) => p.opportunity === "high" && p.position > 2);
  const recentAlerts = alertsData.slice(0, 3);

  const alertIcon = (type: string) => {
    if (type === "success") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (type === "warning") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    if (type === "danger") return <AlertTriangle className="h-4 w-4 text-red-500" />;
    return <Info className="h-4 w-4 text-blue-500" />;
  };

  // Só oculta na primeira carga real: revalidação mantém o painel em tela.
  if ((isLoading || loadingDiag) && !settings && hasDiagnostic === null) return null;

  // Empty-state mode: user hasn't generated any diagnostic yet
  if (hasDiagnostic === false) {
    return (
      <div className="space-y-6 max-w-6xl">
        <motion.div {...fade}>
          <h1 className="text-2xl font-bold font-display text-foreground">
            Olá{hasBrand ? `, ${displayName}` : ""} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Vamos dar o primeiro passo para mapear sua presença nas IAs.
          </p>
        </motion.div>

        <OnboardingStepper />

        <motion.div {...fade} transition={{ delay: 0.1 }}>
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Brain className="w-12 h-12 text-primary" strokeWidth={1.75} />
              </div>
              <div className="flex-1 space-y-2">
                <h2 className="text-xl md:text-2xl font-display font-semibold text-foreground">
                  Seu diagnóstico ainda não foi gerado
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                  Execute seu primeiro Diagnóstico IA para ver seu Score GEO, identificar lacunas
                  de presença e receber recomendações personalizadas.
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => navigate("/dashboard/diagnostico")}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
              >
                Iniciar Diagnóstico
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <div>
          <SectionHeader tone="primary">O que você desbloqueia após o diagnóstico</SectionHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {WELCOME_FEATURES.map((f, i) => (
              <FeatureHighlightCard key={f.id} feature={f} index={i} locked />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <motion.div {...fade}>
        <h1 className="text-2xl font-bold font-display text-foreground">
          Olá{hasBrand ? `, ${displayName}` : ""} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          {hasBrand
            ? "Resumo da sua presença nas IAs — atualizado em tempo real."
            : "Configure sua marca para começar a monitorar sua presença nas IAs."}
        </p>
      </motion.div>

      {/* Ferramenta prioritária personalizada — some após o 1º uso */}
      <RecommendedToolCard />

      {/* Onboarding checklist — some sozinho quando todas etapas concluídas */}
      <OnboardingChecklistCard />

      {/* Perfil da Marca — responder/revisar as 3 perguntas estratégicas */}
      <motion.div {...fade} transition={{ delay: 0.07 }}>
        <Card className="border-[#6C5CE7]/30 bg-gradient-to-br from-[#F0EFFE] to-transparent">
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Perfil da Marca</p>
              <p className="text-xs text-muted-foreground">
                {hasCompletedBrandProfile
                  ? "Suas respostas estratégicas estão salvas. Revise quando quiser."
                  : "Responda 3 perguntas rápidas para personalizar suas recomendações."}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setBrandModalOpen(true)}
              className="bg-[#6C5CE7] hover:bg-[#5b4ddb] text-white shrink-0"
            >
              {hasCompletedBrandProfile ? "Revisar" : "Responder"} <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Setup banner when brand not configured */}

      {!hasBrand && (
        <motion.div {...fade} transition={{ delay: 0.05 }}>
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Configure sua marca</p>
                  <p className="text-xs text-muted-foreground">Preencha o nome, setor e concorrentes para ativar o monitoramento.</p>
                </div>
              </div>
              <Button size="sm" onClick={() => navigate("/dashboard/configuracoes")}>
                Configurar <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* BLOCO 1: Como sua marca está sendo percebida? */}
      <motion.section {...fade} transition={{ delay: 0.1 }}>
        <SectionHeader tone="primary">Como sua marca está sendo percebida?</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Score GEO */}
          {hasScoreData ? (
            <Card className="relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/dashboard/score")}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center">Score GEO <InfoTooltip text="Mede o quanto sua marca é visível e relevante nas respostas das IAs." /></p>
                    <p className="text-4xl font-bold font-display text-foreground mt-1">{geoScore.current}</p>
                  </div>
                  <Badge variant={geoScore.trend === "up" ? "default" : "destructive"} className={geoScore.trend === "up" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : ""}>
                    {geoScore.trend === "up" ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {geoScore.current - geoScore.previous > 0 ? "+" : ""}{geoScore.current - geoScore.previous}
                  </Badge>
                </div>
                <Progress value={geoScore.current} className="mt-3 h-2" />
                <p className="text-xs text-muted-foreground mt-2">de 100 pontos possíveis</p>
              </CardContent>
            </Card>
          ) : (
            <EmptyStateCard
              icon={<BarChart3 className="h-8 w-8" />}
              title="Score GEO"
              description={hasBrand ? "Seus dados estão sendo coletados. Em breve seu score aparecerá aqui." : "Configure sua marca para calcular seu Score GEO."}
              actionLabel={!hasBrand ? "Configurar" : undefined}
              actionPath={!hasBrand ? "/dashboard/configuracoes" : undefined}
            />
          )}

          {/* Sentimento */}
          {hasSentimentData ? (
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/dashboard/sentimento")}>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground mb-3">Sentimento Geral</p>
                <div className="flex h-3 rounded-full overflow-hidden bg-secondary">
                  <div className="bg-emerald-500 transition-all" style={{ width: `${sentimentData.positive}%` }} />
                  <div className="bg-amber-400 transition-all" style={{ width: `${sentimentData.neutral}%` }} />
                  <div className="bg-red-400 transition-all" style={{ width: `${sentimentData.negative}%` }} />
                </div>
                <div className="flex justify-between mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {sentimentData.positive}% Positivo</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> {sentimentData.neutral}% Neutro</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400" /> {sentimentData.negative}% Negativo</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <EmptyStateCard
              icon={<Search className="h-8 w-8" />}
              title="Sentimento"
              description={hasBrand ? "Análise de sentimento em andamento." : "Configure sua marca para analisar o sentimento."}
            />
          )}

          {/* Alertas */}
          {hasAlerts ? (
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/dashboard/alertas")}>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground mb-3">Alertas Recentes</p>
                <div className="space-y-2">
                  {recentAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-start gap-2">
                      {alertIcon(alert.type)}
                      <p className="text-xs text-foreground leading-tight line-clamp-1">{alert.title}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <EmptyStateCard
              icon={<Bell className="h-8 w-8" />}
              title="Alertas"
              description="Nenhum alerta ainda. Você será notificado quando houver mudanças relevantes."
            />
          )}
        </div>
      </motion.section>

      {/* BLOCO 2: Onde você está ganhando ou perdendo? */}
      <motion.section {...fade} transition={{ delay: 0.2 }}>
        <SectionHeader tone="accent">Onde você está ganhando ou perdendo?</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Menções por modelo */}
          {hasMonitoringData ? (
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/dashboard/monitoramento")}>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground mb-4 flex items-center">Menções por Modelo de IA <InfoTooltip text="Mostra quantas vezes cada IA menciona sua marca." /></p>
                <div className="grid grid-cols-2 gap-3">
                  {monitoringData.models.map((m) => (
                    <div key={m.name} className="p-3 rounded-lg bg-secondary/50">
                      <p className="text-xs font-medium text-foreground">{m.name}</p>
                      <div className="flex items-end justify-between mt-1">
                        <span className="text-xl font-bold font-display">{m.mentions}</span>
                        <span className={`text-xs font-medium flex items-center gap-0.5 ${m.trend === "up" ? "text-emerald-600" : "text-red-500"}`}>
                          {m.trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {m.trendValue > 0 ? "+" : ""}{m.trendValue}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <EmptyStateCard
              icon={<BarChart3 className="h-8 w-8" />}
              title="Menções por Modelo de IA"
              description={hasBrand ? "Coletando dados de menções nos modelos de IA..." : "Configure sua marca para rastrear menções."}
            />
          )}

          {/* Comparativo */}
          {hasMonitoringData && hasCompetitor ? (
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/dashboard/comparativo")}>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground mb-4">{displayName} vs {displayCompetitor}</p>
                <div className="space-y-3">
                  {comparativeData.models.map((m) => (
                    <div key={m.model}>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{m.model}</span>
                        <span>{m.brand} vs {m.competitor}</span>
                      </div>
                      <div className="flex h-2.5 rounded-full overflow-hidden bg-secondary">
                        <div className="bg-primary rounded-full transition-all" style={{ width: `${m.brand}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <EmptyStateCard
              icon={<Target className="h-8 w-8" />}
              title="Comparativo com Concorrente"
              description={!hasCompetitor ? "Adicione um concorrente nas configurações para comparar." : "Coletando dados comparativos..."}
              actionLabel={!hasCompetitor ? "Adicionar concorrente" : undefined}
              actionPath={!hasCompetitor ? "/dashboard/configuracoes" : undefined}
            />
          )}
        </div>
      </motion.section>

      {/* BLOCO 3: O que fazer agora? */}
      <motion.section {...fade} transition={{ delay: 0.3 }}>
        <SectionHeader tone="emerald">O que fazer agora?</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Ações */}
          {hasActions ? (
            <Card className="md:col-span-2 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/dashboard/acoes")}>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground mb-3">Ações Prioritárias</p>
                <div className="space-y-3">
                  {topActions.map((action) => (
                    <div key={action.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                      <CheckCheck className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{action.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{action.impact}</p>
                      </div>
                      <Badge variant="outline" className={
                        action.priority === "high" ? "border-red-200 text-red-600 text-[10px]" :
                        action.priority === "medium" ? "border-amber-200 text-amber-600 text-[10px]" :
                        "border-border text-muted-foreground text-[10px]"
                      }>
                        {action.priority === "high" ? "Alta" : action.priority === "medium" ? "Média" : "Baixa"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="md:col-span-2 border-dashed">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center min-h-[180px]">
                <CheckCheck className="h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-foreground">Ações Prioritárias</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  {hasBrand
                    ? "Quando os dados de monitoramento estiverem prontos, ações personalizadas serão sugeridas aqui."
                    : "Configure sua marca para receber recomendações de ação personalizadas."}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Simulador */}
          <div className="space-y-4">
            {hasPrompts && topPrompt ? (
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/dashboard/prompts")}>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground mb-2 flex items-center">Oportunidade de Prompt <InfoTooltip text="Prompts onde sua marca pode subir de posição." /></p>
                  <p className="text-sm font-medium text-foreground">"{topPrompt.prompt}"</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-[10px]">{topPrompt.model}</Badge>
                    <span className="text-xs text-muted-foreground">Posição #{topPrompt.position}</span>
                  </div>
                </CardContent>
              </Card>
            ) : null}
            <Card className="bg-ivero-gradient-soft cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/dashboard/simulador")}>
              <CardContent className="p-5">
                <Zap className="h-5 w-5 text-primary mb-2" />
                <p className="text-sm font-semibold text-foreground">Simulador de Influência</p>
                <p className="text-xs text-muted-foreground mt-1">Teste como as IAs respondem sobre sua marca</p>
                <Button size="sm" className="mt-3 bg-primary text-primary-foreground hover:bg-primary/90" onClick={(e) => { e.stopPropagation(); navigate("/dashboard/simulador"); }}>
                  Testar agora <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.section>

      {brandModalOpen && <BrandProfileModal onClose={() => setBrandModalOpen(false)} />}
    </div>
  );
}
