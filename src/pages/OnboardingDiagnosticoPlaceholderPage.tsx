import { useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useOnboardingResponses } from "@/hooks/useOnboardingResponses";
import { getOpeningPhrase } from "@/lib/onboarding-recommendation";
import { supabase } from "@/integrations/supabase/client";

/**
 * Diagnóstico personalizado pós-onboarding.
 * Exibe a frase de abertura baseada em p3_maior_risco e conduz o
 * cliente ao dashboard, onde ele encontra o card "Comece por aqui".
 */
export default function OnboardingDiagnosticoPlaceholderPage() {
  const navigate = useNavigate();
  const { data: responses, isLoading } = useOnboardingResponses();

  // Fallback: se por algum motivo não achamos as respostas (usuário
  // acessou direto sem passar pelas perguntas), redireciona pro dashboard.
  useEffect(() => {
    if (!isLoading && !responses) {
      navigate("/dashboard", { replace: true });
    }
  }, [isLoading, responses, navigate]);

  // Belt-and-suspenders: zera is_first_login ao chegar aqui, já que o
  // onboarding real foi concluído. Evita que qualquer código legado
  // ainda leia essa flag e reencaminhe pro /bem-vindo.
  useEffect(() => {
    if (isLoading || !responses) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("profiles")
        .update({ is_first_login: false } as never)
        .eq("user_id", user.id);
    })();
  }, [isLoading, responses]);

  if (isLoading || !responses) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F8F5FF] via-white to-[#FBF7FF] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#6C5CE7]" />
      </div>
    );
  }

  const phrase =
    getOpeningPhrase(responses.p3_maior_risco) ??
    "Vamos mapear como as IAs estão falando sobre você.";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8F5FF] via-white to-[#FBF7FF] px-4 py-16 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full text-center"
      >
        <p className="font-display text-3xl md:text-5xl font-bold text-[#6C5CE7] tracking-tight mb-6">
          Seu diagnóstico personalizado
        </p>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-[#1A1A2E] leading-tight mb-6">
          {phrase}
        </h1>
        <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
          Preparamos um painel com a leitura da sua presença nas IAs e uma
          recomendação personalizada de por onde começar.
        </p>
        <Button
          size="lg"
          onClick={() => navigate("/dashboard")}
          className="bg-[#6C5CE7] hover:bg-[#5b4ddb] text-white"
        >
          Ir para meu dashboard <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </motion.div>
    </div>
  );
}
