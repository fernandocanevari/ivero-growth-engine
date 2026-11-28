import { invalidateAccessCache } from "@/lib/access-cache";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Search,
  Map,
  TrendingUp,
  MessageCircle,
  Mail,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  ArrowRight,
  LayoutDashboard,
  Check,

} from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { toast } from "@/hooks/use-toast";
import { PLANOS } from "@/lib/pricing-rules";
import { formatDateBR } from "@/lib/date-display";
import { showChosenPlanNotice } from "@/lib/billing-display";
import { BillingInfoBlocks } from "@/components/dashboard/BillingInfoBlocks";

const REACTIVATION_TOAST_KEY = "ivero_reactivation_toast_shown";

/**
 * BemVindoPage — reservada ao retorno real do Asaas (?from=asaas).
 *
 * DEPRECATED: A cópia inline das 3 perguntas de onboarding (BrandProfileInline)
 * foi removida neste prompt. O onboarding real vive em /onboarding/perguntas
 * e a revisão de respostas no BrandProfileModal (dashboard). Nunca um terceiro
 * lugar.
 *
 * A tela de "Confirmando pagamento..." só aparece agora quando o usuário chega
 * com ?from=asaas — logins normais nunca caem aqui.
 */

type Status = "loading" | "active" | "pending";

// Reativação paga com dias restantes: reconhecida só pela flag ?retomada=1
// (rota /retorno-asaas-retomada). O webhook limpa resumePaidUntil ao pôr a
// linha em "ativo", então a marca da linha não serve. Espera até ~60s
// mostrando "Confirmando seu cartão…" — nunca "Pagamento confirmado".
const RESUME_MAX_ATTEMPTS = 20; // 20 x 3s ≈ 60s
const RESUME_PLAN_ORDER = ["presenca", "influencia", "autoridade"];

export interface ResumeInfo {
  plano: string;
  planoEscolhido: string;
  dataVencimento: string;
}

const planName = (p: string) => PLANOS[p as keyof typeof PLANOS]?.name ?? p;

/** Textos do bloco "Sua assinatura voltou" (cópia exata aprovada, P41). */
export function resumeNoticeCopy(info: ResumeInfo): {
  sentence: string; date: string; same: boolean; higher: boolean; atual: string; escolhido: string;
} {
  const date = formatDateBR(info.dataVencimento).slice(0, 5);
  const same = info.planoEscolhido === info.plano;
  const atual = planName(info.plano);
  const escolhido = planName(info.planoEscolhido);
  const higher = !same && RESUME_PLAN_ORDER.indexOf(info.planoEscolhido) > RESUME_PLAN_ORDER.indexOf(info.plano);
  const sentence = same
    ? `A primeira cobrança é em ${date}. Até lá, tudo segue como está.`
    : `A primeira cobrança é em ${date}. Até lá, você continua no ${atual}.`;
  return { sentence, date, same, higher, atual, escolhido };
}

// Com Checkout Session do Asaas, a assinatura só é criada (e o webhook só
// roda) depois que o cliente conclui o pagamento na tela do Asaas — por isso a
// janela de espera é maior: 40 x 3s = 2 minutos.
const MAX_ATTEMPTS = 40;
const POLL_INTERVAL_MS = 3000;

const BemVindoPage = () => {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const [status, setStatus] = useState<Status>("loading");
  const [hasDiagnosis, setHasDiagnosis] = useState<boolean>(false);
  const [recheckToken, setRecheckToken] = useState(0);
  const [checkoutUrl, setCheckoutUrl] = useState<string>("");
  // true = cliente já concluiu o onboarding (ou voltou de um upgrade):
  // mostramos apenas a confirmação de pagamento, sem a jornada de 3 passos.
  const [leanConfirm, setLeanConfirm] = useState(false);
  // Reativação paga com dias restantes (null = qualquer outro fluxo).
  const [resumeInfo, setResumeInfo] = useState<ResumeInfo | null>(null);
  const [resumeWaiting, setResumeWaiting] = useState(false);
  // P60: liberado por status "trial" (cartão cadastrado, nada cobrado hoje).
  const [trialCard, setTrialCard] = useState(false);
  const [trialCardDate, setTrialCardDate] = useState<string | null>(null);
  const trialCardSentence = trialCardDate
    ? `A primeira cobrança é em ${formatDateBR(trialCardDate).slice(0, 5)}, quando o seu teste termina. Até lá, tudo segue como está.`
    : "A primeira cobrança é no fim do seu teste. Até lá, tudo segue como está.";
  const [resumeFlow] = useState(() => new URLSearchParams(window.location.search).get("retomada") === "1");

  // Reativação com plano maior escolhido: aviso único (não mexe no polling).
  const sub = useSubscriptionStatus();
  const { refresh: refreshSub } = sub;
  useEffect(() => {
    if (status === "active") void refreshSub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);
  useEffect(() => {
    if (status !== "active" || resumeFlow || resumeInfo || sub.isLoading || !sub.dataVencimento) return;
    if (!showChosenPlanNotice({ status: sub.effectiveStatus, plano: sub.plano, planoPretendido: sub.planoPretendido, hasUpgradePending: false })) return;
    try {
      if (sessionStorage.getItem(REACTIVATION_TOAST_KEY)) return;
      sessionStorage.setItem(REACTIVATION_TOAST_KEY, "1");
    } catch {
      return;
    }
    const nome = PLANOS[sub.planoPretendido as keyof typeof PLANOS]?.name ?? sub.planoPretendido;
    toast({
      description: `Pronto, sua assinatura voltou. Nada foi cobrado hoje. A primeira cobrança é em ${formatDateBR(sub.dataVencimento).slice(0, 5)}, e o ${nome} que você escolheu começa nessa data.`,
    });
  }, [status, resumeFlow, resumeInfo, sub.isLoading, sub.effectiveStatus, sub.plano, sub.planoPretendido, sub.dataVencimento]);

  useEffect(() => {
    try {
      setCheckoutUrl(sessionStorage.getItem("ivero_checkout_url") ?? "");
    } catch {
      setCheckoutUrl("");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let resumeAttempts = 0;

    const params = new URLSearchParams(window.location.search);
    const fromAsaas = params.get("from") === "asaas";
    const isUpgrade = params.get("tipo") === "upgrade";
    const isResume = params.get("retomada") === "1";

    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (roleRow) {
        navigate("/dashboard/admin", { replace: true });
        return;
      }

      // Diagnóstico já rodado?
      const { data: hist } = await supabase
        .from("analysis_history")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);
      if (!cancelled) setHasDiagnosis(!!(hist && hist.length > 0));

      // Onboarding já concluído (ou retorno de upgrade) → confirmação enxuta.
      const { data: brand } = await supabase
        .from("brand_settings")
        .select("onboarding_completed_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) setLeanConfirm(isUpgrade || !!brand?.onboarding_completed_at);

      // Sem ?from=asaas, essa tela não faz sentido — manda direto pro dashboard.
      if (!fromAsaas) {
        if (!cancelled) setStatus("active");
        return;
      }

      const poll = async () => {
        if (cancelled) return;
        const { data } = await supabase
          .from("assinaturas")
          .select("status, asaas_subscription_id, plano, plano_pretendido, data_vencimento, ciclos_pagos, trial_ends_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Reativação paga com dias restantes: só libera quando a linha já está
        // "ativo"; até lá, estado neutro. Nunca cai no bloco genérico.
        if (isResume) {
          if (data?.status === "ativo") {
            if (!cancelled) {
              // Já houve cobrança (ex.: recarregou após a 1ª) → bloco genérico.
              if ((data.ciclos_pagos ?? 0) === 0 && data.data_vencimento) setResumeInfo({
                plano: data.plano ?? "",
                planoEscolhido: data.plano_pretendido ?? data.plano ?? "",
                dataVencimento: data.data_vencimento,
              });
              setResumeWaiting(false);
              setStatus("active");
            }
            try {
              sessionStorage.removeItem("ivero_checkout_url");
            } catch { /* noop */ }
            return;
          }
          if (!cancelled) setResumeWaiting(true);
          resumeAttempts++;
          if (resumeAttempts >= RESUME_MAX_ATTEMPTS) {
            if (!cancelled) setStatus("pending");
            return;
          }
          setTimeout(poll, POLL_INTERVAL_MS);
          return;
        }

        // Libera só com status vivo. Ter asaas_subscription_id não basta: o
        // webhook vincula o id no CHECKOUT_PAID/SUBSCRIPTION_CREATED, antes
        // do pagamento confirmado (finding 45).
        if (data?.status === "ativo" || data?.status === "trial") {
          if (!cancelled) {
            if (data.status === "trial") {
              setTrialCard(true);
              setTrialCardDate(data.trial_ends_at ?? null);
            }
            setStatus("active");
          }
          try {
            sessionStorage.removeItem("ivero_checkout_url");
          } catch { /* noop */ }
          return;
        }

        attempts++;

        // Rede de segurança: se após ~15s o webhook ainda não chegou, consulta
        // o Asaas direto (reconcile-asaas) a cada 5 tentativas.
        if (attempts >= 5 && attempts % 5 === 0) {
          try {
            const { data: rec } = await supabase.functions.invoke("reconcile-asaas");
            invalidateAccessCache();
            if (rec?.reconciled) {
              if (!cancelled) setStatus("active");
              try {
                sessionStorage.removeItem("ivero_checkout_url");
              } catch { /* noop */ }
              return;
            }
          } catch (e) {
            console.error("reconcile-asaas falhou:", e);
          }
        }

        if (attempts >= MAX_ATTEMPTS) {
          if (!cancelled) setStatus("pending");
          return;
        }
        setTimeout(poll, POLL_INTERVAL_MS);
      };

      poll();
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [navigate, recheckToken]);

  const handleRecheck = () => {
    setResumeWaiting(false);
    setStatus("loading");
    setRecheckToken((t) => t + 1);
  };


  const ctaLabel = hasDiagnosis
    ? "Ver meu diagnóstico →"
    : "Iniciar meu diagnóstico agora →";
  const ctaSubtext = hasDiagnosis
    ? "Você já tem um diagnóstico gerado"
    : "Leva menos de 2 minutos";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8F5FF] via-white to-[#FBF7FF] relative overflow-hidden">
      <div className="absolute top-[-150px] left-[-100px] w-[500px] h-[500px] rounded-full bg-ivero-purple opacity-[0.10] blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-150px] right-[-100px] w-[500px] h-[500px] rounded-full bg-accent opacity-[0.10] blur-[140px] pointer-events-none" />

      <div className="relative z-10 px-4 sm:px-6 py-12 sm:py-16">
        {status === "loading" && (
          <div className="min-h-[60vh] flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center text-center"
            >
              <Loader2 className="h-12 w-12 text-accent animate-spin mb-5" />
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">
                {resumeWaiting ? "Confirmando seu cartão…" : "Confirmando seu pagamento..."}
              </h2>
              <p className="text-muted-foreground">Isso pode levar alguns segundos.</p>
            </motion.div>
          </div>
        )}

        {status === "pending" && resumeFlow && (
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center max-w-lg">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6">
                Ainda estamos confirmando seu cartão. Isso pode levar alguns instantes.
              </h1>
              <div className="flex flex-col items-center gap-3">
                <Button
                  size="lg"
                  onClick={handleRecheck}
                  className="text-base px-8 py-5 h-auto rounded-full bg-gradient-to-r from-ivero-purple to-accent text-white hover:opacity-95"
                >
                  <RefreshCw className="mr-2" size={18} /> Verificar novamente
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  className="text-base px-8 py-5 h-auto rounded-full text-ivero-purple hover:bg-ivero-purple/5 hover:text-ivero-purple"
                  onClick={() => navigate("/dashboard")}
                >
                  Ir para o Dashboard
                </Button>
              </div>
            </div>
          </div>
        )}

        {status === "pending" && !resumeFlow && (
          <div className="min-h-[60vh] flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-lg"
            >
              <div className="text-5xl sm:text-6xl mb-6">⏳</div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Pagamento em processamento
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground mb-8 leading-relaxed">
                Seu pagamento está sendo confirmado. Assim que confirmado, seu acesso será
                liberado automaticamente. Você receberá um e-mail de confirmação.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  size="lg"
                  onClick={handleRecheck}
                  className="text-base px-8 py-5 h-auto rounded-full bg-gradient-to-r from-ivero-purple to-accent text-white hover:opacity-95"
                >
                  <RefreshCw className="mr-2" size={18} /> Verificar novamente
                </Button>
                {checkoutUrl && (
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="text-base px-8 py-5 h-auto rounded-full border-ivero-purple/30 text-ivero-purple hover:bg-ivero-purple/5 hover:text-ivero-purple"
                  >
                    <a href={checkoutUrl} target="_blank" rel="noopener noreferrer">
                      Reabrir pagamento
                    </a>
                  </Button>
                )}
              </div>
              <Button
                variant="ghost"
                size="lg"
                className="mt-4 text-base px-8 py-5 h-auto rounded-full text-ivero-purple hover:bg-ivero-purple/5 hover:text-ivero-purple"
                onClick={() => navigate(isAdmin ? "/admin" : "/dashboard")}
              >
                {isAdmin ? "Ir para o Painel Administrativo" : "Ir Para o Dashboard"}

              </Button>
            </motion.div>
          </div>
        )}

        {status === "active" && resumeInfo && (() => {
          const copy = resumeNoticeCopy(resumeInfo);
          return (
            <div className="min-h-[60vh] flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-[520px] text-center flex flex-col items-center"
                data-testid="resume-notice"
              >
                <div className="h-16 w-16 rounded-full border-2 border-primary flex items-center justify-center mb-5">
                  <Check className="h-8 w-8 text-primary" aria-hidden="true" />
                </div>
                <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-3">
                  Sua assinatura voltou
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 text-sm font-medium mb-4" data-testid="resume-pill">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Nada foi cobrado hoje
                </span>
                <p className="text-base sm:text-lg text-muted-foreground mb-5 leading-relaxed">{copy.sentence}</p>
                {!copy.same && (
                  <div className="w-full mb-5 text-left">
                    <BillingInfoBlocks
                      testIdPrefix="resume-block"
                      borderClassName="border-border"
                      blocks={[
                        { id: "atual", label: "Seu plano hoje", value: copy.atual },
                        { id: "escolhido", label: "Plano escolhido", value: copy.escolhido },
                        { id: "inicio", label: "Começa em", value: copy.date },
                      ]}
                    />
                  </div>
                )}
                {copy.higher && (
                  <div className="w-full rounded-xl border-2 border-primary/30 bg-primary/5 p-5 mb-4 text-left" data-testid="resume-invite">
                    <p className="text-xs font-medium text-primary mb-1">Dá para começar agora</p>
                    <p className="text-xl font-medium text-foreground mb-2">Quer usar o {copy.escolhido} já?</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Libere o plano hoje pagando só a diferença dos dias que faltam. Você vê o valor antes de pagar.
                    </p>
                    <Button
                      onClick={() => navigate("/dashboard/assinatura")}
                      className="w-full h-[46px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Já quero usar o plano {copy.escolhido}
                      <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
                    </Button>
                  </div>
                )}
                {copy.higher ? (
                  <Button
                    variant="outline"
                    onClick={() => navigate("/dashboard")}
                    className="w-full h-[46px] font-semibold bg-background border-[1.5px] border-primary text-primary hover:bg-primary/5 hover:text-primary"
                  >
                    <LayoutDashboard className="h-4 w-4 mr-2" aria-hidden="true" />
                    Acessar Dashboard
                  </Button>
                ) : (
                  <div className="w-full flex flex-col items-center gap-2">
                    <Button
                      onClick={() => navigate("/dashboard")}
                      className="w-full h-[46px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <LayoutDashboard className="h-4 w-4 mr-2" aria-hidden="true" />
                      Acessar Dashboard
                    </Button>
                    <Button variant="link" onClick={() => navigate("/dashboard/assinatura")} className="text-primary">
                      Ver minha assinatura
                    </Button>
                  </div>
                )}
              </motion.div>
            </div>
          );
        })()}

        {status === "active" && !resumeInfo && leanConfirm && (
          <div className="min-h-[60vh] flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-lg"
            >
              <CheckCircle2 className="mx-auto text-ivero-purple mb-6" size={56} />
              {trialCard ? (
                <div data-testid="trial-card-notice">
                  <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#1A1A2E] mb-3">
                    Cartão cadastrado
                  </h1>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 text-sm font-medium mb-4" data-testid="trial-card-pill">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Nada foi cobrado hoje
                </span>
                  <p className="text-base sm:text-lg text-muted-foreground mb-8 leading-relaxed" data-testid="trial-card-sentence">
                    {trialCardSentence}
                  </p>
                </div>
              ) : (
                <>
                  <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#1A1A2E] mb-3">
                    Pagamento confirmado
                  </h1>
                  <p className="text-base sm:text-lg text-muted-foreground mb-8 leading-relaxed">
                    Seu plano já está ativo. Tudo pronto para continuar de onde você parou.
                  </p>
                </>
              )}
              <Button
                size="lg"
                onClick={() => navigate("/dashboard")}
                className="text-base px-10 py-6 h-auto rounded-full bg-gradient-to-r from-ivero-purple to-accent hover:opacity-95 text-white shadow-lg shadow-ivero-purple/25"
              >
                Acessar Dashboard
              </Button>
            </motion.div>
          </div>
        )}

        {status === "active" && !resumeInfo && !leanConfirm && (
          <div className="max-w-4xl mx-auto space-y-16 sm:space-y-20">
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center pt-4"
            >
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                className="text-7xl sm:text-8xl mb-6 inline-block"
              >
                🎉
              </motion.div>
              <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-bold text-[#1A1A2E] leading-tight mb-5 max-w-3xl mx-auto">
                Parabéns! Sua marca acaba de dar o primeiro passo para{" "}
                <span className="bg-gradient-to-r from-ivero-purple to-accent bg-clip-text text-transparent">
                  dominar as IAs.
                </span>
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-ivero-purple font-medium max-w-2xl mx-auto leading-relaxed">
                A partir de agora, vamos trabalhar juntos para garantir que quando o seu
                cliente perguntar para uma IA — sua marca seja a resposta.
              </p>
              {trialCard && (
                <div className="mt-6 flex flex-col items-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 text-sm font-medium mb-4" data-testid="trial-card-pill">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Nada foi cobrado hoje
                </span>
                  <p className="text-base sm:text-lg text-muted-foreground leading-relaxed text-center" data-testid="trial-card-sentence">
                    {trialCardSentence}
                  </p>
                </div>
              )}
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-center text-[#1A1A2E] mb-10">
                Sua jornada começa aqui
              </h2>
              <div className="grid md:grid-cols-3 gap-5">
                {[
                  {
                    icon: Search,
                    title: "Vamos revelar onde sua marca está hoje",
                    text: "Descobriremos onde sua marca aparece, onde está invisível e o que está impedindo de ser citada pelas IAs.",
                  },
                  {
                    icon: Map,
                    title: "Construímos o caminho para sua marca aparecer",
                    text: "Com base no diagnóstico, entregamos um plano de ação personalizado com tudo que as IAs precisam para começar a citar sua marca.",
                  },
                  {
                    icon: TrendingUp,
                    title: "Sua marca cresce nas IAs",
                    text: "Monitoramos sua evolução em tempo real. A cada mês você vê sua marca crescendo nas respostas das IAs.",
                  },
                ].map((phase, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    className="relative bg-white rounded-2xl p-6 border border-ivero-purple/10 shadow-sm hover:shadow-lg hover:border-ivero-purple/30 transition-all"
                  >
                    <div className="absolute -top-3 -left-3 w-9 h-9 rounded-full bg-gradient-to-br from-ivero-purple to-accent text-white font-bold flex items-center justify-center text-sm shadow-md">
                      {i + 1}
                    </div>
                    <div className="mb-4 inline-flex p-3 rounded-xl bg-ivero-purple/10 text-ivero-purple">
                      <phase.icon size={22} />
                    </div>
                    <h3 className="font-display text-lg font-semibold text-[#1A1A2E] mb-2 leading-snug">
                      {phase.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {phase.text}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5 }}
            >
              <div className="relative max-w-3xl mx-auto rounded-2xl border-2 border-ivero-purple/40 bg-gradient-to-br from-white via-[#F8F5FF] to-white p-7 sm:p-9 shadow-md">
                <div className="absolute -top-4 left-6 px-3 py-1 rounded-full bg-gradient-to-r from-ivero-purple to-accent text-white text-xs font-semibold tracking-wide shadow">
                  DADO REAL
                </div>
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="text-ivero-purple flex-shrink-0 mt-1" size={28} />
                  <p className="text-base sm:text-lg text-[#1A1A2E] leading-relaxed font-medium">
                    Marcas que completam o diagnóstico nos primeiros{" "}
                    <span className="text-ivero-purple font-bold">7 dias</span> têm{" "}
                    <span className="text-accent font-bold">3x mais chance</span> de
                    aparecer nas IAs em 30 dias.
                  </p>
                </div>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#1A1A2E] mb-3">
                Você não está sozinho nessa jornada
              </h2>
              <p className="text-base text-muted-foreground max-w-xl mx-auto mb-7">
                Nosso atendimento é prioritário — sempre estaremos aqui para te atender
                quando precisar.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  asChild
                  size="lg"
                  className="bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-full px-7 h-12"
                >
                  <a href="#" target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="mr-2" size={18} /> Falar no WhatsApp
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-ivero-purple/30 text-ivero-purple hover:bg-ivero-purple/5 hover:text-ivero-purple rounded-full px-7 h-12"
                >
                  <a href="#">
                    <Mail className="mr-2" size={18} /> Enviar e-mail
                  </a>
                </Button>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center pb-8"
            >
              <Button
                size="lg"
                onClick={() => navigate("/dashboard")}
                className="text-base sm:text-lg px-10 sm:px-14 py-6 sm:py-7 h-auto rounded-full bg-gradient-to-r from-ivero-purple to-accent hover:opacity-95 text-white shadow-xl shadow-ivero-purple/30 transition-all hover:scale-[1.02]"
              >
                {ctaLabel}
              </Button>
              <p className="text-sm text-muted-foreground mt-4">{ctaSubtext}</p>
            </motion.section>
          </div>
        )}
      </div>
    </div>
  );
};

export default BemVindoPage;
