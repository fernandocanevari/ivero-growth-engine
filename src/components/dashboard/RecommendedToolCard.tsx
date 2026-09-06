import { useRef } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import {
  useOnboardingResponses,
  useDismissDashboardHint,
} from "@/hooks/useOnboardingResponses";
import { getRecommendedTool } from "@/lib/onboarding-recommendation";

/**
 * Card "Baseado no que você nos contou, comece por aqui" — aparece na
 * primeira tela do dashboard após o onboarding, persiste entre sessões,
 * e desaparece só após o cliente clicar e usar a ferramenta indicada.
 *
 * A ferramenta destacada é calculada por P1×P2 e SEMPRE respeita o
 * gating de plano (isFeatureAvailable) — nunca aponta pra algo travado.
 */
export function RecommendedToolCard() {
  const navigate = useNavigate();
  const { data: responses, isLoading, isFetched } = useOnboardingResponses();
  const { plano, isPaid, isAdmin, isTrial, isLoading: subLoading } =
    useSubscriptionStatus();
  const dismiss = useDismissDashboardHint();
  // A animação de entrada roda uma única vez por sessão de tela.
  const animatedRef = useRef(false);

  // Esconder só na PRIMEIRA carga. Em revalidação (dado já conhecido) o card
  // permanece em tela — era isso que causava a piscada no Painel.
  const firstLoad = (isLoading && !isFetched) || (subLoading && !plano && !isAdmin);
  if (!responses && firstLoad) return null;
  if (!responses) return null;
  if (responses.dashboard_hint_dismissed_at) return null;

  const tool = getRecommendedTool({
    p1: responses.p1_maturidade_ia,
    p2: responses.p2_criterio_mercado,
    plano,
    isPaid,
    isAdmin,
    isTrial,
  });
  if (!tool) return null;

  const handleClick = () => {
    // Marca dismissed ANTES de navegar — o próximo render do dashboard
    // já não mostra o card, mesmo que o cliente volte imediatamente.
    dismiss.mutate(responses.id);
    navigate(tool.path);
  };

  return (
    <motion.div
      initial={animatedRef.current ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      onAnimationComplete={() => {
        animatedRef.current = true;
      }}
    >
      <Card className="border-[#6C5CE7]/30 bg-gradient-to-br from-[#F0EFFE] via-white to-[#FBF7FF] shadow-sm">
        <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#6C5CE7]/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-[#6C5CE7]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#6C5CE7] uppercase tracking-wide">
              Baseado no que você nos contou
            </p>
            <p className="text-base font-semibold text-foreground mt-0.5">
              Comece por aqui: {tool.name}
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
              {tool.description}
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleClick}
            className="bg-[#6C5CE7] hover:bg-[#5b4ddb] text-white shrink-0"
          >
            Abrir agora <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default RecommendedToolCard;
