import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { WELCOME_FEATURES } from "@/lib/welcome-features";
import { FeatureHighlightCard } from "@/components/welcome/FeatureHighlightCard";

export default function WelcomePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const finishOnboarding = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from("profiles")
          .update({ is_first_login: false })
          .eq("user_id", user.id);
        if (error) console.warn("[WelcomePage] failed to update is_first_login:", error);
      }
    } catch (err) {
      console.warn("[WelcomePage] unexpected error:", err);
      toast({
        title: "Aviso",
        description: "Não conseguimos salvar o estado de boas-vindas, mas você pode continuar.",
      });
    } finally {
      navigate("/dashboard", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <header className="border-b border-border">
        <div className="max-w-[1040px] mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-display font-bold text-gradient">Ivero</span>
          <button
            onClick={finishOnboarding}
            disabled={loading}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Pular
          </button>
        </div>
      </header>

      <main className="max-w-[1040px] mx-auto px-6 py-12 md:py-16 space-y-12">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex flex-col md:flex-row gap-6 md:gap-8 md:items-start"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shrink-0 shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.5)]">
            <Sparkles className="w-8 h-8 text-primary-foreground" strokeWidth={2} />
          </div>
          <div className="space-y-4">
            <h1 className="text-[28px] font-medium font-display text-foreground leading-tight">
              Bem-vindo à Ivero
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed max-w-[520px]">
              A Ivero analisa o que as principais IAs dizem sobre sua marca — como ChatGPT, Gemini,
              Claude, Perplexity e outras. Vamos mostrar como usar a plataforma para maximizar sua
              presença algorítmica.
            </p>
            <p className="text-base text-muted-foreground leading-relaxed max-w-[520px]">
              Nas próximas etapas, você aprenderá como gerar seu primeiro diagnóstico, interpretar
              seu Score GEO, configurar o monitoramento contínuo e criar planos de ação para sua
              marca.
            </p>
          </div>
        </motion.section>

        {/* Feature grid 2x3 */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {WELCOME_FEATURES.map((f, i) => (
            <FeatureHighlightCard key={f.id} feature={f} index={i} />
          ))}
        </section>

        {/* Bottom CTA */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="flex flex-col items-start gap-3"
        >
          <Button
            onClick={finishOnboarding}
            disabled={loading}
            className="h-11 px-6 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium"
          >
            Começar agora
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
          <p className="text-[13px] text-muted-foreground">
            Você pode explorar cada funcionalidade no menu lateral a qualquer momento.
          </p>
        </motion.section>
      </main>
    </div>
  );
}
