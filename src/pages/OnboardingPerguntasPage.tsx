import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

type QuestionDef = {
  column: "p1_maturidade_ia" | "p2_criterio_mercado" | "p3_maior_risco";
  text: string;
  subtitle?: string;
  options: { value: string; label: string }[];
};

const QUESTIONS: QuestionDef[] = [
  {
    column: "p1_maturidade_ia",
    text:
      "Hoje, quando alguém busca seu tipo de produto/serviço numa IA como o ChatGPT, você acha que sua marca aparece?",
    options: [
      { value: "nem_aparecemos", label: "Sinceramente, acho que nem aparecemos" },
      { value: "nao_sei_dizer", label: "Talvez apareça, mas não sei dizer com certeza" },
      { value: "aparecemos_sem_referencia", label: "Acho que aparecemos, mas não como referência" },
      { value: "aparecemos_com_destaque", label: "Acredito que sim, e com destaque" },
    ],
  },
  {
    column: "p2_criterio_mercado",
    text: "No seu setor, o que normalmente faz uma marca ser vista como referência pelas pessoas?",
    subtitle: "Não existe resposta errada aqui — é normal não ter certeza absoluta.",
    options: [
      { value: "preco_custo", label: "Preço e custo-benefício" },
      { value: "confianca_reputacao", label: "Confiança e reputação construída com o tempo" },
      { value: "qualidade_tecnica", label: "Qualidade técnica comprovada" },
      { value: "indicacao_social", label: "Indicação de quem já comprou" },
    ],
  },
  {
    column: "p3_maior_risco",
    text:
      "Se você não souber como a IA está falando da sua marca agora, qual desses cenários te preocupa mais?",
    options: [
      { value: "concorrente_ocupa_espaco", label: "Meus concorrentes aparecerem no meu lugar" },
      { value: "informacao_errada", label: "A IA falar de mim com informação errada ou desatualizada" },
      { value: "nao_mencionado", label: "Simplesmente não ser mencionado, como se eu não existisse" },
      { value: "perde_cliente_sem_saber", label: "Perder clientes sem nunca entender por quê" },
    ],
  },
];

export default function OnboardingPerguntasPage() {
  const navigate = useNavigate();
  const [brandId, setBrandId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      let { data: bs } = await supabase
        .from("brand_settings")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!bs) {
        const { data: created, error } = await supabase
          .from("brand_settings")
          .insert({ user_id: user.id } as never)
          .select("id")
          .single();
        if (error) {
          toast({ title: "Erro ao iniciar onboarding", variant: "destructive" });
          return;
        }
        bs = created;
      }
      setBrandId(bs!.id);
      setLoading(false);
    })();
  }, [navigate]);

  const current = QUESTIONS[step];
  const isLast = step === QUESTIONS.length - 1;

  const handleSelect = async (value: string) => {
    const next = { ...answers, [current.column]: value };
    setAnswers(next);
    if (!isLast) {
      setTimeout(() => setStep((s) => s + 1), 180);
      return;
    }
    if (!brandId) return;
    setSaving(true);
    const { error } = await supabase.from("onboarding_responses").insert({
      brand_id: brandId,
      p1_maturidade_ia: next.p1_maturidade_ia,
      p2_criterio_mercado: next.p2_criterio_mercado,
      p3_maior_risco: next.p3_maior_risco,
    } as never);
    setSaving(false);
    if (error) {
      toast({ title: "Não foi possível salvar suas respostas", description: error.message, variant: "destructive" });
      return;
    }
    navigate("/onboarding/site");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#F8F5FF] via-white to-[#FBF7FF]">
        <Loader2 className="h-8 w-8 animate-spin text-ivero-purple" />
      </div>
    );
  }

  const selected = answers[current.column];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8F5FF] via-white to-[#FBF7FF] px-4 sm:px-6 py-10 sm:py-16">
      <div className="max-w-2xl mx-auto">
        {step === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center mb-8"
          >
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A2E] leading-tight mb-3">
              Antes de eu te dar qualquer recomendação, preciso te conhecer melhor.
            </h1>
            <p className="text-base sm:text-lg text-ivero-purple font-medium">
              São só 3 perguntas. Vamos juntos nessa.
            </p>
          </motion.div>
        )}

        <div className="mb-6">
          <div className="flex gap-2 mb-2" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={3}>
            {QUESTIONS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= step ? "bg-[#6C5CE7]" : "bg-[#E5E5E5]"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold tracking-wider text-[#6C5CE7]">
              Pergunta {step + 1} de {QUESTIONS.length}
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
            className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-ivero-purple/10 p-6 sm:p-8"
          >
            <h2 className="text-lg sm:text-xl font-semibold text-[#1A1A2E] leading-snug mb-2">
              {current.text}
            </h2>
            {current.subtitle && (
              <p className="text-sm text-muted-foreground mb-5">{current.subtitle}</p>
            )}

            <div className="space-y-2.5 mt-5">
              {current.options.map((opt) => {
                const isSelected = selected === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    disabled={saving}
                    className={`w-full flex items-start gap-3 text-left rounded-[10px] border px-4 py-3.5 transition-all duration-150 ${
                      isSelected
                        ? "border-[#6C5CE7] bg-[#F5F3FF] shadow-sm"
                        : "border-[#E5E5E5] bg-white hover:border-[#6C5CE7]/50 hover:bg-[#FAF8FF]"
                    } disabled:opacity-60`}
                  >
                    <span
                      className={`mt-0.5 inline-flex w-5 h-5 rounded-full border-2 items-center justify-center flex-shrink-0 ${
                        isSelected ? "border-[#6C5CE7]" : "border-[#C9C9D4]"
                      }`}
                    >
                      {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-[#6C5CE7]" />}
                    </span>
                    <span className="text-sm sm:text-[15px] text-[#1A1A2E]">{opt.label}</span>
                  </button>
                );
              })}
            </div>

          </motion.div>
        </AnimatePresence>

        {step > 0 && (
          <div className="mt-6 flex justify-start">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={saving}
              className="inline-flex items-center gap-2 text-base font-medium text-[#6C5CE7] hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              <span className="text-2xl leading-none" aria-hidden="true">←</span> Voltar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
