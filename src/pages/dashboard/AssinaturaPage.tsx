import { useState } from "react";
import { motion } from "framer-motion";
import {
  CreditCard, Download, Sparkles, AlertCircle, Calendar, CheckCircle2,
  ArrowUpRight, Info, HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { UpgradeModal } from "@/components/dashboard/UpgradeModal";
import { track } from "@/lib/analytics";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { PLANOS, formatBRL } from "@/lib/pricing-rules";

/**
 * AssinaturaPage — área financeira do cliente.
 *
 * Estado atual: SEM gateway de pagamento integrado. A página renderiza um
 * shell visual realista com dados mock, claramente etiquetada como
 * "Demonstração". Ações sensíveis (atualizar cartão, mudar plano, cancelar)
 * abrem modal de "em breve" — exceto "Ver planos" que abre o UpgradeModal
 * existente, mantendo consistência com o TrialBanner.
 *
 * Quando integrar Stripe/Paddle, substituir os mocks por dados reais vindos
 * do gateway via edge function.
 */

const mockInvoices = [
  { date: "—", value: "—", status: "Aguardando 1ª cobrança" },
];

export default function AssinaturaPage() {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  const [comingSoonContext, setComingSoonContext] = useState<string>("");

  const openComingSoon = (context: string) => {
    track("billing_action_blocked", { action: context, surface: "assinatura_page" });
    setComingSoonContext(context);
    setComingSoonOpen(true);
  };

  const handleChangePlan = () => {
    track("upgrade_plan_clicked", {
      plan: "open_modal",
      surface: "assinatura_page_change_plan",
    });
    setUpgradeOpen(true);
  };

  const handleContactSupport = () => {
    track("upgrade_contact_clicked", {
      action: comingSoonContext,
      surface: "assinatura_page_coming_soon",
    });
    setComingSoonOpen(false);
    window.location.href = "mailto:contato@ivero.com.br?subject=Suporte%20Assinatura";
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
        <Badge variant="outline" className="gap-1.5 border-accent/40 bg-accent/10 text-accent-foreground">
          <Info className="w-3 h-3" />
          Demonstração — gateway em breve
        </Badge>
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
            <Badge className="bg-primary/15 text-primary border-0 hover:bg-primary/20">
              Teste grátis
            </Badge>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1">
            Plano Gratuito
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Acesso completo por 7 dias para conhecer a plataforma.
          </p>

          <div className="flex items-baseline gap-2 mb-6">
            <span className="text-3xl font-bold text-foreground">R$ 0</span>
            <span className="text-sm text-muted-foreground">/ teste</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleChangePlan} className="gap-1.5">
              Mudar plano
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              onClick={() => openComingSoon("cancelar a assinatura")}
            >
              Cancelar
            </Button>
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

          <h2 className="text-2xl font-bold text-foreground mb-1">
            Sem cobrança agendada
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Você ainda não escolheu um plano pago.
          </p>

          <div className="space-y-2 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Valor previsto</span>
              <span className="font-semibold text-foreground">—</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Data prevista</span>
              <span className="font-semibold text-foreground">—</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Forma de pagamento</span>
              <span className="font-semibold text-foreground">Não cadastrada</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Forma de pagamento */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              Forma de pagamento
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cartões salvos para cobranças recorrentes.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openComingSoon("cadastrar um cartão")}
          >
            Adicionar cartão
          </Button>
        </div>

        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <CreditCard className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhum cartão cadastrado ainda.
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Cadastre uma forma de pagamento ao escolher um plano.
          </p>
        </div>
      </Card>

      {/* Histórico de faturas */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Histórico de faturas
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Todas as cobranças e recibos da sua conta.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
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
              {mockInvoices.map((inv, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-foreground">{inv.date}</td>
                  <td className="px-4 py-3 text-foreground font-medium">{inv.value}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <CheckCircle2 className="w-3 h-3" />
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled
                      className="text-xs h-7"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      —
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
          <AlertCircle className="w-3 h-3" />
          As faturas aparecerão aqui assim que o gateway de pagamento for ativado.
        </p>
      </Card>

      {/* FAQ — antecipa as 5 dúvidas mais comuns sobre trial e gateway */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <HelpCircle className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-base font-semibold text-foreground">
            Perguntas frequentes
          </h3>
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

          <AccordionItem value="gateway">
            <AccordionTrigger
              className="text-sm font-medium text-left"
              onClick={() => track("billing_faq_opened", { question: "por_que_gateway_em_breve" })}
            >
              Por que o gateway de pagamento ainda está em finalização?
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
              Estamos integrando o provedor de pagamentos com a infraestrutura da
              Ivero (cobrança recorrente, emissão de nota fiscal e relatórios
              financeiros). Enquanto a integração não está 100%, ativamos os planos{" "}
              <span className="font-medium text-foreground">manualmente em até 1
              dia útil</span> — você fala com nosso time, escolhe o plano e
              começamos a cobrar no cartão de crédito. É o mesmo plano, mesmo
              preço, com atendimento direto.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="cobranca">
            <AccordionTrigger
              className="text-sm font-medium text-left"
              onClick={() => track("billing_faq_opened", { question: "vou_ser_cobrada_no_trial" })}
            >
              Vou ser cobrada automaticamente quando o trial acabar?
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
              Não. Como o gateway ainda está em finalização e você não cadastrou
              nenhuma forma de pagamento, nada será cobrado automaticamente. No
              fim dos 7 dias o acesso aos recursos do trial continua disponível
              até você decidir contratar um plano pago.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="trocar">
            <AccordionTrigger
              className="text-sm font-medium text-left"
              onClick={() => track("billing_faq_opened", { question: "como_mudar_de_plano" })}
            >
              Como faço para mudar de plano depois?
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
              Quando o gateway estiver no ar, você poderá fazer upgrade ou
              downgrade direto desta página, com cobrança proporcional ao período
              restante. Por enquanto, qualquer mudança é feita por contato com o
              nosso time — sem burocracia, sem multa.
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
              Sim. Sem fidelidade e sem multa de cancelamento. Você mantém o
              acesso até o final do ciclo já pago e nada é cobrado depois disso.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      {/* Upgrade modal (planos reais) */}
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />

      {/* Coming soon modal */}
      <Dialog open={comingSoonOpen} onOpenChange={setComingSoonOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Disponível em breve</DialogTitle>
            <DialogDescription className="pt-2">
              A opção de <span className="font-medium text-foreground">{comingSoonContext}</span>{" "}
              estará disponível assim que finalizarmos a integração com o
              provedor de pagamentos. Enquanto isso, fale com o nosso suporte e
              resolvemos manualmente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setComingSoonOpen(false)}
            >
              Entendi
            </Button>
            <Button onClick={handleContactSupport}>
              Falar com suporte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
