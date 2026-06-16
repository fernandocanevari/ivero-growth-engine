import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  Search,
  Map,
  TrendingUp,
  MessageCircle,
  Mail,
  CheckCircle2,
} from "lucide-react";
import { useBrandProfile, BrandProfileAnswers } from "@/hooks/useBrandProfile";
import { useUserRole } from "@/hooks/useUserRole";

type Status = "loading" | "active" | "pending";

interface StepDef {
  label: string;
  question: string;
  placeholder: string;
  options: { value: string; text: string }[];
}

const STEPS: StepDef[] = [
  {
    label: "1 de 3 · PERCEPÇÃO",
    question: "Como sua marca é percebida hoje no mercado digital?",
    placeholder: "Quer detalhar? (opcional — mas nos ajuda muito)",
    options: [
      { value: "A", text: "Somos praticamente invisíveis no digital" },
      { value: "B", text: "Temos presença, mas sem autoridade reconhecida" },
      { value: "C", text: "Somos conhecidos, mas as IAs não nos mencionam" },
      { value: "D", text: "Já temos boa presença e queremos escalar nas IAs" },
    ],
  },
  {
    label: "2 de 3 · AMBIÇÃO",
    question:
      "Se um cliente pesquisar sobre seu segmento em uma IA, como você gostaria que sua marca fosse mencionada?",
    placeholder: "Descreva o cenário ideal para sua marca nas IAs... (opcional)",
    options: [
      { value: "A", text: "Como uma das opções do mercado" },
      { value: "B", text: "Como referência confiável e recomendada" },
      { value: "C", text: "Como líder e autoridade do segmento" },
      { value: "D", text: "Como a primeira e principal recomendação" },
    ],
  },
  {
    label: "3 de 3 · RISCO",
    question:
      "Qual é o maior risco que sua marca enfrenta hoje em relação à visibilidade digital?",
    placeholder: "Algum contexto adicional sobre esse risco? (opcional)",
    options: [
      { value: "A", text: "Dependemos demais de tráfego pago" },
      { value: "B", text: "Nossos concorrentes dominam as conversas nas IAs" },
      { value: "C", text: "Não sabemos como as IAs nos percebem" },
      { value: "D", text: "Nossa autoridade digital está caindo" },
    ],
  },
];

function BrandProfileInline({
  userId,
  onCompleted,
}: {
  userId: string;
  onCompleted: () => void;
}) {
  const { save } = useBrandProfile();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>(["", "", ""]);
  const [details, setDetails] = useState<string[]>(["", "", ""]);
  const [siteUrl, setSiteUrl] = useState("");
  const [savingSite, setSavingSite] = useState(false);

  const current = STEPS[step];
  const selected = answers[step];

  const setAnswer = (v: string) =>
    setAnswers((prev) => prev.map((a, i) => (i === step ? v : a)));
  const setDetail = (v: string) =>
    setDetails((prev) => prev.map((a, i) => (i === step ? v.slice(0, 300) : a)));

  const handleNext = async () => {
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    if (!siteUrl.trim()) return;
    setSavingSite(true);
    try {
      const payload: BrandProfileAnswers = {
        question_1: `${answers[0]}`,
        question_2: `${answers[1]}`,
        question_3: `${answers[2]}`,
        detail_1: details[0],
        detail_2: details[1],
        detail_3: details[2],
      };
      await save.mutateAsync(payload);
      await supabase
        .from("profiles")
        .update({ site_url: siteUrl.trim() } as never)
        .eq("user_id", userId);
      onCompleted();
    } finally {
      setSavingSite(false);
    }
  };

  const isLast = step === 2;
  const canAdvance = isLast ? !!selected && !!siteUrl.trim() : !!selected;

  return (
    <div className="w-full max-w-2xl mx-auto bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-ivero-purple/10 overflow-hidden">
      <div className="px-7 pt-7 pb-4 border-b border-[#F0F0F4]">
        <div className="mb-2">
          <h2 className="text-[22px] font-display font-semibold text-[#1A1A2E] leading-tight">
            Antes de começar, 3 perguntas rápidas
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Vamos personalizar sua experiência para a realidade da sua marca.
        </p>
        <div className="flex gap-2 mt-5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-[#6C5CE7]" : "bg-[#E5E5E5]"
              }`}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.18 }}
          className="px-7 py-6"
        >
          <div className="text-[11px] font-semibold tracking-wider text-[#6C5CE7] mb-2">
            {current.label}
          </div>
          <h3 className="text-base font-medium text-[#1A1A2E] mb-5">
            {current.question}
          </h3>
          <div className="space-y-2.5">
            {current.options.map((opt) => {
              const isSelected = selected === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAnswer(opt.value)}
                  className={`w-full flex items-start gap-3 text-left rounded-[10px] border px-4 py-3.5 transition-all duration-150 ${
                    isSelected
                      ? "border-[#6C5CE7] bg-[#F5F3FF] shadow-sm"
                      : "border-[#E5E5E5] bg-white hover:border-[#c9c9d4] hover:shadow-sm"
                  }`}
                >
                  <span
                    className={`mt-0.5 inline-flex w-5 h-5 rounded-full border-2 items-center justify-center flex-shrink-0 transition ${
                      isSelected ? "border-[#6C5CE7]" : "border-[#C9C9D4]"
                    }`}
                  >
                    {isSelected && (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#6C5CE7]" />
                    )}
                  </span>
                  <span className="text-sm font-normal text-[#1A1A2E]">
                    {opt.text}
                  </span>
                </button>
              );
            })}
          </div>

          {selected && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.18 }}
              className="mt-4"
            >
              <Textarea
                value={details[step]}
                onChange={(e) => setDetail(e.target.value)}
                placeholder={current.placeholder}
                rows={2}
                maxLength={300}
                className="resize-none text-sm"
              />
              <div className="text-[11px] text-muted-foreground text-right mt-1">
                {details[step].length}/300
              </div>
            </motion.div>
          )}

          {isLast && selected && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-6 pt-5 border-t border-[#F0F0F4]"
            >
              <label className="block text-sm font-medium text-[#1A1A2E] mb-2">
                Qual é o site da sua marca?
              </label>
              <Input
                type="text"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="ex: minhamarca.com.br"
                className="text-sm"
              />
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Usaremos esse endereço para iniciar seu diagnóstico.
              </p>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="px-7 pb-6 pt-2 flex items-center justify-between">
        {step > 0 ? (
          <button
            onClick={() => setStep(step - 1)}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <ArrowLeft size={14} /> Voltar
          </button>
        ) : (
          <span />
        )}
        <Button
          onClick={handleNext}
          disabled={!canAdvance || save.isPending || savingSite}
          className="bg-[#6C5CE7] hover:bg-[#5b4ddb] text-white disabled:opacity-40"
        >
          {isLast ? "Concluir" : "Próxima"} <ArrowRight className="ml-1" size={16} />
        </Button>
      </div>
    </div>
  );
}

const BemVindoPage = () => {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const [status, setStatus] = useState<Status>("loading");
  const [userId, setUserId] = useState<string | null>(null);
  const [profileCompleted, setProfileCompleted] = useState<boolean | null>(null);
  const [hasDiagnosis, setHasDiagnosis] = useState<boolean>(false);

  // Preserve existing subscription polling logic
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 10; // 10 * 3s = 30s

    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setUserId(user.id);

      // Check brand profile completion + diagnosis history in parallel
      const [{ data: onb }, { data: hist }] = await Promise.all([
        supabase
          .from("client_onboarding")
          .select("completed")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("analysis_history")
          .select("id")
          .eq("user_id", user.id)
          .limit(1),
      ]);
      if (!cancelled) {
        setProfileCompleted(!!onb?.completed);
        setHasDiagnosis(!!(hist && hist.length > 0));
      }

      const poll = async () => {
        if (cancelled) return;
        const { data } = await supabase
          .from("assinaturas")
          .select("status")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data?.status === "ativo" || data?.status === "trial") {
          if (!cancelled) setStatus("active");
          return;
        }

        attempts++;
        if (attempts >= maxAttempts) {
          if (!cancelled) setStatus("pending");
          return;
        }
        setTimeout(poll, 3000);
      };

      poll();
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const showCTA = profileCompleted === true;
  const ctaLabel = hasDiagnosis ? "Ver meu diagnóstico →" : "Iniciar meu diagnóstico agora →";
  const ctaSubtext = hasDiagnosis
    ? "Você já tem um diagnóstico gerado"
    : "Leva menos de 2 minutos";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8F5FF] via-white to-[#FBF7FF] relative overflow-hidden">
      {/* Brand glows */}
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
                Confirmando seu pagamento...
              </h2>
              <p className="text-muted-foreground">Isso pode levar alguns segundos.</p>
            </motion.div>
          </div>
        )}

        {status === "pending" && (
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
              <Button
                variant="outline"
                size="lg"
                className="text-base px-8 py-5 h-auto rounded-full border-ivero-purple/30 text-ivero-purple hover:bg-ivero-purple/5 hover:text-ivero-purple"
                onClick={() => navigate(isAdmin ? "/admin" : "/dashboard")}
              >
                {isAdmin ? "Ir para o Painel Administrativo" : "Ir Para o Dashboard"}
              </Button>
            </motion.div>
          </div>
        )}

        {status === "active" && userId && (
          <div className="max-w-4xl mx-auto space-y-16 sm:space-y-20">
            {/* SECTION 1 — Celebration header */}
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
            </motion.section>

            {/* SECTION 2 — Brand profile (mandatory) */}
            {profileCompleted === false && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                id="brand-profile"
              >
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-center text-[#1A1A2E] mb-2">
                  Antes de começar, 3 perguntas rápidas
                </h2>
                <p className="text-center text-muted-foreground mb-8 max-w-xl mx-auto">
                  Para personalizarmos sua experiência desde o primeiro minuto.
                </p>
                <BrandProfileInline
                  userId={userId}
                  onCompleted={() => setProfileCompleted(true)}
                />
              </motion.section>
            )}

            {/* SECTION 3 — Journey */}
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

            {/* SECTION 4 — Social proof */}
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

            {/* SECTION 5 — Priority support */}
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

            {/* SECTION 6 — CTA (only after profile complete) */}
            {showCTA && (
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
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BemVindoPage;
