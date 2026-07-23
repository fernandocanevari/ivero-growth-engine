import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CircleCheck, ArrowRight, ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBrandProfile, BrandProfileAnswers } from "@/hooks/useBrandProfile";
import { useNavigate } from "react-router-dom";

/**
 * BrandProfileModal — "atualizar minhas respostas".
 *
 * Lê/escreve em onboarding_responses (mesma tabela do fluxo real de onboarding
 * em /onboarding/perguntas). Perguntas e valores são idênticos ao onboarding
 * canônico — nunca mais um terceiro conjunto divergente.
 *
 * DEPRECATED: versão anterior escrevia em client_onboarding com detail_1/2/3
 * opcionais. Ambos foram removidos.
 */

type Column = "p1_maturidade_ia" | "p2_criterio_mercado" | "p3_maior_risco";

interface StepDef {
  label: string;
  question: string;
  column: Column;
  options: { value: string; text: string }[];
}

const STEPS: StepDef[] = [
  {
    label: "1 de 3 · PERCEPÇÃO",
    column: "p1_maturidade_ia",
    question:
      "Hoje, quando alguém busca seu tipo de produto/serviço numa IA como o ChatGPT, você acha que sua marca aparece?",
    options: [
      { value: "nem_aparecemos", text: "Sinceramente, acho que nem aparecemos" },
      { value: "nao_sei_dizer", text: "Talvez apareça, mas não sei dizer com certeza" },
      { value: "aparecemos_sem_referencia", text: "Acho que aparecemos, mas não como referência" },
      { value: "aparecemos_com_destaque", text: "Acredito que sim, e com destaque" },
    ],
  },
  {
    label: "2 de 3 · CRITÉRIO",
    column: "p2_criterio_mercado",
    question:
      "No seu setor, o que normalmente faz uma marca ser vista como referência pelas pessoas?",
    options: [
      { value: "preco_custo", text: "Preço e custo-benefício" },
      { value: "confianca_reputacao", text: "Confiança e reputação construída com o tempo" },
      { value: "qualidade_tecnica", text: "Qualidade técnica comprovada" },
      { value: "indicacao_social", text: "Indicação de quem já comprou" },
    ],
  },
  {
    label: "3 de 3 · RISCO",
    column: "p3_maior_risco",
    question:
      "Se você não souber como a IA está falando da sua marca agora, qual desses cenários te preocupa mais?",
    options: [
      { value: "concorrente_ocupa_espaco", text: "Meus concorrentes aparecerem no meu lugar" },
      { value: "informacao_errada", text: "A IA falar de mim com informação errada ou desatualizada" },
      { value: "nao_mencionado", text: "Simplesmente não ser mencionado, como se eu não existisse" },
      { value: "perde_cliente_sem_saber", text: "Perder clientes sem nunca entender por quê" },
    ],
  },
];

export default function BrandProfileModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { data, save, skip } = useBrandProfile();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [answers, setAnswers] = useState<string[]>(["", "", ""]);

  // Pré-preenche com as respostas atuais da onboarding_responses (se existirem).
  useEffect(() => {
    if (!data) return;
    setAnswers([
      data.p1_maturidade_ia || "",
      data.p2_criterio_mercado || "",
      data.p3_maior_risco || "",
    ]);
  }, [data]);

  const current = STEPS[step];
  const selected = answers[step];

  const setAnswer = (v: string) =>
    setAnswers((prev) => prev.map((a, i) => (i === step ? v : a)));

  const handleNext = async () => {
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    const payload: BrandProfileAnswers = {
      p1_maturidade_ia: answers[0],
      p2_criterio_mercado: answers[1],
      p3_maior_risco: answers[2],
    };
    await save.mutateAsync(payload);
    setDone(true);
  };

  const handleSkip = async () => {
    await skip.mutateAsync();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        {done ? (
          <div className="p-10 text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
              <CircleCheck className="text-emerald-600" size={48} strokeWidth={1.5} />
            </div>
            <h2 className="text-[22px] font-medium text-[#1A1A2E] mb-2">
              Respostas atualizadas!
            </h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Usaremos essas informações para personalizar suas recomendações e tornar
              sua consultoria ainda mais precisa.
            </p>
            <Button
              onClick={() => {
                onClose();
                navigate("/dashboard");
              }}
              className="bg-[#6C5CE7] hover:bg-[#5b4ddb] text-white"
            >
              Ver meu Dashboard <ArrowRight className="ml-1" size={16} />
            </Button>
          </div>
        ) : (
          <>
            <div className="px-7 pt-7 pb-4 border-b border-[#F0F0F4] relative">
              <button
                onClick={handleSkip}
                aria-label="Fechar"
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition"
              >
                <X size={18} />
              </button>
              <div className="mb-2">
                <h2 className="text-[22px] font-medium text-[#1A1A2E] leading-tight">
                  Atualize as respostas do seu perfil
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">
                As mesmas 3 perguntas do onboarding — revise sempre que sua marca evoluir.
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
              </motion.div>
            </AnimatePresence>

            <div className="px-7 pb-6 pt-2 flex items-center justify-between">
              <div className="flex items-center gap-4">
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
              </div>
              <Button
                onClick={handleNext}
                disabled={!selected || save.isPending}
                className="bg-[#6C5CE7] hover:bg-[#5b4ddb] text-white disabled:opacity-40"
              >
                {step === 2 ? "Concluir" : "Próxima"} <ArrowRight className="ml-1" size={16} />
              </Button>
            </div>
            <div className="px-7 pb-5 text-center">
              <button
                onClick={handleSkip}
                className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
              >
                Responder depois
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
