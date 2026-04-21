import { useState } from "react";
import { motion } from "framer-motion";
import { Cpu, Bell, Search, BarChart2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * UpgradeModal — 4 planos resumidos exibidos sobre o dashboard.
 *
 * Por que um modal próprio (e não reusar InvestSection da landing):
 *  - InvestSection é dark-themed e ocupa tela inteira; quebra dentro de modal claro.
 *  - O modal precisa ser denso (decisão rápida, não navegação contemplativa).
 *  - Mantém o usuário no contexto do dashboard (não "sai" para a landing).
 *
 * Dados sincronizados com landing/InvestSection — qualquer mudança de preço
 * deve ser refletida nos dois lugares (futuro: extrair para src/lib/plans.ts).
 */

type Plan = {
  name: string;
  badge: string | null;
  tagline: string;
  monthlyPrice: string;
  annualPrice: string;
  annualSaving: string | null;
  cta: string;
  highlighted: boolean;
  metrics: { icon: typeof Cpu; label: string; value: string }[];
  highlights: string[];
};

const PLANS: Plan[] = [
  {
    name: "Presença",
    badge: null,
    tagline: "Descubra se as IAs reconhecem sua marca",
    monthlyPrice: "R$ 197",
    annualPrice: "R$ 157",
    annualSaving: "R$ 480",
    cta: "Garantir presença",
    highlighted: false,
    metrics: [
      { icon: Cpu, label: "IAs", value: "2" },
      { icon: Bell, label: "Avisos/mês", value: "50" },
      { icon: Search, label: "Prompts", value: "10" },
      { icon: BarChart2, label: "Consultas", value: "500" },
    ],
    highlights: ["Score GEO de Visibilidade", "Relatório semanal por e-mail"],
  },
  {
    name: "Influência",
    badge: null,
    tagline: "Monitore, reaja e não perca espaço",
    monthlyPrice: "R$ 397",
    annualPrice: "R$ 317",
    annualSaving: "R$ 960",
    cta: "Ampliar influência",
    highlighted: false,
    metrics: [
      { icon: Cpu, label: "IAs", value: "3" },
      { icon: Bell, label: "Avisos/mês", value: "200" },
      { icon: Search, label: "Prompts", value: "30" },
      { icon: BarChart2, label: "Consultas", value: "2.000" },
    ],
    highlights: ["Análise de Sentimento", "Comparativa com concorrentes"],
  },
  {
    name: "Autoridade",
    badge: "🔥 Recomendado",
    tagline: "Citada quando o cliente está decidindo",
    monthlyPrice: "R$ 697",
    annualPrice: "R$ 557",
    annualSaving: "R$ 1.680",
    cta: "Consolidar autoridade",
    highlighted: true,
    metrics: [
      { icon: Cpu, label: "IAs", value: "4" },
      { icon: Bell, label: "Avisos/mês", value: "Ilimitados" },
      { icon: Search, label: "Prompts", value: "100" },
      { icon: BarChart2, label: "Consultas", value: "10k" },
    ],
    highlights: ["Mapa de Prompts Estratégicos", "Plano de Ação Estratégico"],
  },
  {
    name: "Domínio",
    badge: "🔴 Estratégico",
    tagline: "Vantagem competitiva real",
    monthlyPrice: "Custom",
    annualPrice: "Custom",
    annualSaving: null,
    cta: "Receber proposta",
    highlighted: false,
    metrics: [
      { icon: Cpu, label: "IAs", value: "5" },
      { icon: Bell, label: "Avisos/mês", value: "Ilimitados" },
      { icon: Search, label: "Prompts", value: "Ilimitados" },
      { icon: BarChart2, label: "Consultas", value: "Ilimitadas" },
    ],
    highlights: ["Dominância por Modelo de IA", "Simulador de Influência"],
  },
];

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[calc(100vw-2rem)] max-h-[92vh] overflow-y-auto p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 sm:px-8 sm:pt-8 border-b border-border">
          <DialogTitle className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            Desbloqueie o monitoramento contínuo
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base text-muted-foreground">
            Escolha o plano ideal para garantir que sua marca seja vista pelas IAs que o mundo usa.
          </DialogDescription>

          {/* Mensal / Anual */}
          <div className="pt-3">
            <div className="inline-flex items-center gap-1 bg-muted rounded-full p-1">
              <button
                type="button"
                onClick={() => setIsAnnual(false)}
                className={`text-xs font-medium px-4 py-1.5 rounded-full transition-all ${
                  !isAnnual
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Mensal
              </button>
              <button
                type="button"
                onClick={() => setIsAnnual(true)}
                className={`text-xs font-medium px-4 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
                  isAnnual
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Anual
                <span className="text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                  -20%
                </span>
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Cards */}
        <div className="px-6 py-6 sm:px-8 sm:py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
            {PLANS.map((plan, index) => {
              const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
              const isCustom = price === "Custom";

              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06, duration: 0.3 }}
                  className={`relative flex flex-col rounded-xl border p-5 transition-all ${
                    plan.highlighted
                      ? "border-primary/40 bg-primary/[0.03] shadow-lg shadow-primary/5"
                      : "border-border bg-card hover:border-primary/20"
                  }`}
                >
                  {plan.badge && (
                    <span
                      className={`absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full whitespace-nowrap ${
                        plan.highlighted
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {plan.badge}
                    </span>
                  )}

                  <div className="mb-3">
                    <h3 className="font-display text-lg font-bold text-foreground tracking-wide uppercase">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 min-h-[32px]">
                      {plan.tagline}
                    </p>
                  </div>

                  <div className="mb-4 min-h-[56px]">
                    <motion.div
                      key={price}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      <span className="font-display text-2xl font-bold text-foreground">
                        {price}
                      </span>
                      {!isCustom && (
                        <span className="text-muted-foreground text-xs ml-1">/mês</span>
                      )}
                    </motion.div>
                    {isAnnual && !isCustom && plan.annualSaving && (
                      <p className="text-primary text-[11px] font-semibold mt-0.5">
                        ✦ Economia de {plan.annualSaving}/ano
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4 p-2.5 rounded-lg bg-muted/40 border border-border/50">
                    {plan.metrics.map((metric) => {
                      const Icon = metric.icon;
                      return (
                        <div
                          key={metric.label}
                          className="flex flex-col items-center text-center gap-0.5 py-1"
                        >
                          <Icon
                            className={`w-3.5 h-3.5 mb-0.5 ${
                              plan.highlighted ? "text-primary" : "text-muted-foreground"
                            }`}
                          />
                          <span className="text-sm font-bold leading-none text-foreground">
                            {metric.value}
                          </span>
                          <span className="text-[9px] text-muted-foreground leading-tight">
                            {metric.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <ul className="space-y-1.5 mb-5 flex-1">
                    {plan.highlights.map((h) => (
                      <li
                        key={h}
                        className="flex items-start gap-1.5 text-[11px] text-foreground/80 leading-snug"
                      >
                        <Check
                          className={`w-3 h-3 mt-0.5 shrink-0 ${
                            plan.highlighted ? "text-primary" : "text-muted-foreground"
                          }`}
                        />
                        {h}
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={plan.highlighted ? "default" : "outline"}
                    size="sm"
                    className="w-full text-xs mt-auto"
                  >
                    {plan.cta}
                  </Button>
                </motion.div>
              );
            })}
          </div>

          <p className="text-center text-[11px] text-muted-foreground mt-6">
            ✦ Cada plano inclui todos os recursos do anterior · Sem contrato · Cancele quando quiser
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default UpgradeModal;
