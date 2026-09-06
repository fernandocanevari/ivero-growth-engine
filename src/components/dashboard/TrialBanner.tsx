import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UpgradeModal } from "./UpgradeModal";
import {
  isTrialExpired,
  isTrialEndingSoon,
  trialDaysLeft,
  trialHoursLeft,
} from "@/lib/subscription-status";

/**
 * TrialBanner — estado real do trial, derivado de `assinaturas.trial_ends_at`.
 *
 * Antes usava localStorage (primeira visita local) e por isso mostrava
 * "7 de 7 dias restantes" pra sempre. Agora há 3 estados:
 *  - trial válido (> 48h): informativo, dispensável na sessão
 *  - últimas 48h: âmbar, urgência, dispensável na sessão
 *  - expirado: vermelho, NÃO dispensável (acesso já revogado no gating)
 */

const DISMISS_SESSION_KEY = "ivero_trial_banner_dismissed";

interface TrialBannerProps {
  userId: string | null;
  plano?: "presenca" | "influencia" | "autoridade" | null;
  /** ISO date de `assinaturas.trial_ends_at`. */
  trialEndsAt?: string | null;
  /** Só mostramos o banner quando a assinatura é (ou era) um trial. */
  isTrial?: boolean;
  isTrialExpired?: boolean;
}

const PLAN_LABEL: Record<string, string> = {
  presenca: "Presença",
  influencia: "Influência",
  autoridade: "Autoridade",
};

export function TrialBanner({
  userId,
  plano,
  trialEndsAt,
  isTrial,
  isTrialExpired: expiredProp,
}: TrialBannerProps) {
  const dismissKey = userId ? `${DISMISS_SESSION_KEY}:${userId}` : null;
  const [dismissed, setDismissed] = useState(() =>
    dismissKey ? sessionStorage.getItem(dismissKey) === "1" : false,
  );
  const [modalOpen, setModalOpen] = useState(false);

  const expired = expiredProp ?? isTrialExpired(trialEndsAt);
  const endingSoon = isTrialEndingSoon(trialEndsAt);
  const daysLeft = trialDaysLeft(trialEndsAt);
  const hoursLeft = trialHoursLeft(trialEndsAt);

  const relevant = expired || (isTrial === true && trialEndsAt != null);
  // Expirado nunca pode ser dispensado.
  const visible = relevant && (expired || !dismissed);

  const handleDismiss = () => {
    if (dismissKey) sessionStorage.setItem(dismissKey, "1");
    setDismissed(true);
  };

  const planLabel = plano ? PLAN_LABEL[plano] ?? "escolhido" : "escolhido";

  const tone = expired
    ? "border-destructive/40 bg-destructive/10"
    : endingSoon
    ? "border-amber-300 bg-amber-50"
    : "border-primary/30 bg-primary/10";

  const iconTone = expired
    ? "bg-destructive/15 text-destructive"
    : endingSoon
    ? "bg-amber-200/60 text-amber-700"
    : "bg-primary/20 text-primary";

  const Icon = expired ? AlertTriangle : endingSoon ? Clock : Sparkles;

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={`overflow-hidden border-b-2 ${tone}`}
          >
            <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-2.5">
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-lg shrink-0 ${iconTone}`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>

              <div className="flex-1 min-w-0">
                {expired ? (
                  <p className="text-xs sm:text-sm text-foreground leading-tight">
                    <span className="font-semibold">Seu teste de 7 dias terminou.</span>{" "}
                    <span className="text-muted-foreground">
                      Assine o plano{" "}
                      <span className="text-foreground font-medium">{planLabel}</span>{" "}
                      para recuperar o acesso completo.
                    </span>
                  </p>
                ) : (
                  <p className="text-xs sm:text-sm text-foreground leading-tight">
                    <span className="font-semibold">Teste grátis por 7 dias</span>
                    {daysLeft !== null && (
                      <span className="ml-2 text-[10px] sm:text-xs font-semibold text-primary inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/15 border border-primary/25">
                        {endingSoon && hoursLeft !== null
                          ? `${Math.max(1, Math.ceil(hoursLeft))}h restantes`
                          : `${daysLeft} de 7 ${daysLeft === 1 ? "dia restante" : "dias restantes"}`}
                      </span>
                    )}
                    <span className="text-muted-foreground hidden md:inline">
                      {" "}— acesso completo aos recursos do plano{" "}
                      <span className="text-foreground font-medium">{planLabel}</span>.
                    </span>
                  </p>
                )}
              </div>

              <Button
                size="sm"
                variant={expired ? "destructive" : "default"}
                onClick={() => setModalOpen(true)}
                className="text-xs h-7 px-3 shrink-0"
              >
                {expired ? "Assinar agora" : endingSoon ? "Assinar agora" : "Ver planos"}
              </Button>

              {!expired && (
                <button
                  type="button"
                  onClick={handleDismiss}
                  aria-label="Dispensar aviso"
                  className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted/60 shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Banner de trial = conversão: sempre checkout real, nunca troca local. */}
      <UpgradeModal open={modalOpen} onOpenChange={setModalOpen} intent="contratar" />
    </>
  );
}

export default TrialBanner;
