import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, CircleCheck, ArrowRight, ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useBrandProfile, BrandProfileAnswers } from "@/hooks/useBrandProfile";
import { useNavigate } from "react-router-dom";

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

export default function BrandProfileModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { save, skip } = useBrandProfile();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [answers, setAnswers] = useState<string[]>(["", "", ""]);
  const [details, setDetails] = useState<string[]>(["", "", ""]);

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
    const payload: BrandProfileAnswers = {
      question_1: `${answers[0]}`,
      question_2: `${answers[1]}`,
      question_3: `${answers[2]}`,
      detail_1: details[0],
      detail_2: details[1],
      detail_3: details[2],
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
              Perfil da marca salvo!
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
            {/* Header */}
            <div className="px-7 pt-7 pb-4 border-b border-[#F0F0F4] relative">
              <button
                onClick={handleSkip}
                aria-label="Fechar"
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition"
              >
                <X size={18} />
              </button>
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="text-[#6C5CE7]" size={28} strokeWidth={1.75} />
                <h2 className="text-[22px] font-medium text-[#1A1A2E] leading-tight">
                  Vamos personalizar sua experiência
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">
                3 perguntas rápidas para adaptar as recomendações da Ivero à realidade
                da sua marca. Leva menos de 1 minuto.
              </p>
              {/* Progress segments */}
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

            {/* Body */}
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
              </motion.div>
            </AnimatePresence>

            {/* Footer */}
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
