import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, AlertTriangle, XCircle, ArrowRight, FileSearch, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { getGeoContext } from "@/lib/brand-coverage";
import { cn } from "@/lib/utils";

type CheckStatus = "ok" | "warning" | "critical";
interface Check {
  id: string;
  label: string;
  description: string;
  status: CheckStatus;
}
type DiagnosticState = "found_ok" | "found_issues" | "not_found";

export interface DiagnosticResult {
  origin: string;
  fileUrl: string;
  state: DiagnosticState;
  score: number;
  lastModified: string | null;
  checks: Check[];
}

interface Props {
  initialUrl: string;
  onUrlChange: (url: string) => void;
  onGoToGerador: (url: string) => void;
}

const STATE_META: Record<DiagnosticState, { tone: string; border: string; icon: typeof CheckCircle2; title: string }> = {
  found_ok: {
    tone: "text-emerald-700 bg-emerald-50",
    border: "border-l-4 border-l-emerald-500",
    icon: CheckCircle2,
    title: "Arquivo encontrado e configurado",
  },
  found_issues: {
    tone: "text-amber-700 bg-amber-50",
    border: "border-l-4 border-l-amber-500",
    icon: AlertTriangle,
    title: "Arquivo encontrado com problemas",
  },
  not_found: {
    tone: "text-red-700 bg-red-50",
    border: "border-l-4 border-l-red-500",
    icon: XCircle,
    title: "Arquivo não encontrado",
  },
};

function scoreColor(score: number) {
  if (score <= 40) return { stroke: "hsl(0 72% 51%)", text: "text-red-600", label: "Crítico" };
  if (score <= 70) return { stroke: "hsl(38 92% 50%)", text: "text-amber-600", label: "Atenção" };
  return { stroke: "hsl(142 71% 45%)", text: "text-emerald-600", label: "Bom" };
}

function ScoreGauge({ score, disabled }: { score: number; disabled?: boolean }) {
  const radius = 56;
  const circ = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const color = disabled ? { stroke: "hsl(220 9% 80%)", text: "text-muted-foreground", label: "—" } : scoreColor(score);
  return (
    <div className="relative w-32 h-32">
      <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
        <circle cx="70" cy="70" r={radius} stroke="hsl(220 14% 92%)" strokeWidth="10" fill="none" />
        <motion.circle
          cx="70"
          cy="70"
          r={radius}
          stroke={color.stroke}
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${circ * pct} ${circ}` }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-3xl font-semibold tabular-nums", color.text)}>{score}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{color.label}</span>
      </div>
    </div>
  );
}

function CheckRow({ check }: { check: Check }) {
  const Icon = check.status === "ok" ? CheckCircle2 : check.status === "warning" ? AlertTriangle : XCircle;
  const color =
    check.status === "ok" ? "text-emerald-600" : check.status === "warning" ? "text-amber-600" : "text-red-600";
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", color)} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{check.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{check.description}</p>
      </div>
    </div>
  );
}

export function DiagnosticoTab({ initialUrl, onUrlChange, onGoToGerador }: Props) {
  const [url, setUrl] = useState(initialUrl);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<DiagnosticResult | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (trimmed.length < 4) {
      toast.error("Informe uma URL válida.");
      return;
    }
    onUrlChange(trimmed);
    setLoading(true);
    setResult(null);
    setProgress(8);
    const interval = setInterval(() => {
      setProgress((p) => (p < 90 ? p + Math.random() * 8 : p));
    }, 600);

    try {
      const { data, error } = await supabase.functions.invoke<DiagnosticResult>("diagnose-llms-txt", {
        body: { url: trimmed },
      });
      if (error) throw error;
      if (!data) throw new Error("Resposta vazia do servidor.");
      setProgress(100);
      setResult(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao analisar o site.";
      toast.error(msg);
    } finally {
      clearInterval(interval);
      setTimeout(() => setLoading(false), 250);
    }
  };

  const stateMeta = result ? STATE_META[result.state] : null;
  const StateIcon = stateMeta?.icon;
  const hasIssues = result && result.state !== "found_ok";

  return (
    <div className="space-y-6">
      {/* Input */}
      <Card className="p-5">
        <form onSubmit={handleAnalyze} className="space-y-3">
          <Label htmlFor="llms-url" className="text-sm font-medium">URL do seu site</Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              id="llms-url"
              type="url"
              placeholder="https://seusite.com.br"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="h-11 rounded-lg flex-1"
              disabled={loading}
              required
            />
            <Button
              type="submit"
              disabled={loading}
              className="h-11 px-5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analisando seu site...
                </>
              ) : (
                <>
                  <FileSearch className="h-4 w-4 mr-2" />
                  Analisar site
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            A Ivero irá analisar seu site e verificar se existe um arquivo llms.txt configurado.
          </p>

          {loading && (
            <div className="pt-2 space-y-1.5">
              <Progress value={progress} className="h-1.5" />
              <p className="text-[11px] text-muted-foreground">Isso leva cerca de 15 segundos</p>
            </div>
          )}
        </form>
      </Card>

      {/* Results */}
      <AnimatePresence mode="wait">
        {result && stateMeta && StateIcon && (
          <motion.div
            key={result.fileUrl + result.state}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {/* Status card */}
            <Card className={cn("p-5", stateMeta.border)}>
              <div className="flex items-start gap-4">
                <div className={cn("p-2 rounded-md", stateMeta.tone)}>
                  <StateIcon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-medium text-foreground">{stateMeta.title}</h3>
                  {result.state === "found_ok" && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Encontramos um llms.txt em{" "}
                      <a href={result.fileUrl} target="_blank" rel="noreferrer" className="underline text-primary break-all">
                        {result.fileUrl}
                      </a>
                      {result.lastModified && (
                        <span className="block text-xs mt-1">
                          Última modificação: {new Date(result.lastModified).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </p>
                  )}
                  {result.state === "found_issues" && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Seu llms.txt existe mas tem inconsistências que reduzem sua eficácia.
                    </p>
                  )}
                  {result.state === "not_found" && (
                    <>
                      <p className="text-sm text-muted-foreground mt-1">
                        Nenhum arquivo llms.txt foi encontrado no domínio informado.
                      </p>
                      <Button
                        size="sm"
                        className="mt-3 bg-primary hover:bg-primary/90"
                        onClick={() => onGoToGerador(result.origin)}
                      >
                        Gerar agora <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>

            {/* Score */}
            <Card className="p-5">
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <ScoreGauge score={result.score} disabled={result.state === "not_found"} />
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Qualidade do LLMs.txt</p>
                  <p className="text-lg font-medium text-foreground mt-1">
                    {result.state === "not_found"
                      ? "Sem arquivo para avaliar"
                      : result.score >= 71
                        ? "Configuração sólida"
                        : result.score >= 41
                          ? "Configuração parcial"
                          : "Configuração crítica"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md">
                    Avaliação de 0 a 100 com base na presença, estrutura e atualidade do seu arquivo.
                  </p>
                </div>
              </div>
            </Card>

            {/* Issues */}
            <Card className="p-5">
              <h3 className="text-sm font-medium text-foreground mb-2">Problemas identificados</h3>
              <div>
                {result.checks.map((c) => (
                  <CheckRow key={c.id} check={c} />
                ))}
              </div>
            </Card>

            {/* Recommendation banner */}
            {hasIssues && (
              <Card className="p-5 bg-primary/5 border-primary/20">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                    <p className="text-sm font-medium text-foreground">
                      Quer corrigir esses problemas automaticamente?
                    </p>
                  </div>
                  <Button
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={() => onGoToGerador(result.origin)}
                  >
                    Gerar LLMs.txt otimizado <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
