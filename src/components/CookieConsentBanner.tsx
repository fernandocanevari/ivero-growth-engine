import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getConsentStatus, setConsent } from "@/lib/analytics";

/**
 * Minimal LGPD/GDPR cookie consent banner.
 *
 * Design choices:
 *  - Bottom-right floating card (not full-width bar) — less intrusive for B2B premium.
 *  - 3 actions: Aceitar / Rejeitar / Saiba mais — clear and symmetric.
 *  - Hidden by default; appears only if no decision has been stored yet.
 *  - Decision persists in localStorage; banner won't reappear on subsequent visits.
 *  - PostHog stays opted-OUT until the user clicks "Aceitar".
 *
 * Why no overlay/blocking modal: B2B users dislike intrusive interruptions on
 * landing pages. A polite floating card respects LGPD without hurting conversion.
 */
export function CookieConsentBanner() {
  // Start hidden; we'll only show after we've read localStorage on mount.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const status = getConsentStatus();
    if (status === "unknown") {
      // Small delay so the banner doesn't compete with the hero entrance animation.
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const handleAccept = () => {
    setConsent("granted");
    setVisible(false);
  };

  const handleReject = () => {
    setConsent("denied");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.98 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          role="dialog"
          aria-live="polite"
          aria-label="Aviso de cookies e privacidade"
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-[60] max-w-md"
        >
          <div className="relative rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-[0_12px_48px_-12px_hsl(var(--foreground)/0.25)] p-5 sm:p-6">
            {/* Close (treats as reject for safety / LGPD: no consent = no tracking) */}
            <button
              type="button"
              onClick={handleReject}
              aria-label="Fechar e recusar cookies"
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted/60"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3 mb-3 pr-6">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
                <Cookie className="w-4.5 h-4.5 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-sm font-bold text-foreground leading-tight">
                  Cookies & privacidade
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Usamos cookies analíticos para entender como você usa a Ivero e melhorar o
                  produto. Nenhum dado é compartilhado com terceiros para publicidade. Em
                  conformidade com a LGPD, você decide.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2 sm:gap-2.5 mt-4">
              <a
                href="/politica-de-cookies"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs h-9 inline-flex items-center justify-center px-2 text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
              >
                Política de cookies
              </a>
              <a
                href="/politica-de-privacidade"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs h-9 inline-flex items-center justify-center px-2 text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
              >
                Privacidade
              </a>
              <Button
                variant="hero"
                size="sm"
                onClick={handleAccept}
                className="text-xs h-9 sm:ml-auto"
              >
                Aceitar cookies
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CookieConsentBanner;
