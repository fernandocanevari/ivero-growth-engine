import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type Status = "loading" | "active" | "pending";

const BemVindoPage = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 10; // 10 * 3s = 30s

    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const poll = async () => {
        if (cancelled) return;
        const { data } = await supabase
          .from("assinaturas")
          .select("status")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data?.status === "ativo") {
          if (!cancelled) setStatus("active");
          return;
        }

        attempts++;
        if (attempts >= maxAttempts) {
          if (!cancelled) setStatus("pending");
          return;
        }
        setTimeout(poll, 3000);
      };

      poll();
    };

    check();
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface-0 via-surface-2 to-surface-0 relative overflow-hidden flex flex-col">
      {/* Subtle background glows matching hero */}
      <div className="absolute bottom-0 right-0 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] rounded-full bg-ivero-purple opacity-[0.06] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-50px] w-[280px] sm:w-[400px] h-[280px] sm:h-[400px] rounded-full bg-accent opacity-[0.05] blur-[100px] pointer-events-none" />


      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 relative z-10">
        <div className="w-full max-w-2xl text-center">

          {status === "loading" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center"
            >
              <Loader2 className="h-12 w-12 text-accent animate-spin mb-5" />
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">
                Confirmando seu pagamento...
              </h2>
              <p className="text-muted-foreground">Isso pode levar alguns segundos.</p>
            </motion.div>
          )}

          {status === "active" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              {/* Celebration emoji */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
                className="text-6xl sm:text-7xl mb-6"
              >
                🎉
              </motion.div>

              {/* Headline */}
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold mb-3 leading-tight">
                <span className="text-foreground">Parabéns, bem-vindo </span>
                <br className="hidden sm:block" />
                <span className="text-accent">à Ivero!</span>
              </h1>

              {/* Subheadline */}
              <p className="text-base sm:text-lg md:text-xl text-ivero-purple font-medium max-w-xl mx-auto mb-10 leading-relaxed">
                E Juntos vamos trazer um retorno real de marketing para o seu negócio e aumentaremos a visibilidade da sua marca
              </p>

              {/* CTA */}
              <Button
                variant="hero"
                size="lg"
                className="text-lg sm:text-xl px-8 sm:px-10 py-5 sm:py-6 h-auto rounded-full"
                onClick={() => navigate("/dashboard")}
              >
                Acessar meu dashboard →
              </Button>
            </motion.div>
          )}

          {status === "pending" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-5xl sm:text-6xl mb-6">⏳</div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Pagamento em processamento
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-lg mx-auto leading-relaxed">
                Seu pagamento está sendo confirmado. Assim que confirmado, seu acesso será liberado automaticamente. Você receberá um e-mail de confirmação.
              </p>
              <Button
                variant="outline"
                size="lg"
                className="text-base px-8 py-5 h-auto rounded-full border-ivero-purple/30 text-ivero-purple hover:bg-ivero-purple/5 hover:text-ivero-purple"
                onClick={() => navigate("/dashboard")}
              >
                Ir Para o Dashboard
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BemVindoPage;
