import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Cpu, Bell, Search, BarChart2, Loader2, Sparkles, Bot } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type PlanoSlug = "presenca" | "influencia" | "autoridade";

const PLAN_SLUG_MAP: Record<string, PlanoSlug> = {
  "Presença": "presenca",
  "Influência": "influencia",
  "Autoridade": "autoridade",
};

const plans = [
  {
    name: "Presença",
    badge: null as string | null,
    tagline: "Descubra se as IAs reconhecem sua marca",
    monthlyPrice: "R$ 497",
    annualPrice: "R$ 397",
    annualSaving: "R$ 1.200",
    cta: "Começar com 7 dias grátis →",
    highlighted: false,
    metrics: [
      { icon: Cpu, label: "IAs monitoradas", value: "2" },
      { icon: Bell, label: "Avisos/mês", value: "50" },
      { icon: Search, label: "Prompts monitorados", value: "10" },
      { icon: BarChart2, label: "Consultas/mês", value: "500" },
    ],
    inheritsFrom: null as string | null,
    highlights: ["Score GEO de Visibilidade", "Relatório semanal por e-mail", "Monitoramento Multi-IA", "Prompt Tester"],
  },
  {
    name: "Influência",
    badge: "Mais escolhido",
    tagline: "Monitore, reaja e não perca espaço para concorrentes",
    monthlyPrice: "R$ 897",
    annualPrice: "R$ 717",
    annualSaving: "R$ 2.160",
    cta: "Começar com 7 dias grátis →",
    highlighted: true,
    metrics: [
      { icon: Cpu, label: "IAs monitoradas", value: "3" },
      { icon: Bell, label: "Avisos/mês", value: "200" },
      { icon: Search, label: "Prompts monitorados", value: "30" },
      { icon: BarChart2, label: "Consultas/mês", value: "2.000" },
    ],
    inheritsFrom: "Presença",
    highlights: [
      "Dominância por Modelo de IA",
      "Análise de Sentimento",
      "Análise Comparativa com concorrentes",
      "Tags de Percepção da IA",
      "Evolução Estratégica dos 5 pilares",
      "Gerador de Conteúdo Estratégico",
    ],
  },
  {
    name: "Autoridade",
    badge: null as string | null,
    tagline: "Sua marca citada quando o cliente está decidindo",
    monthlyPrice: "R$ 1.497",
    annualPrice: "R$ 1.197",
    annualSaving: "R$ 3.600",
    cta: "Começar com 7 dias grátis →",
    highlighted: false,
    metrics: [
      { icon: Cpu, label: "IAs monitoradas", value: "4" },
      { icon: Bell, label: "Avisos/mês", value: "Ilimitados" },
      { icon: Search, label: "Prompts monitorados", value: "100" },
      { icon: BarChart2, label: "Consultas/mês", value: "10.000" },
    ],
    inheritsFrom: "Influência",
    highlights: [
      "Simulador de Influência em IA",
      "Mapa de Prompts Estratégicos",
      "Plano de Ação Estratégico",
      "LLMs.txt",
      "Campanhas direcionadas",
      "Relatórios executivos em PDF e XLSX",
    ],
  },
];

const EscolherPlanoPage = () => {
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(true);
  const [checking, setChecking] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedPlano, setSelectedPlano] = useState<PlanoSlug | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        navigate("/auth", { replace: true });
        return;
      }
      // Check existing active/trial subscription
      const { data: subs } = await supabase
        .from("assinaturas")
        .select("status")
        .eq("user_id", session.user.id)
        .in("status", ["ativo", "trial"])
        .limit(1);
      if (cancelled) return;
      if (subs && subs.length > 0) {
        navigate("/dashboard", { replace: true });
        return;
      }
      setEmail(session.user.email ?? "");
      setNome((session.user.user_metadata?.display_name as string) ?? "");
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    if (checking) return;
    const stored = localStorage.getItem("ivero_selected_plan");
    if (!stored) return;

    let planName = stored;
    if (!PLAN_SLUG_MAP[stored]) {
      const entry = Object.entries(PLAN_SLUG_MAP).find(([, slug]) => slug === stored);
      if (entry) planName = entry[0];
    }

    const slug = PLAN_SLUG_MAP[planName];
    if (slug) {
      const el = document.getElementById(`plan-card-${slug}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      setTimeout(() => {
        handlePlanClick(planName);
        localStorage.removeItem("ivero_selected_plan");
      }, 400);
    }
  }, [checking]);

  const handlePlanClick = (planName: string) => {
    const plano = PLAN_SLUG_MAP[planName];
    if (!plano) return;
    setSelectedPlano(plano);
    setCheckoutOpen(true);
  };

  const handleConfirmCheckout = async () => {
    if (!selectedPlano) return;
    if (!nome.trim() || !email.trim()) {
      toast.error("Preencha todos os campos para continuar.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada. Faça login novamente.");
        navigate("/auth");
        return;
      }
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plano: selectedPlano, nome, email },
      });
      if (error) {
        toast.error(error.message || "Erro ao criar assinatura.");
        return;
      }
      if (!data?.success || !data?.checkoutUrl) {
        toast.error(data?.error || "Não foi possível gerar o link de pagamento.");
        return;
      }
      // Same-tab redirect so Asaas returnUrl can bring user back to /bem-vindo
      window.location.href = data.checkoutUrl;
    } catch (err) {
      toast.error((err as Error).message || "Erro inesperado.");
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-surface-1 py-10 sm:py-14">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center max-w-2xl mx-auto mb-8 sm:mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            7 dias grátis — sem cobrança imediata
          </div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3">
            <span className="text-foreground">Escolha o plano ideal para sua </span>
            <span className="text-gradient">marca</span>
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Comece com 7 dias grátis. Cancele quando quiser.
          </p>

          <div className="mt-6 inline-flex items-center gap-3 bg-white border border-ivero-purple/20 rounded-full p-1.5 shadow-sm">
            <button
              onClick={() => setIsAnnual(false)}
              className={`text-sm font-medium px-4 sm:px-5 py-2 rounded-full transition-all duration-200 ${
                !isAnnual
                  ? "bg-ivero-gradient text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`text-sm font-medium px-4 sm:px-5 py-2 rounded-full transition-all duration-200 flex items-center gap-2 ${
                isAnnual
                  ? "bg-ivero-gradient text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Anual
              <span
                className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full shadow-sm ${
                  isAnnual ? "bg-white text-accent" : "bg-accent text-white"
                }`}
              >
                -20%
              </span>
            </button>
          </div>
        </motion.header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-4xl mx-auto items-stretch">
          {plans.map((plan, index) => {
            const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
            return (
              <motion.div
                id={`plan-card-${PLAN_SLUG_MAP[plan.name]}`}
                key={plan.name}
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 80, damping: 20, delay: index * 0.1 }}
                whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
                className={`group relative flex flex-col rounded-2xl border transition-all duration-300 overflow-hidden cursor-pointer ${
                  plan.highlighted
                    ? "border-accent/60 bg-white shadow-xl shadow-accent/10 sm:scale-[1.02] hover:border-accent hover:shadow-accent/20"
                    : "border-ivero-purple/20 bg-white hover:border-ivero-purple/50 hover:shadow-lg hover:shadow-ivero-purple/10"
                }`}
                onClick={() => handlePlanClick(plan.name)}
              >
                <div
                  className={`text-center text-xs font-bold uppercase tracking-wider py-2 px-4 ${
                    plan.badge
                      ? plan.highlighted
                        ? "bg-ivero-gradient text-primary-foreground"
                        : "bg-ivero-purple/10 text-ivero-purple"
                      : "opacity-0 pointer-events-none"
                  }`}
                >
                  {plan.badge ?? "‌"}
                </div>

                <div className="flex flex-col flex-1">
                  <div
                    className={`relative px-4 sm:px-5 pt-3 sm:pt-4 pb-3 mb-1 overflow-hidden ${
                      plan.highlighted
                        ? "bg-gradient-to-br from-accent/12 via-accent/4 to-white"
                        : "bg-gradient-to-br from-ivero-purple/10 via-ivero-purple/3 to-white"
                    }`}
                  >
                    <div
                      className={`absolute -top-4 -left-4 w-20 h-20 rounded-full blur-2xl opacity-40 ${
                        plan.highlighted ? "bg-accent" : "bg-ivero-purple-light"
                      }`}
                    />
                    <div className="relative flex items-center gap-2 mb-1.5 sm:mb-2">
                      {plan.highlighted && (
                        <span className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0 shadow-[0_0_8px_hsl(var(--accent))]" />
                      )}
                      <h3
                        className={`font-display text-lg sm:text-xl font-black tracking-widest uppercase leading-none ${
                          plan.highlighted ? "text-accent" : "text-ivero-purple"
                        }`}
                      >
                        {plan.name}
                      </h3>
                    </div>
                    <p className="relative text-xs sm:text-[13px] leading-snug font-semibold text-foreground/80 min-h-[28px] sm:min-h-[30px]">
                      {plan.tagline}
                    </p>
                  </div>

                  <div className="px-4 sm:px-5 pt-3 sm:pt-4 pb-4 sm:pb-5 flex flex-col flex-1">


                    <div className="mb-3 min-h-[48px] sm:min-h-[52px] flex flex-col justify-start gap-1">
                      <div className="flex items-baseline gap-1">
                        <span className="font-display text-2xl sm:text-[1.75rem] font-bold text-foreground leading-none tracking-tight">
                          {price}
                        </span>
                        <span className="text-muted-foreground text-xs font-medium">/mês</span>
                      </div>
                      {isAnnual && plan.annualSaving && (
                        <span className="inline-flex items-center gap-1 self-start px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20 text-accent text-[11px] sm:text-xs font-semibold">
                          <span className="text-[10px]">✦</span>
                          Economia de {plan.annualSaving}/ano
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3 p-2 sm:p-2.5 rounded-xl border border-accent/15 bg-accent/3">
                      {plan.metrics.map((metric) => {
                        const Icon = metric.icon;
                        return (
                          <div
                            key={metric.label}
                            className="flex flex-col items-center text-center gap-0.5 py-1 sm:py-1.5"
                          >
                            <Icon
                              className={`w-4 h-4 mb-0.5 ${
                                plan.highlighted ? "text-accent" : "text-ivero-purple-light"
                              }`}
                            />
                            <span className="text-sm sm:text-base font-bold leading-none text-foreground">
                              {metric.value}
                            </span>
                            <span className="text-[10px] sm:text-[11px] text-muted-foreground leading-tight">
                              {metric.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex-1 flex flex-col mb-3">
                      {plan.inheritsFrom && (
                        <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground mb-2 leading-none">
                          Tudo do {plan.inheritsFrom} e mais:
                        </p>
                      )}
                      <ul className="space-y-1">
                        {plan.highlights.map((highlight) => (
                          <li
                            key={highlight}
                            className="flex items-start gap-2 text-[13px] leading-snug text-foreground font-semibold"
                          >
                            <span
                              className={`shrink-0 mt-0.5 text-sm font-bold ${
                                plan.highlighted ? "text-accent" : "text-ivero-purple-light"
                              }`}
                            >
                              ✦
                            </span>
                            <span>{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button
                      variant="hero"
                      size="sm"
                      className="w-full mt-auto text-xs py-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlanClick(plan.name);
                      }}
                    >
                      {plan.cta}
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <Dialog open={checkoutOpen} onOpenChange={(open) => !submitting && setCheckoutOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar assinatura</DialogTitle>
            <DialogDescription>
              Você terá 7 dias grátis antes da primeira cobrança. Cancele quando quiser.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="ep-nome">Nome completo</Label>
              <Input
                id="ep-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ep-email">E-mail</Label>
              <Input
                id="ep-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleConfirmCheckout} disabled={submitting} className="w-full">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando link...
                </>
              ) : (
                "Iniciar 7 dias grátis"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default EscolherPlanoPage;
