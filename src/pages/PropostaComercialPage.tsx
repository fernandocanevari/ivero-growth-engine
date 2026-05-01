import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Sparkles,
  Target,
} from "lucide-react";

import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  buildProposal,
  pillarColor,
  type CommercialProposal,
  type PillarKey,
  type PillarScores,
} from "@/lib/commercial-proposal";

const PILLAR_LABELS: Record<PillarKey, string> = {
  clareza: "Clareza",
  autoridade: "Autoridade",
  posicionamento: "Posicionamento",
  conversao: "Conversão",
  relevancia: "Relevância",
};

const LOADING_MESSAGES = [
  "Consultando ChatGPT sobre sua marca…",
  "Cruzando análise com Gemini…",
  "Avaliando os 5 pilares estratégicos…",
  "Calculando score de visibilidade em IA…",
  "Montando sua proposta personalizada…",
];

const leadSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(100),
  email: z
    .string()
    .trim()
    .email("E-mail inválido")
    .max(255)
    .refine((v) => /\.[a-z]{2,}$/i.test(v), "E-mail incompleto"),
  phone: z.string().trim().min(8, "Telefone inválido").max(20),
});

interface DiagnosticResponse {
  url: string;
  brandName: string;
  overall: number;
  status_label: string;
  pillars: Record<PillarKey, { score: number; justificativa: string }>;
}

export default function PropostaComercialPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialUrl = searchParams.get("url") || "";

  const [siteInput, setSiteInput] = useState(initialUrl);
  const [loading, setLoading] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [diagnostic, setDiagnostic] = useState<DiagnosticResponse | null>(null);
  const [proposal, setProposal] = useState<CommercialProposal | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [submittingLead, setSubmittingLead] = useState(false);
  const [leadDone, setLeadDone] = useState(false);

  // Auto-roda quando chega com ?url=
  useEffect(() => {
    if (initialUrl && !diagnostic && !loading) {
      runDiagnostic(initialUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rotaciona mensagens de loading
  useEffect(() => {
    if (!loading) return;
    const t = setInterval(() => {
      setLoadingMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 1800);
    return () => clearInterval(t);
  }, [loading]);

  async function runDiagnostic(url: string) {
    const trimmed = url.trim();
    if (!trimmed) {
      toast({ title: "Informe o site da marca", variant: "destructive" });
      return;
    }
    setLoading(true);
    setError(null);
    setDiagnostic(null);
    setProposal(null);
    setLoadingMsgIndex(0);

    const startedAt = Date.now();
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "propose-diagnostic",
        { body: { url: trimmed } },
      );
      // Loading mínimo de 7s para impacto visual
      const elapsed = Date.now() - startedAt;
      if (elapsed < 7000) {
        await new Promise((r) => setTimeout(r, 7000 - elapsed));
      }

      if (fnError) throw fnError;
      if (!data || data.error) throw new Error(data?.error || "Falha");

      const diag = data as DiagnosticResponse;
      setDiagnostic(diag);

      const scores: PillarScores = {
        clareza: diag.pillars.clareza?.score ?? 0,
        autoridade: diag.pillars.autoridade?.score ?? 0,
        posicionamento: diag.pillars.posicionamento?.score ?? 0,
        conversao: diag.pillars.conversao?.score ?? 0,
        relevancia: diag.pillars.relevancia?.score ?? 0,
      };
      setProposal(buildProposal(diag.brandName, scores));
    } catch (e: any) {
      console.error(e);
      setError(
        "Não conseguimos gerar o diagnóstico agora. Tente novamente em instantes.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLeadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingLead) return;

    const parsed = leadSchema.safeParse({
      name: leadName,
      email: leadEmail,
      phone: leadPhone,
    });
    if (!parsed.success) {
      toast({
        title: "Verifique seus dados",
        description: parsed.error.errors[0]?.message,
        variant: "destructive",
      });
      return;
    }

    setSubmittingLead(true);
    try {
      await supabase.from("leads").insert({
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        site: diagnostic?.url || "",
        source: "proposta_comercial",
      } as any);
      setLeadDone(true);
    } catch (e) {
      console.error(e);
      toast({
        title: "Não conseguimos registrar agora",
        description: "Tente novamente ou nos chame pelo WhatsApp.",
        variant: "destructive",
      });
    } finally {
      setSubmittingLead(false);
    }
  }

  return (
    <div className="min-h-screen bg-ivero-dark text-primary-foreground font-sans">
      <Helmet>
        <title>Sua Proposta Personalizada — Ivero</title>
        <meta
          name="description"
          content="Diagnóstico de visibilidade em IA + proposta comercial sob medida para sua marca."
        />
      </Helmet>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-ivero-dark/80 backdrop-blur-md border-b border-ivero-purple/10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="font-display text-2xl font-bold text-gradient">
            Ivero
          </a>
          <a
            href="/propostadevalor"
            className="text-sm text-ivero-slate-light hover:text-primary-foreground transition-colors"
          >
            ← Proposta de valor
          </a>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 max-w-5xl">
        {/* Estado inicial sem URL */}
        {!loading && !diagnostic && !error && (
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="font-display text-3xl sm:text-5xl font-bold mb-6">
              Vamos analisar a sua marca
            </h1>
            <p className="text-ivero-slate-light mb-8">
              Digite o site abaixo. Em ~10 segundos você terá seu diagnóstico
              estratégico e uma proposta sob medida.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runDiagnostic(siteInput);
              }}
              className="relative"
            >
              <div className="relative group">
                <div className="absolute -inset-1 rounded-2xl sm:rounded-full bg-gradient-to-r from-[hsl(265,70%,55%)] via-[hsl(300,70%,50%)] to-[hsl(265,70%,55%)] opacity-50 blur-lg animate-pulse" />
                <div className="relative flex flex-col sm:flex-row sm:items-center sm:h-14 sm:rounded-full rounded-2xl bg-ivero-dark-surface border border-ivero-purple/30 overflow-hidden">
                  <input
                    type="text"
                    placeholder="Digite o site da sua marca"
                    value={siteInput}
                    onChange={(e) => setSiteInput(e.target.value)}
                    className="flex-1 bg-transparent text-primary-foreground placeholder:text-ivero-slate text-sm sm:text-base outline-none px-5 pt-4 pb-2 sm:py-0"
                  />
                  <Button
                    variant="hero"
                    size="lg"
                    type="submit"
                    className="text-sm px-6 h-12 sm:h-14 w-full sm:w-auto rounded-none rounded-b-2xl sm:rounded-none shrink-0"
                  >
                    Analisar agora
                    <ArrowRight className="ml-1.5 w-4 h-4" />
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="relative w-24 h-24 mb-8">
              <div className="absolute inset-0 rounded-full bg-ivero-gradient opacity-30 blur-2xl animate-pulse" />
              <div className="relative w-full h-full rounded-full bg-ivero-gradient flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary-foreground animate-spin" />
              </div>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold mb-3">
              Analisando sua marca
            </h2>
            <AnimatePresence mode="wait">
              <motion.p
                key={loadingMsgIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4 }}
                className="text-ivero-slate-light text-lg"
              >
                {LOADING_MESSAGES[loadingMsgIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        )}

        {/* ERRO */}
        {error && !loading && (
          <div className="text-center py-20">
            <p className="text-rose-300 mb-6">{error}</p>
            <Button
              variant="hero"
              onClick={() => runDiagnostic(siteInput || initialUrl)}
            >
              Tentar novamente
            </Button>
          </div>
        )}

        {/* RESULTADO */}
        {diagnostic && proposal && !loading && (
          <div className="space-y-12">
            {/* SCORE GERAL */}
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="relative p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-ivero-dark-surface to-ivero-dark border border-ivero-purple/30 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-96 h-96 bg-ivero-purple/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative">
                <span className="text-sm font-semibold text-ivero-purple uppercase tracking-wider">
                  Diagnóstico estratégico
                </span>
                <h1 className="font-display text-3xl sm:text-5xl font-bold mt-2 mb-2">
                  {diagnostic.brandName}
                </h1>
                <p className="text-ivero-slate-light mb-8">{diagnostic.url}</p>

                <div className="flex items-end gap-6 mb-2">
                  <div>
                    <div className="text-7xl sm:text-8xl font-display font-bold text-gradient leading-none">
                      {diagnostic.overall}
                    </div>
                    <div className="text-sm text-ivero-slate mt-1">
                      Score de visibilidade em IA
                    </div>
                  </div>
                  <div
                    className={`px-4 py-2 rounded-full text-sm font-semibold border ${
                      proposal.statusLabel === "Referência"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                        : proposal.statusLabel === "Sólido"
                          ? "bg-sky-500/10 border-sky-500/30 text-sky-300"
                          : proposal.statusLabel === "Insuficiente"
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                            : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                    }`}
                  >
                    {proposal.statusLabel}
                  </div>
                </div>

                <p className="text-lg text-primary-foreground/90 leading-relaxed mt-6 max-w-3xl">
                  {proposal.diagnosis}
                </p>
              </div>
            </motion.section>

            {/* PILARES */}
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <h2 className="font-display text-2xl sm:text-3xl font-bold mb-6">
                Os 5 pilares
              </h2>
              <div className="space-y-4">
                {(Object.keys(PILLAR_LABELS) as PillarKey[]).map((key, i) => {
                  const score = diagnostic.pillars[key]?.score ?? 0;
                  const cor = pillarColor(score);
                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: i * 0.06 }}
                      className="p-5 rounded-2xl bg-ivero-dark-surface border border-ivero-purple/15"
                    >
                      <div className="flex items-baseline justify-between mb-2 gap-4">
                        <h3 className="font-display text-lg font-semibold">
                          {PILLAR_LABELS[key]}
                        </h3>
                        <div className="flex items-baseline gap-3 shrink-0">
                          <span className="text-2xl font-bold">{score}</span>
                          <span className={`text-xs font-semibold ${cor.text}`}>
                            {cor.label}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-ivero-dark overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${score}%` }}
                          transition={{ duration: 0.8, delay: 0.2 + i * 0.06 }}
                          className={`h-full bg-gradient-to-r ${cor.bar}`}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.section>

            {/* PROPOSTA: O QUE VAMOS RESOLVER */}
            {proposal.weakPoints.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <span className="text-sm font-semibold text-ivero-purple uppercase tracking-wider">
                  Sua proposta personalizada
                </span>
                <h2 className="font-display text-2xl sm:text-4xl font-bold mt-2 mb-8">
                  O que vamos resolver primeiro
                </h2>
                <div className="space-y-4">
                  {proposal.weakPoints.map((wp, i) => (
                    <div
                      key={wp.pillar}
                      className="flex gap-4 p-6 rounded-2xl bg-ivero-dark-surface border border-ivero-purple/20"
                    >
                      <div className="shrink-0 w-10 h-10 rounded-xl bg-ivero-gradient flex items-center justify-center font-bold">
                        {i + 1}
                      </div>
                      <div>
                        <h3 className="font-display text-lg font-semibold mb-1">
                          {wp.label}{" "}
                          <span className="text-ivero-slate text-sm font-normal">
                            (score atual: {wp.score})
                          </span>
                        </h3>
                        <p className="text-ivero-slate-light leading-relaxed">
                          {wp.action}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* PLANO RECOMENDADO */}
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-[hsl(265,40%,12%)] to-ivero-dark-surface border-2 border-ivero-purple/40 overflow-hidden"
            >
              <div className="absolute -top-20 -right-20 w-80 h-80 bg-accent/15 rounded-full blur-3xl pointer-events-none" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <Target className="w-5 h-5 text-ivero-purple" />
                  <span className="text-sm font-semibold text-ivero-purple uppercase tracking-wider">
                    Plano recomendado para você
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h2 className="font-display text-3xl sm:text-5xl font-bold">
                    {proposal.recommendedPlan.name}
                  </h2>
                  {proposal.recommendedPlan.badge && (
                    <span className="px-3 py-1 rounded-full bg-accent/20 border border-accent/40 text-sm">
                      {proposal.recommendedPlan.badge}
                    </span>
                  )}
                </div>
                <p className="text-lg text-ivero-slate-light mb-6">
                  {proposal.recommendedPlan.tagline}
                </p>

                <div className="flex items-baseline gap-3 mb-6">
                  <span className="text-4xl font-bold text-gradient">
                    {proposal.recommendedPlan.annualPrice}
                  </span>
                  {proposal.recommendedPlan.annualPrice !== "Custom" && (
                    <span className="text-ivero-slate">/mês no anual</span>
                  )}
                </div>

                <ul className="space-y-3 mb-6">
                  {proposal.recommendedPlan.highlights.map((h) => (
                    <li
                      key={h}
                      className="flex items-start gap-3 text-primary-foreground/90"
                    >
                      <CheckCircle2 className="w-5 h-5 text-ivero-purple shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>

                <p className="text-sm text-ivero-slate-light italic border-l-2 border-ivero-purple/40 pl-4">
                  {proposal.comparativeNarrative}
                </p>
              </div>
            </motion.section>

            {/* PRÓXIMOS PASSOS */}
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="font-display text-2xl sm:text-3xl font-bold mb-6">
                Como funciona a partir daqui
              </h2>
              <div className="grid sm:grid-cols-3 gap-4">
                {proposal.nextSteps.map((step, i) => (
                  <div
                    key={i}
                    className="p-6 rounded-2xl bg-ivero-dark-surface border border-ivero-purple/15"
                  >
                    <div className="text-3xl font-display font-bold text-gradient mb-2">
                      0{i + 1}
                    </div>
                    <p className="text-ivero-slate-light leading-relaxed">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* CTA FINAL */}
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-ivero-purple/15 to-accent/10 border border-ivero-purple/30 text-center overflow-hidden"
            >
              <Sparkles className="w-10 h-10 text-ivero-purple mx-auto mb-4" />
              <h2 className="font-display text-2xl sm:text-4xl font-bold mb-4">
                Vamos transformar isso em resultado?
              </h2>
              <p className="text-ivero-slate-light mb-8 max-w-xl mx-auto">
                Nosso time entra em contato em até 24h para validar o
                diagnóstico e desenhar o roadmap de execução.
              </p>
              <Button
                variant="hero"
                size="lg"
                className="px-8 h-14 text-base"
                onClick={() => setLeadModalOpen(true)}
              >
                Quero falar com um especialista
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </motion.section>

            {/* link para diagnóstico completo */}
            <div className="text-center pt-8 border-t border-ivero-purple/10">
              <p className="text-sm text-ivero-slate-light">
                Quer ver o diagnóstico completo, com nuvem de percepção e
                benchmarks?{" "}
                <button
                  onClick={() =>
                    navigate(
                      `/preview?url=${encodeURIComponent(diagnostic.url)}`,
                    )
                  }
                  className="text-ivero-purple hover:text-ivero-pink underline underline-offset-4"
                >
                  Ver análise completa →
                </button>
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Modal de captura */}
      <Dialog
        open={leadModalOpen}
        onOpenChange={(o) => {
          if (!submittingLead) setLeadModalOpen(o);
          if (!o) setLeadDone(false);
        }}
      >
        <DialogContent className="bg-ivero-dark-surface border-ivero-purple/30 text-primary-foreground sm:max-w-md">
          {!leadDone ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">
                  Falar com um especialista
                </DialogTitle>
                <DialogDescription className="text-ivero-slate-light">
                  Recebemos seu contato em segundos. Falamos em até 24h.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={handleLeadSubmit}
                className="flex flex-col gap-3 mt-2"
              >
                <input
                  type="text"
                  required
                  maxLength={100}
                  placeholder="Seu nome"
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  className="h-12 rounded-lg bg-ivero-dark border border-ivero-purple/20 px-4 text-sm outline-none focus:border-ivero-purple/50 transition-colors"
                />
                <input
                  type="email"
                  required
                  maxLength={255}
                  placeholder="E-mail corporativo"
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  className="h-12 rounded-lg bg-ivero-dark border border-ivero-purple/20 px-4 text-sm outline-none focus:border-ivero-purple/50 transition-colors"
                />
                <input
                  type="tel"
                  required
                  maxLength={20}
                  placeholder="Telefone com DDD"
                  value={leadPhone}
                  onChange={(e) => setLeadPhone(e.target.value)}
                  className="h-12 rounded-lg bg-ivero-dark border border-ivero-purple/20 px-4 text-sm outline-none focus:border-ivero-purple/50 transition-colors"
                />
                <Button
                  type="submit"
                  variant="hero"
                  size="lg"
                  className="h-12 mt-2"
                  disabled={submittingLead}
                >
                  {submittingLead ? "Enviando..." : "Confirmar contato"}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-300" />
              </div>
              <DialogTitle className="font-display text-2xl mb-2">
                Recebemos seu contato!
              </DialogTitle>
              <p className="text-ivero-slate-light">
                Um especialista Ivero vai te chamar em até 24h com o roadmap de
                execução.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
