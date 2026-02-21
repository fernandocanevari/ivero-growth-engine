import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, ArrowRight, CheckCircle2, AlertTriangle, Info, CheckCheck, Zap } from "lucide-react";
import { InfoTooltip } from "@/components/InfoTooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import {
  geoScore, sentimentData, alertsData, monitoringData,
  comparativeData, actionsData, promptsData, brandName, competitorName,
} from "@/lib/mock-data";
import { useBrandSettings } from "@/hooks/useBrandSettings";

const fade = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

export default function DashboardOverview() {
  const navigate = useNavigate();
  const { data: settings } = useBrandSettings();
  const topActions = actionsData.filter((a) => !a.completed).slice(0, 3);
  const displayName = settings?.brand_name || brandName;
  const topPrompt = promptsData.find((p) => p.opportunity === "high" && p.position > 2);
  const recentAlerts = alertsData.slice(0, 3);

  const alertIcon = (type: string) => {
    if (type === "success") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (type === "warning") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    if (type === "danger") return <AlertTriangle className="h-4 w-4 text-red-500" />;
    return <Info className="h-4 w-4 text-blue-500" />;
  };

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <motion.div {...fade}>
        <h1 className="text-2xl font-bold font-display text-foreground">
          Olá, {displayName} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Resumo da sua presença nas IAs — atualizado em tempo real.
        </p>
      </motion.div>

      {/* BLOCO 1: Como sua marca está sendo percebida? */}
      <motion.section {...fade} transition={{ delay: 0.1 }}>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Como sua marca está sendo percebida?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Score GEO */}
          <Card className="relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/dashboard/score")}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground flex items-center">Score GEO <InfoTooltip text="Mede o quanto sua marca é visível e relevante nas respostas das IAs. Quanto maior, mais você é recomendado." /></p>
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

          {/* Sentimento */}
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

          {/* Alertas Recentes */}
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
        </div>
      </motion.section>

      {/* BLOCO 2: Onde você está ganhando ou perdendo? */}
      <motion.section {...fade} transition={{ delay: 0.2 }}>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Onde você está ganhando ou perdendo?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cards por modelo */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/dashboard/monitoramento")}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground mb-4 flex items-center">Menções por Modelo de IA <InfoTooltip text="Mostra quantas vezes cada IA menciona sua marca. Identifique onde investir para ser mais recomendado." /></p>
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

          {/* Comparativo rápido */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/dashboard/comparativo")}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground mb-4">{brandName} vs {competitorName}</p>
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
              <div className="flex justify-between items-center mt-4 pt-3 border-t border-border">
                <span className="text-sm font-medium text-foreground">Geral: {comparativeData.overallBrand} vs {comparativeData.overallCompetitor}</span>
                <Badge className={comparativeData.overallBrand > comparativeData.overallCompetitor ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-red-100 text-red-600 hover:bg-red-100"}>
                  {comparativeData.overallBrand > comparativeData.overallCompetitor ? "Liderando" : "Atrás"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.section>

      {/* BLOCO 3: O que fazer agora? */}
      <motion.section {...fade} transition={{ delay: 0.3 }}>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          O que fazer agora?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Top ações */}
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

          {/* Simulador + prompt */}
          <div className="space-y-4">
            {topPrompt && (
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/dashboard/prompts")}>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground mb-2 flex items-center">Oportunidade de Prompt <InfoTooltip text="Prompts onde sua marca pode subir de posição. Otimize seu conteúdo para conquistar essas recomendações." /></p>
                  <p className="text-sm font-medium text-foreground">"{topPrompt.prompt}"</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-[10px]">{topPrompt.model}</Badge>
                    <span className="text-xs text-muted-foreground">Posição #{topPrompt.position}</span>
                  </div>
                </CardContent>
              </Card>
            )}
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
    </div>
  );
}
