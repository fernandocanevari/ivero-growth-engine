import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Trophy, CheckCircle2 } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-ivero-dark via-ivero-dark to-black flex items-center justify-center px-4">
      <div className="w-full max-w-2xl text-center">
        <div className="mb-10">
          <span className="font-display text-3xl font-bold text-white tracking-tight">Ivero</span>
        </div>

        {status === "loading" && (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12">
            <Loader2 className="h-16 w-16 text-ivero-magenta animate-spin mx-auto mb-6" />
            <p className="text-xl text-white font-medium">Confirmando seu pagamento...</p>
            <p className="text-sm text-white/60 mt-2">Isso pode levar alguns segundos.</p>
          </div>
        )}

        {status === "active" && (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-10 md:p-12">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-ivero-magenta/30 blur-3xl rounded-full" />
                <Trophy className="h-24 w-24 text-ivero-magenta relative" strokeWidth={1.5} />
              </div>
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
              Parabéns pela decisão!
            </h1>
            <p className="text-lg text-white/80 mb-6 leading-relaxed">
              Juntos vamos fazer sua marca ser mencionada pelas IAs e trazer um retorno real de marketing para o seu negócio.
            </p>
            <p className="text-base text-white/60 mb-8">
              Seu acesso ao plano está liberado. Estamos prontos para aumentar a visibilidade da sua marca.
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/dashboard")}
              className="bg-ivero-magenta hover:bg-ivero-magenta/90 text-white px-8 py-6 text-lg font-semibold rounded-full"
            >
              Acessar meu dashboard
            </Button>
          </div>
        )}

        {status === "pending" && (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-10 md:p-12">
            <div className="flex justify-center mb-6">
              <CheckCircle2 className="h-20 w-20 text-white/70" strokeWidth={1.5} />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
              Pagamento em processamento
            </h1>
            <p className="text-base text-white/70 mb-8 leading-relaxed">
              Seu pagamento está sendo confirmado. Assim que confirmado, seu acesso será liberado automaticamente. Você receberá um e-mail de confirmação.
            </p>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="border-white/20 text-white hover:bg-white/10 px-8 py-6 text-lg font-semibold rounded-full"
            >
              Ir para o dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BemVindoPage;
