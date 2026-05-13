import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useOnboarding } from "@/hooks/useOnboarding";

const questions = [
  {
    step: 1,
    label: "Percepção",
    question: "Hoje, como você acredita que sua marca é percebida no mercado?",
    placeholder: "Conte como você enxerga o posicionamento atual da sua marca — pontos fortes, fragilidades, como o mercado te vê...",
  },
  {
    step: 2,
    label: "Ambição",
    question: "Se um potencial cliente perguntasse a uma IA sobre o seu segmento, como você gostaria que sua empresa fosse mencionada?",
    placeholder: "Descreva o cenário ideal: que atributos, diferenciais e autoridade você quer que a IA associe à sua marca...",
  },
  {
    step: 3,
    label: "Risco",
    question: "Qual é o principal risco que você sente hoje em relação à visibilidade ou posicionamento da sua marca?",
    placeholder: "Ex: Estamos invisíveis, dependemos demais de tráfego pago, concorrentes dominam a conversa, não comunicamos nossa autoridade...",
  },
];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};

export default function OnboardingWizard({ onComplete, onDismiss }: { onComplete: () => void; onDismiss?: () => void }) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [answers, setAnswers] = useState(["", "", ""]);
  const [touched, setTouched] = useState<boolean[]>([false, false, false]);
  const { saveAnswers } = useOnboarding();

  const current = questions[step];
  const isLast = step === questions.length - 1;
  const trimmedLen = answers[step].trim().length;
  const minChars = 20;
  const canProceed = trimmedLen >= minChars;
  const showError = touched[step] && !canProceed;
  const errorMessage =
    trimmedLen === 0
      ? "Esta resposta é obrigatória para continuar."
      : `Conte um pouco mais — escreva pelo menos ${minChars} caracteres (faltam ${minChars - trimmedLen}).`;

  const goNext = () => {
    if (!canProceed) {
      setTouched((t) => {
        const next = [...t];
        next[step] = true;
        return next;
      });
      return;
    }
    if (isLast) {
      saveAnswers.mutate(
        { question_1: answers[0], question_2: answers[1], question_3: answers[2] },
        { onSuccess: onComplete }
      );
      return;
    }
    setDir(1);
    setStep((s) => s + 1);
  };

  const goBack = () => {
    setDir(-1);
    setStep((s) => s - 1);
  };

  const updateAnswer = (value: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[step] = value;
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold text-primary">Diagnóstico Ivero</span>
          </div>
          <p className="text-xs text-muted-foreground">
            3 perguntas para entender sua marca e recomendar as melhores estratégias.
          </p>

          {/* Progress */}
          <div className="flex gap-2 mt-5">
            {questions.map((q, i) => (
              <div key={i} className="flex-1 flex flex-col items-start gap-1">
                <div
                  className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                    i < step ? "bg-primary" : i === step ? "bg-primary/60" : "bg-secondary"
                  }`}
                />
                <span className={`text-[10px] font-medium ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>
                  {q.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Question area */}
        <div className="px-8 py-6 min-h-[280px] flex flex-col">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="flex-1 flex flex-col"
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary text-sm font-bold">
                  {current.step}
                </span>
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  {current.label}
                </span>
              </div>

              <h2 className="text-lg font-semibold text-foreground leading-snug mb-4">
                {current.question}
              </h2>

              <Textarea
                value={answers[step]}
                onChange={(e) => updateAnswer(e.target.value)}
                onBlur={() =>
                  setTouched((t) => {
                    const next = [...t];
                    next[step] = true;
                    return next;
                  })
                }
                placeholder={current.placeholder}
                aria-invalid={showError}
                aria-describedby={showError ? `onboarding-error-${step}` : undefined}
                className={`flex-1 min-h-[120px] resize-none text-sm ${
                  showError ? "border-destructive focus-visible:ring-destructive" : ""
                }`}
                maxLength={1000}
              />
              <div className="flex items-center justify-between mt-1">
                {showError ? (
                  <p
                    id={`onboarding-error-${step}`}
                    role="alert"
                    className="text-[11px] text-destructive font-medium"
                  >
                    {errorMessage}
                  </p>
                ) : (
                  <span />
                )}
                <p className="text-[10px] text-muted-foreground">
                  {answers[step].length}/1000
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={goBack}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
            )}
            <Button variant="link" size="sm" className="text-muted-foreground" onClick={onDismiss ?? onComplete}>
              Responder mais tarde
            </Button>
          </div>
          <Button
            onClick={goNext}
            disabled={saveAnswers.isPending}
            className="gap-2"
          >
            {saveAnswers.isPending ? (
              "Salvando..."
            ) : isLast ? (
              <>
                Concluir diagnóstico <CheckCircle2 className="h-4 w-4" />
              </>
            ) : (
              <>
                Próxima <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
