import { useState } from "react";
import { motion } from "framer-motion";
import { Cpu, Bell, Search, BarChart2, Check, Bot, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import {
  PLANOS_ARRAY,
  formatBRL,
  annualSavingBRL,
  nextTier,
  type PlanoSugerido,
} from "@/lib/pricing-rules";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * UpgradeModal — 3 planos (Presença / Influência / Autoridade) resumidos sobre
 * o dashboard. Fonte única de preços/nomes/métricas: src/lib/pricing-rules.ts.
 *
 * Destaque dinâmico baseado no plano atual do cliente (useSubscriptionStatus):
 *  - presenca    → destaca Influência,  badge "Próximo passo"
 *  - influencia  → destaca Autoridade,  badge "Próximo passo"
 *  - autoridade  → destaca Autoridade,  badge "Seu plano atual"
 *  - null        → destaca Influência,  badge "Mais escolhido" (fallback landing)
 *  - loading     → nenhum destaque (evita flash Influência → Autoridade)
 */

// Ícone por métrica — decoração local, não é dado de negócio.
const METRIC_ICON: Record<string, typeof Cpu> = {
  "IAs monitoradas": Bot,
  "Avisos/mês": Bell,
  "Prompts monitorados": Search,
  "Consultas/mês": BarChart2,
};

const CTA_BY_PLAN: Record<PlanoSugerido, string> = {
  presenca: "Garantir presença",
  influencia: "Ampliar influência",
  autoridade: "Consolidar autoridade",
};

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  const [isAnnual, setIsAnnual] = useState(true);
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);
  const { plano, isLoading, isPaid, isAdmin } = useSubscriptionStatus();

  // Cálculo do destaque dinâmico. Enquanto carrega → highlightKey = null (sem badge).
  const highlightKey: PlanoSugerido | null = isLoading ? null : nextTier(plano);
  const isAtTop = !isLoading && plano === "autoridade";

  const badgeFor = (key: PlanoSugerido): string | null => {
    if (highlightKey !== key) return null;
    if (isAtTop) return "Seu plano atual";
    if (plano === null || plano === undefined) return "Mais escolhido"; // fallback landing
    return "Próximo passo";
  };

  const handleSelectPlan = async (planKey: PlanoSugerido, planName: string) => {
    // Funil de conversão: descobrir quais planos são clicados e onde param.
    track("upgrade_plan_clicked", {
      plan: planName,
      billing_cycle: isAnnual ? "annual" : "monthly",
      surface: "upgrade_modal",
    });
    if (pendingPlan) return; // guarda de duplo clique
    setPendingPlan(planName);

    try {
      // Já é pagante (assinatura viva no Asaas) → troca de plano.
      // Trial / sem assinatura no gateway → primeira contratação (checkout).
      if (isPaid && !isAdmin) {
        const { data, error } = await supabase.functions.invoke("manage-subscription", {
          body: { action: "change_plan", plano: planKey },
        });
        if (error || data?.error) throw new Error(error?.message ?? data?.error);
        const pr = data?.proRata as { value: number; days: number; invoiceUrl?: string } | null;
        toast({
          title: `Plano alterado para ${planName}`,
          description: pr
            ? `Geramos uma cobrança de R$ ${pr.value.toFixed(2).replace(".", ",")} pela diferença proporcional aos ${pr.days} dia(s) restantes do ciclo atual. O novo valor vale integralmente a partir da próxima cobrança.`
            : data?.mode === "asaas"
              ? "O novo valor já vale para as próximas cobranças."
              : "Seu plano foi atualizado.",
        });
        if (pr?.invoiceUrl) window.open(pr.invoiceUrl, "_blank", "noopener");
        onOpenChange(false);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          plano: planKey,
          nome:
            (userData.user?.user_metadata?.display_name as string) ??
            userData.user?.email ??
            "Cliente Ivero",
          email: userData.user?.email ?? "",
          // Cliente existente trocando de plano: retorno enxuto (sem onboarding).
          tipo: "upgrade",
        },
      });
      if (error || data?.error) throw new Error(error?.message ?? data?.error);
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl as string;
        return;
      }
      throw new Error("Não recebemos o link de pagamento. Tente novamente.");
    } catch (err) {
      toast({
        title: "Não foi possível concluir",
        description: err instanceof Error ? err.message : "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setPendingPlan(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[calc(100vw-2rem)] max-h-[92vh] overflow-y-auto p-0">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
            {PLANOS_ARRAY.map((plan, index) => {
              const price = isAnnual ? formatBRL(plan.annualPrice) : formatBRL(plan.monthlyPrice);
              const saving = annualSavingBRL(plan.key);
              const highlighted = highlightKey === plan.key;
              const badge = badgeFor(plan.key);
              // Densidade do modal: só os 2 highlights principais por plano.
              const shortHighlights = plan.highlights.slice(0, 2);

              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{
                    opacity: 1,
                    y: highlighted ? -6 : 0,
                    scale: highlighted ? 1.02 : 1,
                  }}
                  transition={{ delay: index * 0.06, duration: 0.3 }}
                  className={`relative flex flex-col rounded-xl p-5 transition-all ${
                    highlighted
                      ? "border-2 border-primary bg-gradient-to-b from-primary/[0.08] to-primary/[0.02] shadow-2xl shadow-primary/25 ring-1 ring-primary/20 z-10"
                      : "border border-border bg-card hover:border-primary/20 opacity-95"
                  }`}
                >
                  {badge && (
                    <span
                      className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full whitespace-nowrap shadow-md ${
                        highlighted
                          ? "bg-primary text-primary-foreground ring-2 ring-background"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {badge}
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
                      <span className="text-muted-foreground text-xs ml-1">/mês</span>
                    </motion.div>
                    {isAnnual && (
                      <p className="text-primary text-[11px] font-semibold mt-0.5">
                        ✦ Economia de {saving}/ano
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4 p-2.5 rounded-lg bg-muted/40 border border-border/50">
                    {plan.metrics.map((metric) => {
                      const Icon = METRIC_ICON[metric.label] ?? Cpu;
                      return (
                        <div
                          key={metric.label}
                          className="flex flex-col items-center text-center gap-0.5 py-1"
                        >
                          <Icon
                            className={`w-3.5 h-3.5 mb-0.5 ${
                              highlighted ? "text-primary" : "text-muted-foreground"
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
                    {shortHighlights.map((h) => (
                      <li
                        key={h}
                        className="flex items-start gap-1.5 text-[11px] text-foreground/80 leading-snug"
                      >
                        <Check
                          className={`w-3 h-3 mt-0.5 shrink-0 ${
                            highlighted ? "text-primary" : "text-muted-foreground"
                          }`}
                        />
                        {h}
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={highlighted ? "default" : "outline"}
                    size="sm"
                    className="w-full text-xs mt-auto"
                    onClick={() => void handleSelectPlan(plan.key, plan.name)}
                    disabled={(isAtTop && highlighted) || pendingPlan !== null}
                  >
                    {pendingPlan === plan.name ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Processando...
                      </>
                    ) : isAtTop && highlighted ? (
                      "Plano atual"
                    ) : (
                      CTA_BY_PLAN[plan.key]
                    )}
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
