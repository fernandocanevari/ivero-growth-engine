import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UpgradeModal } from "./UpgradeModal";

/**
 * TrialBanner — banner discreto no topo do dashboard.
 *
 * Lógica (decisões do produto):
 *  - Janela de 7 dias contada da PRIMEIRA visita ao dashboard (não do signup).
 *    → timestamp persistido em localStorage por usuário (chave inclui userId quando disponível).
 *  - Dismiss volta a aparecer a cada nova sessão (sessionStorage), não persistente.
 *  - CTA abre UpgradeModal com os 4 planos sobre o dashboard (não navega fora).
 *
 * Por que sessionStorage para o dismiss e localStorage para o trial:
 *  - Trial = decisão do produto (7 dias absolutos) → persiste entre sessões.
 *  - Dismiss = preferência momentânea ("não me incomode agora") → reseta na próxima
 *    sessão para manter a pressão de conversão sem ser intrusivo na sessão atual.
 */

const TRIAL_FIRST_VISIT_KEY = "ivero_dashboard_first_visit_at";
const DISMISS_SESSION_KEY = "ivero_trial_banner_dismissed";
const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

interface TrialBannerProps {
  userId: string | null;
}

export function TrialBanner({ userId }: TrialBannerProps) {
  const [visible, setVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    // Wait until we know who the user is. If no user, do nothing.
    if (!userId) return;

    // Per-user keys so different users on the same machine don't share state.
    const visitKey = `${TRIAL_FIRST_VISIT_KEY}:${userId}`;
    const dismissKey = `${DISMISS_SESSION_KEY}:${userId}`;

    // Already dismissed in this session? Don't show.
    if (sessionStorage.getItem(dismissKey) === "1") {
      return;
    }

    // Get or set "first visit" timestamp.
    let firstVisit = Number(localStorage.getItem(visitKey) || 0);
    if (!firstVisit) {
      firstVisit = Date.now();
      localStorage.setItem(visitKey, String(firstVisit));
    }

    const elapsed = Date.now() - firstVisit;
    const remaining = TRIAL_DURATION_MS - elapsed;

    if (remaining > 0) {
      // Round up so "less than 24h left" still shows "1 day".
      const days = Math.max(1, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
      setDaysLeft(days);
      setVisible(true);
    }
  }, [userId]);

  const handleDismiss = () => {
    if (userId) {
      sessionStorage.setItem(`${DISMISS_SESSION_KEY}:${userId}`, "1");
    }
    setVisible(false);
  };

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden border-b border-primary/15 bg-gradient-to-r from-primary/[0.06] via-primary/[0.04] to-transparent"
          >
            <div className="flex items-center gap-3 px-4 sm:px-6 py-2.5">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-foreground leading-tight">
                  <span className="font-semibold">Você está no plano gratuito</span>
                  <span className="text-muted-foreground hidden sm:inline">
                    {" "}— desbloqueie monitoramento contínuo das IAs que falam da sua marca.
                  </span>
                  {daysLeft !== null && (
                    <span className="ml-2 text-[10px] sm:text-xs font-medium text-primary/80 hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10">
                      {daysLeft} {daysLeft === 1 ? "dia restante" : "dias restantes"}
                    </span>
                  )}
                </p>
              </div>

              <Button
                size="sm"
                variant="default"
                onClick={() => setModalOpen(true)}
                className="text-xs h-7 px-3 shrink-0"
              >
                Ver planos
              </Button>

              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Dispensar aviso"
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted/60 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <UpgradeModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}

export default TrialBanner;
