import { useEffect, useRef, useState } from "react";
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
  /** Disparado após uma troca de plano concluída no provedor (para recarregar cards). */
  onPlanChanged?: () => void;
  /**
   * Intenção de quem abriu o modal:
   *  - "contratar": pagar agora (banner de trial, recurso bloqueado) → SEMPRE checkout real
   *  - "trocar_plano": ajustar o plano de quem já tem trial/assinatura → troca local/pró-rata
   * Default "trocar_plano" preserva o comportamento da página de Assinatura.
   */
  intent?: "contratar" | "trocar_plano";
}

export function UpgradeModal({
  open,
  onOpenChange,
  onPlanChanged,
  intent = "trocar_plano",
}: UpgradeModalProps) {
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);
  const { plano, isLoading, isAdmin, effectiveStatus, hasAsaasSubscription, cicloContratado } =
    useSubscriptionStatus();
  // Default do toggle segue o ciclo real do cliente — nunca assume "anual".
  const [isAnnual, setIsAnnual] = useState(false);
  // Escolha manual do cliente nunca é sobrescrita pela sincronização tardia.
  const userPickedCiclo = useRef(false);
  // Ressincroniza a cada abertura do modal (e quando o dado da assinatura chega),
  // desde que o cliente ainda não tenha mexido no toggle nesta abertura.
  useEffect(() => {
    if (!open) {
      userPickedCiclo.current = false;
      return;
    }
    if (isLoading || userPickedCiclo.current) return;
    setIsAnnual(cicloContratado === "anual");
  }, [open, isLoading, cicloContratado]);

  const pickCiclo = (annual: boolean) => {
    userPickedCiclo.current = true;
    setIsAnnual(annual);
  };

  // Cálculo do destaque dinâmico. Enquanto carrega → highlightKey = null (sem badge).
  const highlightKey: PlanoSugerido | null = isLoading ? null : nextTier(plano);
  // "Plano atual" só bloqueia quem realmente está com a assinatura viva —
  // cancelado/expirado no topo precisa poder recontratar.
  const isAtTop =
    !isLoading &&
    plano === "autoridade" &&
    (effectiveStatus === "ativo" || effectiveStatus === "inadimplente" || effectiveStatus === "trial");
  // Trocar só o ciclo (mesmo plano) é mudança real de preço: o botão do plano
  // atual precisa ficar clicável nesse caso.
  const cicloChanged = !isLoading && (isAnnual ? "anual" : "mensal") !== cicloContratado;



  const badgeFor = (key: PlanoSugerido): string | null => {
    if (highlightKey !== key) return null;
    if (isAtTop) return "Seu plano atual";
    if (plano === null || plano === undefined) return "Mais escolhido"; // fallback landing
    return "Próximo passo";
  };

  /** Troca de plano sem checkout (trial local ou assinatura viva no provedor). */
  const changePlanLocalOrProvider = async (planKey: PlanoSugerido, planName: string) => {
    const { data, error } = await supabase.functions.invoke("manage-subscription", {
      body: { action: "change_plan", plano: planKey, ciclo: isAnnual ? "anual" : "mensal" },
    });
    if (error || data?.error) throw new Error(error?.message ?? data?.error);
    if (data?.ok === false) {
      // Condição de negócio (ex.: assinatura cancelada) → segue pro checkout.
      throw new Error(
        (data?.message as string) ??
          "Não foi possível trocar o plano. Tente contratar novamente.",
      );
    }
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
    onPlanChanged?.();
    onOpenChange(false);
  };

  const handleSelectPlan = async (planKey: PlanoSugerido, planName: string) => {
    // Estado da assinatura ainda não resolvido: não decidir rota com dado
    // incompleto (era o caminho que levava um trial pra tela de pagamento).
    if (isLoading) return;
    // Funil de conversão: descobrir quais planos são clicados e onde param.
    track("upgrade_plan_clicked", {
      plan: planName,
      billing_cycle: isAnnual ? "annual" : "monthly",
      surface: "upgrade_modal",
    });
    if (pendingPlan) return; // guarda de duplo clique
    setPendingPlan(planName);

    try {
      // Troca de plano (change_plan) vale em dois casos:
      // 1) assinatura VIVA no provedor (ativo/inadimplente com id do Asaas);
      // 2) TRIAL em curso sem vínculo no provedor — não há cobrança a
      //    conciliar, então a troca é local e gratuita, sem abrir checkout.
      // Cancelado e trial expirado seguem sendo contratação real → checkout.
      // Intenção de PAGAR AGORA nunca vira troca local: o cliente quer converter.
      const canChangePlan =
        intent !== "contratar" &&
        !isAdmin &&
        ((hasAsaasSubscription &&
          (effectiveStatus === "ativo" || effectiveStatus === "inadimplente")) ||
          (effectiveStatus === "trial" && !hasAsaasSubscription));

      if (canChangePlan) {
        await changePlanLocalOrProvider(planKey, planName);
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
          // Intenção explícita: o servidor é a autoridade final. Com
          // "trocar_plano" ele recusa abrir checkout quando a troca deve ser
          // local (trial sem vínculo); com "contratar" abre normalmente.
          intent,
          ciclo: isAnnual ? "anual" : "mensal",
        },
      });
      if (error || data?.error) throw new Error(error?.message ?? data?.error);
      // Servidor mandou fazer localmente (trial em curso sem cobrança).
      if (data?.ok === false && data?.reason === "trial_troca_local") {
        await changePlanLocalOrProvider(planKey, planName);
        return;
      }
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
            {intent === "contratar"
              ? "Assine seu plano e mantenha o acesso"
              : "Trocar de plano"}
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base text-muted-foreground">
            {intent === "contratar"
              ? "Escolha o plano e finalize o pagamento para garantir que sua marca continue sendo vista pelas IAs que o mundo usa."
              : "Escolha o novo plano. O ajuste vale a partir da sua próxima cobrança."}
          </DialogDescription>

          {/* Mensal / Anual */}
          <div className="pt-3">
            <div className="inline-flex items-center gap-1 bg-muted rounded-full p-1">
              <button
                type="button"
                onClick={() => pickCiclo(false)}
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
                onClick={() => pickCiclo(true)}
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
                    disabled={(isAtTop && highlighted && !cicloChanged) || pendingPlan !== null || isLoading}
                  >
                    {pendingPlan === plan.name ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Processando...
                      </>
                    ) : isAtTop && highlighted && !cicloChanged ? (
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
