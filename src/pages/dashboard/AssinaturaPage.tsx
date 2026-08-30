import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";

import {
  CreditCard, Download, Sparkles, Calendar, Loader2,
  ArrowUpRight, HelpCircle, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { UpgradeModal } from "@/components/dashboard/UpgradeModal";
import { track } from "@/lib/analytics";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useBillingInvoices, INVOICE_STATUS_LABEL } from "@/hooks/useBillingInvoices";
import { PLANOS, formatBRL } from "@/lib/pricing-rules";

/**
 * AssinaturaPage — área financeira do cliente, ligada ao Asaas de verdade.
 *
 * Faturas, próxima cobrança e forma de pagamento vêm de `manage-subscription`
 * (GET /subscriptions/{id}/payments). Cancelamento e troca de cartão também
 * passam por essa função. Nunca coletamos dados de cartão aqui: a atualização
 * acontece na página hospedada pelo Asaas.
 */

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—";

const PAID_STATUSES = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"];

export default function AssinaturaPage() {
  const {
    plano, status, canceladoAcessoAte, dataVencimento, trialEndsAt,
    effectiveStatus, isLoading: statusLoading, refresh: refreshStatus,
    cicloContratado, ciclosPagos, compromissoMeses,
  } = useSubscriptionStatus();
  const { invoices, next, isLoading: invoicesLoading, reload } = useBillingInvoices();
  const [searchParams] = useSearchParams();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelMotivo, setCancelMotivo] = useState("");
  const [busy, setBusy] = useState<"cancel" | "card" | null>(null);

  const planoInfo = plano ? PLANOS[plano] : null;

  // Compromisso anual: valor promocional em troca de 12 ciclos. Cancelar antes
  // gera cobrança da diferença dos meses já usufruídos com desconto.
  const isAnual = cicloContratado === "anual";
  const valorMensalAtual = planoInfo
    ? isAnual ? planoInfo.annualPrice : planoInfo.monthlyPrice
    : null;
  const ciclosRestantes = Math.max(0, compromissoMeses - ciclosPagos);
  const emCompromisso = isAnual && ciclosPagos > 0 && ciclosRestantes > 0;
  const multaEstimada =
    emCompromisso && planoInfo
      ? (planoInfo.monthlyPrice - planoInfo.annualPrice) * Math.min(ciclosPagos, compromissoMeses)
      : 0;

  // Voltando do checkout (upgrade/contratação): os cards precisam refletir a
  // cobrança nova sem depender de F5.
  const returnedFromCheckout =
    searchParams.get("from") === "asaas" || searchParams.get("tipo") === "upgrade";
  useEffect(() => {
    if (!returnedFromCheckout) return;
    void refreshStatus();
    void reload();
  }, [returnedFromCheckout, refreshStatus, reload]);

  const refreshBilling = () => {
    void refreshStatus();
    void reload();
  };


  const handleChangePlan = () => {
    track("upgrade_plan_clicked", {
      plan: "open_modal",
      surface: "assinatura_page_change_plan",
    });
    setUpgradeOpen(true);
  };

  const handleUpdateCard = async () => {
    setBusy("card");
    const { data, error } = await supabase.functions.invoke("manage-subscription", {
      body: { action: "update_card" },
    });
    setBusy(null);
    if (data?.ok && data?.url) {
      window.open(data.url as string, "_blank", "noopener");
      return;
    }
    // Condição de negócio esperada: a function responde 200 com ok:false + message.
    toast({
      title: "Forma de pagamento",
      description:
        (data?.message as string) ??
        error?.message ??
        "Escolha um plano para cadastrar a forma de pagamento.",
    });
  };

  const handleCancel = async () => {
    setBusy("cancel");
    const { data, error } = await supabase.functions.invoke("manage-subscription", {
      body: { action: "cancel", motivo: cancelMotivo },
    });
    setBusy(null);
    if (error || data?.error) {
      toast({
        title: "Não foi possível cancelar",
        description: error?.message ?? (data?.error as string) ?? "Tente novamente em instantes.",
        variant: "destructive",
      });
      return;
    }
    track("subscription_canceled", { plan: plano ?? "none", surface: "assinatura_page" });
    setCancelOpen(false);
    refreshBilling();

    toast({
      title: "Assinatura cancelada",
      description: [
        data?.acessoAte
          ? `Seu acesso continua até ${formatDate(data.acessoAte as string)}.`
          : "Seu acesso permanece até o fim do período já pago.",
        (data?.multa as { value?: number } | null)?.value
          ? `Geramos a cobrança da diferença de fidelidade: ${formatBRL(
              (data.multa as { value: number }).value,
            )}.`
          : "",
      ]
        .filter(Boolean)
        .join(" "),
    });
    const multaUrl = (data?.multa as { invoiceUrl?: string | null } | null)?.invoiceUrl;
    if (multaUrl) window.open(multaUrl, "_blank", "noopener");
    void reload();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground">
            Assinatura & Pagamento
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie seu plano, forma de pagamento e histórico de faturas.
          </p>
        </div>
      </div>

      {/* Top: Plano atual + Próxima cobrança */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Plano atual */}
        <Card className="p-6 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Plano Atual
              </span>
            </div>
            {status === "trial" && (
              <Badge className="bg-primary/15 text-primary border-0 hover:bg-primary/20">
                Teste grátis
              </Badge>
            )}
            {status === "cancelado" && (
              <Badge variant="outline" className="border-destructive/40 text-destructive">
                Cancelada
              </Badge>
            )}
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1">
            Plano {planoInfo?.name ?? "—"}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {planoInfo?.tagline ?? "Escolha um plano para desbloquear os recursos avançados."}
          </p>
          <div className="flex items-baseline gap-2 mb-6">
            <span className="text-3xl font-bold text-foreground">
              {valorMensalAtual !== null ? formatBRL(valorMensalAtual) : "—"}
            </span>
            <span className="text-sm text-muted-foreground">/ mês</span>
          </div>

          {planoInfo && (
            <p className="text-xs text-muted-foreground mb-4">
              {isAnual ? (
                <>
                  Cobrança mensal com{" "}
                  <span className="font-semibold text-foreground">
                    compromisso de {compromissoMeses} meses
                  </span>
                  {ciclosPagos > 0 && (
                    <>
                      {" "}— {ciclosPagos} de {compromissoMeses} ciclos pagos
                      {ciclosRestantes > 0 && `, faltam ${ciclosRestantes}`}
                    </>
                  )}
                  .
                </>
              ) : (
                <>Cobrança mensal sem compromisso — cancele quando quiser.</>
              )}
            </p>
          )}

          {canceladoAcessoAte && (
            <p className="text-xs text-muted-foreground mb-4">
              Cancelada — seu acesso continua até{" "}
              <span className="font-semibold text-foreground">
                {formatDate(canceladoAcessoAte)}
              </span>
              .
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleChangePlan} className="gap-1.5">
              {status === "cancelado" ? "Reativar plano" : "Mudar plano"}
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
            {status !== "cancelado" && (
              <Button variant="outline" onClick={() => setCancelOpen(true)}>
                Cancelar
              </Button>
            )}
          </div>
        </Card>

        {/* Próxima cobrança */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Próxima Cobrança
            </span>
          </div>

          {invoicesLoading || statusLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
          ) : next ? (
            <>
              <h2 className="text-2xl font-bold text-foreground mb-1">
                {formatBRL(next.value)}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Vencimento em {formatDate(next.dueDate)}
              </p>
              <div className="space-y-2 pt-4 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-semibold text-foreground">
                    {INVOICE_STATUS_LABEL[next.status] ?? next.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Forma de pagamento</span>
                  <span className="font-semibold text-foreground">
                    {next.billingType === "CREDIT_CARD" ? "Cartão de crédito" : next.billingType ?? "—"}
                  </span>
                </div>
              </div>
            </>
          ) : effectiveStatus === "trial" && trialEndsAt ? (
            <>
              <h2 className="text-2xl font-bold text-foreground mb-1">
                {planoInfo ? formatBRL(planoInfo.monthlyPrice) : "A definir"}
              </h2>
              <p className="text-sm text-muted-foreground">
                Primeira cobrança prevista para {formatDate(trialEndsAt)}, ao fim do teste
                {planoInfo ? ` do plano ${planoInfo.name}` : ""}.
              </p>
            </>
          ) : effectiveStatus === "pendente" ? (
            <>
              <h2 className="text-2xl font-bold text-foreground mb-1">Pagamento pendente</h2>
              <p className="text-sm text-muted-foreground">
                Estamos aguardando a confirmação do seu pagamento. Assim que ele for
                confirmado, a cobrança recorrente aparece aqui.
              </p>
            </>
          ) : effectiveStatus === "cancelado" ? (
            <>
              <h2 className="text-2xl font-bold text-foreground mb-1">Cobrança encerrada</h2>
              <p className="text-sm text-muted-foreground">
                {canceladoAcessoAte
                  ? `Não haverá novas cobranças. Seu acesso vai até ${formatDate(canceladoAcessoAte)}.`
                  : "Não haverá novas cobranças. Contrate um plano para voltar a usar."}
              </p>
            </>
          ) : effectiveStatus === "trial_expirado" ? (
            <>
              <h2 className="text-2xl font-bold text-foreground mb-1">Teste encerrado</h2>
              <p className="text-sm text-muted-foreground">
                Contrate um plano para ativar a cobrança recorrente e recuperar o acesso.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-foreground mb-1">
                Sem cobrança agendada
              </h2>
              <p className="text-sm text-muted-foreground">
                Escolha um plano para ativar a cobrança recorrente.
              </p>
            </>
          )}

        </Card>
      </div>

      {/* Forma de pagamento */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              Forma de pagamento
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              A atualização do cartão acontece na página segura do nosso provedor.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleUpdateCard} disabled={busy === "card"}>
            {busy === "card" ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            )}
            Atualizar cartão
          </Button>
        </div>

        {next?.billingType === "CREDIT_CARD" ? (
          <div className="rounded-lg border border-border p-4 flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Cartão de crédito ativo</p>
              <p className="text-xs text-muted-foreground">
                Cobrança recorrente do plano {planoInfo?.name ?? "—"}.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <CreditCard className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum cartão cadastrado ainda.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Cadastre uma forma de pagamento ao escolher um plano.
            </p>
          </div>
        )}
      </Card>

      {/* Histórico de faturas */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Histórico de faturas</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Todas as cobranças e recibos da sua conta.
            </p>
          </div>
        </div>

        {invoicesLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma cobrança ainda.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              As faturas aparecem aqui após a primeira cobrança do seu plano.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr className="text-left">
                  <th className="px-4 py-2.5 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                    Data
                  </th>
                  <th className="px-4 py-2.5 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                    Valor
                  </th>
                  <th className="px-4 py-2.5 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-2.5 font-medium text-xs uppercase tracking-wider text-muted-foreground text-right">
                    Recibo
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const link = PAID_STATUSES.includes(inv.status)
                    ? inv.receiptUrl ?? inv.invoiceUrl
                    : inv.invoiceUrl;
                  return (
                    <tr key={inv.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-foreground">{formatDate(inv.dueDate)}</td>
                      <td className="px-4 py-3 text-foreground font-medium">
                        {formatBRL(inv.value)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">
                          {INVOICE_STATUS_LABEL[inv.status] ?? inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          disabled={!link}
                          asChild={!!link}
                        >
                          {link ? (
                            <a href={link} target="_blank" rel="noopener noreferrer">
                              <Download className="w-3 h-3 mr-1" />
                              Abrir
                            </a>
                          ) : (
                            <span>—</span>
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* FAQ */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <HelpCircle className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-base font-semibold text-foreground">Perguntas frequentes</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Tudo o que você precisa saber sobre o trial e a cobrança.
        </p>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="trial">
            <AccordionTrigger
              className="text-sm font-medium text-left"
              onClick={() => track("billing_faq_opened", { question: "como_funciona_trial" })}
            >
              Como funciona o trial de 7 dias?
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
              Você tem 7 dias para testar a Ivero com acesso liberado ao{" "}
              <span className="font-medium text-foreground">Dashboard</span>,{" "}
              <span className="font-medium text-foreground">Diagnóstico IA</span>,{" "}
              <span className="font-medium text-foreground">Score GEO</span>,{" "}
              <span className="font-medium text-foreground">Configurações</span> e{" "}
              <span className="font-medium text-foreground">Assinatura</span>. Os
              recursos avançados (Monitoramento Multi-IA, Mapa de Prompts, Planos
              de Ação, Simulador, etc.) ficam bloqueados até a contratação de um
              plano pago — você consegue ver o que cada um entrega, mas o conteúdo
              só destrava com o upgrade.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="cobranca">
            <AccordionTrigger
              className="text-sm font-medium text-left"
              onClick={() => track("billing_faq_opened", { question: "vou_ser_cobrada_no_trial" })}
            >
              Quando a primeira cobrança acontece?
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
              Ao escolher um plano você é levado à página segura de pagamento. Se
              ainda estiver no teste, a primeira cobrança é agendada para o fim
              dos 7 dias — e nada é cobrado antes disso. Depois, a renovação é
              mensal e automática no cartão cadastrado.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="trocar">
            <AccordionTrigger
              className="text-sm font-medium text-left"
              onClick={() => track("billing_faq_opened", { question: "como_mudar_de_plano" })}
            >
              Como faço para mudar de plano?
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
              Clique em <span className="font-medium text-foreground">Mudar plano</span>{" "}
              e escolha o novo plano. A alteração é imediata no acesso e o novo
              valor passa a valer nas próximas cobranças — não há cobrança
              proporcional retroativa nem multa.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="cartao">
            <AccordionTrigger
              className="text-sm font-medium text-left"
              onClick={() => track("billing_faq_opened", { question: "como_atualizar_cartao" })}
            >
              Como atualizo o cartão de crédito?
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
              Use o botão{" "}
              <span className="font-medium text-foreground">Atualizar cartão</span>. Você
              é levado à página segura do nosso provedor de pagamentos — a Ivero
              nunca armazena os dados do seu cartão.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="cancelar">
            <AccordionTrigger
              className="text-sm font-medium text-left"
              onClick={() => track("billing_faq_opened", { question: "como_cancelar" })}
            >
              Posso cancelar quando quiser?
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
              Sim. No plano <span className="font-medium text-foreground">mensal</span>{" "}
              não há fidelidade: você mantém o acesso até o fim do ciclo já pago
              e nada é cobrado depois. No plano{" "}
              <span className="font-medium text-foreground">anual</span> (preço
              promocional), o compromisso é de 12 meses — cancelando antes, é
              cobrada a diferença entre o valor cheio e o promocional dos meses
              já utilizados com desconto.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      {/* Upgrade modal (planos reais) */}
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} onPlanChanged={refreshBilling} />

      {/* Confirmação de cancelamento */}
      <Dialog open={cancelOpen} onOpenChange={(o) => !o && setCancelOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar assinatura?</DialogTitle>
            <DialogDescription className="pt-2 leading-relaxed">
              A recorrência é encerrada e nada mais será cobrado. Seu acesso
              continua até{" "}
              <span className="font-semibold text-foreground">
                {formatDate(dataVencimento ?? next?.dueDate ?? trialEndsAt ?? null)}
              </span>{" "}
              — o fim do período já pago.
              {emCompromisso && multaEstimada > 0 && (
                <>
                  {" "}
                  <span className="block mt-3 text-foreground">
                    Seu plano tem preço promocional com compromisso de{" "}
                    {compromissoMeses} meses. Cancelando agora, será gerada uma
                    cobrança única de{" "}
                    <span className="font-semibold">{formatBRL(multaEstimada)}</span>{" "}
                    — a diferença entre o valor cheio e o promocional dos{" "}
                    {Math.min(ciclosPagos, compromissoMeses)} mês(es) já
                    utilizados com desconto.
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              O que motivou o cancelamento? (opcional)
            </label>
            <Textarea
              value={cancelMotivo}
              onChange={(e) => setCancelMotivo(e.target.value)}
              placeholder="Sua resposta nos ajuda a melhorar a Ivero."
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Manter assinatura
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={busy === "cancel"}>
              {busy === "cancel" && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              Confirmar cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
