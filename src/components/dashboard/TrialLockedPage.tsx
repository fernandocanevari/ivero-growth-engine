import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, ArrowRight, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UpgradeModal } from "./UpgradeModal";
import { type PlanoTier, tierLabel } from "@/lib/access-control";

interface TrialLockedPageProps {
  title: string;
  description: string;
  /**
   * Quando definido, a tela passa a comunicar "feature exige plano X ou superior"
   * em vez do bloqueio genérico do trial.
   */
  requiredTier?: PlanoTier;
}

const TRIAL_AVAILABLE = [
  "Dashboard",
  "Diagnóstico IA",
  "Score GEO",
  "Configurações",
  "Assinatura",
];

/**
 * TrialLockedPage — tela "premium locked" exibida quando um usuário em trial
 * acessa uma rota bloqueada. Foco em conversão, não em frustração:
 *  - Explica o valor do recurso (não só o bloqueio)
 *  - Lista o que JÁ está liberado no trial (reforço positivo)
 *  - CTA primário abre UpgradeModal mantendo o usuário no contexto
 */
export function TrialLockedPage({ title, description, requiredTier }: TrialLockedPageProps) {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const tierName = requiredTier ? tierLabel(requiredTier) : null;
  const badgeLabel = tierName ? `Disponível no plano ${tierName}` : "Recurso premium";
  const ctaLabel = tierName ? `Fazer upgrade para ${tierName}` : "Ver planos";


  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="max-w-2xl mx-auto pt-8 sm:pt-16"
      >
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {/* Hero do bloqueio */}
          <div className="relative px-6 sm:px-10 pt-10 pb-8 border-b border-border bg-gradient-to-br from-primary/[0.04] via-background to-background">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-5"
            >
              <Lock className="w-6 h-6 text-primary" />
            </motion.div>

            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full mb-3">
              <Sparkles className="w-3 h-3" />
              Recurso premium
            </span>

            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-tight">
              {title}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-2 leading-relaxed">
              {description}
            </p>
          </div>

          {/* Corpo */}
          <div className="px-6 sm:px-10 py-7 space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Disponível no seu trial agora
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TRIAL_AVAILABLE.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm text-foreground/80"
                  >
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-4">
              <p className="text-sm text-foreground leading-relaxed">
                <span className="font-semibold">Faça upgrade</span> para liberar{" "}
                <span className="font-semibold">{title}</span> e todos os outros
                recursos avançados de monitoramento, ação e inteligência
                competitiva.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <Button
                size="lg"
                className="w-full sm:flex-1"
                onClick={() => setModalOpen(true)}
              >
                Ver planos
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => navigate("/dashboard")}
              >
                Voltar ao Dashboard
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      <UpgradeModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}

export default TrialLockedPage;
