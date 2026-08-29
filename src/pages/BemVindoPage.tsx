import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Search,
  Map,
  TrendingUp,
  MessageCircle,
  Mail,
  CheckCircle2,
  RefreshCw,

} from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

/**
 * BemVindoPage — reservada ao retorno real do Asaas (?from=asaas).
 *
 * DEPRECATED: A cópia inline das 3 perguntas de onboarding (BrandProfileInline)
 * foi removida neste prompt. O onboarding real vive em /onboarding/perguntas
 * e a revisão de respostas no BrandProfileModal (dashboard). Nunca um terceiro
 * lugar.
 *
 * A tela de "Confirmando pagamento..." só aparece agora quando o usuário chega
 * com ?from=asaas — logins normais nunca caem aqui.
 */

type Status = "loading" | "active" | "pending";

// Com Checkout Session do Asaas, a assinatura só é criada (e o webhook só
// roda) depois que o cliente conclui o pagamento na tela do Asaas — por isso a
// janela de espera é maior: 40 x 3s = 2 minutos.
const MAX_ATTEMPTS = 40;
const POLL_INTERVAL_MS = 3000;

const BemVindoPage = () => {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const [status, setStatus] = useState<Status>("loading");
  const [hasDiagnosis, setHasDiagnosis] = useState<boolean>(false);
  const [recheckToken, setRecheckToken] = useState(0);
  const [checkoutUrl, setCheckoutUrl] = useState<string>("");
  // true = cliente já concluiu o onboarding (ou voltou de um upgrade):
  // mostramos apenas a confirmação de pagamento, sem a jornada de 3 passos.
  const [leanConfirm, setLeanConfirm] = useState(false);

  useEffect(() => {
    try {
      setCheckoutUrl(sessionStorage.getItem("ivero_checkout_url") ?? "");
    } catch {
      setCheckoutUrl("");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const params = new URLSearchParams(window.location.search);
    const fromAsaas = params.get("from") === "asaas";
    const isUpgrade = params.get("tipo") === "upgrade";

    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (roleRow) {
        navigate("/dashboard/admin", { replace: true });
        return;
      }

      // Diagnóstico já rodado?
      const { data: hist } = await supabase
        .from("analysis_history")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);
      if (!cancelled) setHasDiagnosis(!!(hist && hist.length > 0));

      // Onboarding já concluído (ou retorno de upgrade) → confirmação enxuta.
      const { data: brand } = await supabase
        .from("brand_settings")
        .select("onboarding_completed_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) setLeanConfirm(isUpgrade || !!brand?.onboarding_completed_at);

      // Sem ?from=asaas, essa tela não faz sentido — manda direto pro dashboard.
      if (!fromAsaas) {
        if (!cancelled) setStatus("active");
        return;
      }

      const poll = async () => {
        if (cancelled) return;
        const { data } = await supabase
          .from("assinaturas")
          .select("status, asaas_subscription_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Libera quando o status já está vivo OU quando o webhook do Asaas já
        // vinculou a assinatura (asaas_subscription_id preenchido).
        if (
          data?.status === "ativo" ||
          data?.status === "trial" ||
          !!data?.asaas_subscription_id
        ) {
          if (!cancelled) setStatus("active");
          try {
            sessionStorage.removeItem("ivero_checkout_url");
          } catch { /* noop */ }
          return;
        }

        attempts++;

        // Rede de segurança: se após ~15s o webhook ainda não chegou, consulta
        // o Asaas direto (reconcile-asaas) a cada 5 tentativas.
        if (attempts >= 5 && attempts % 5 === 0) {
          try {
            const { data: rec } = await supabase.functions.invoke("reconcile-asaas");
            if (rec?.reconciled) {
              if (!cancelled) setStatus("active");
              try {
                sessionStorage.removeItem("ivero_checkout_url");
              } catch { /* noop */ }
              return;
            }
          } catch (e) {
            console.error("reconcile-asaas falhou:", e);
          }
        }

        if (attempts >= MAX_ATTEMPTS) {
          if (!cancelled) setStatus("pending");
          return;
        }
        setTimeout(poll, POLL_INTERVAL_MS);
      };

      poll();
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [navigate, recheckToken]);

  const handleRecheck = () => {
    setStatus("loading");
    setRecheckToken((t) => t + 1);
  };


  const ctaLabel = hasDiagnosis
    ? "Ver meu diagnóstico →"
    : "Iniciar meu diagnóstico agora →";
  const ctaSubtext = hasDiagnosis
    ? "Você já tem um diagnóstico gerado"
    : "Leva menos de 2 minutos";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8F5FF] via-white to-[#FBF7FF] relative overflow-hidden">
      <div className="absolute top-[-150px] left-[-100px] w-[500px] h-[500px] rounded-full bg-ivero-purple opacity-[0.10] blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-150px] right-[-100px] w-[500px] h-[500px] rounded-full bg-accent opacity-[0.10] blur-[140px] pointer-events-none" />

      <div className="relative z-10 px-4 sm:px-6 py-12 sm:py-16">
        {status === "loading" && (
          <div className="min-h-[60vh] flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center text-center"
            >
              <Loader2 className="h-12 w-12 text-accent animate-spin mb-5" />
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">
                Confirmando seu pagamento...
              </h2>
              <p className="text-muted-foreground">Isso pode levar alguns segundos.</p>
            </motion.div>
          </div>
        )}

        {status === "pending" && (
          <div className="min-h-[60vh] flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-lg"
            >
              <div className="text-5xl sm:text-6xl mb-6">⏳</div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Pagamento em processamento
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground mb-8 leading-relaxed">
                Seu pagamento está sendo confirmado. Assim que confirmado, seu acesso será
                liberado automaticamente. Você receberá um e-mail de confirmação.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  size="lg"
                  onClick={handleRecheck}
                  className="text-base px-8 py-5 h-auto rounded-full bg-gradient-to-r from-ivero-purple to-accent text-white hover:opacity-95"
                >
                  <RefreshCw className="mr-2" size={18} /> Verificar novamente
                </Button>
                {checkoutUrl && (
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="text-base px-8 py-5 h-auto rounded-full border-ivero-purple/30 text-ivero-purple hover:bg-ivero-purple/5 hover:text-ivero-purple"
                  >
                    <a href={checkoutUrl} target="_blank" rel="noopener noreferrer">
                      Reabrir pagamento
                    </a>
                  </Button>
                )}
              </div>
              <Button
                variant="ghost"
                size="lg"
                className="mt-4 text-base px-8 py-5 h-auto rounded-full text-ivero-purple hover:bg-ivero-purple/5 hover:text-ivero-purple"
                onClick={() => navigate(isAdmin ? "/admin" : "/dashboard")}
              >
                {isAdmin ? "Ir para o Painel Administrativo" : "Ir Para o Dashboard"}

              </Button>
            </motion.div>
          </div>
        )}

        {status === "active" && leanConfirm && (
          <div className="min-h-[60vh] flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-lg"
            >
              <CheckCircle2 className="mx-auto text-ivero-purple mb-6" size={56} />
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#1A1A2E] mb-3">
                Pagamento confirmado
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground mb-8 leading-relaxed">
                Seu plano já está ativo. Tudo pronto para continuar de onde você parou.
              </p>
              <Button
                size="lg"
                onClick={() => navigate("/dashboard")}
                className="text-base px-10 py-6 h-auto rounded-full bg-gradient-to-r from-ivero-purple to-accent hover:opacity-95 text-white shadow-lg shadow-ivero-purple/25"
              >
                Acessar Dashboard
              </Button>
            </motion.div>
          </div>
        )}

        {status === "active" && !leanConfirm && (
          <div className="max-w-4xl mx-auto space-y-16 sm:space-y-20">
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center pt-4"
            >
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                className="text-7xl sm:text-8xl mb-6 inline-block"
              >
                🎉
              </motion.div>
              <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-bold text-[#1A1A2E] leading-tight mb-5 max-w-3xl mx-auto">
                Parabéns! Sua marca acaba de dar o primeiro passo para{" "}
                <span className="bg-gradient-to-r from-ivero-purple to-accent bg-clip-text text-transparent">
                  dominar as IAs.
                </span>
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-ivero-purple font-medium max-w-2xl mx-auto leading-relaxed">
                A partir de agora, vamos trabalhar juntos para garantir que quando o seu
                cliente perguntar para uma IA — sua marca seja a resposta.
              </p>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-center text-[#1A1A2E] mb-10">
                Sua jornada começa aqui
              </h2>
              <div className="grid md:grid-cols-3 gap-5">
                {[
                  {
                    icon: Search,
                    title: "Vamos revelar onde sua marca está hoje",
                    text: "Descobriremos onde sua marca aparece, onde está invisível e o que está impedindo de ser citada pelas IAs.",
                  },
                  {
                    icon: Map,
                    title: "Construímos o caminho para sua marca aparecer",
                    text: "Com base no diagnóstico, entregamos um plano de ação personalizado com tudo que as IAs precisam para começar a citar sua marca.",
                  },
                  {
                    icon: TrendingUp,
                    title: "Sua marca cresce nas IAs",
                    text: "Monitoramos sua evolução em tempo real. A cada mês você vê sua marca crescendo nas respostas das IAs.",
                  },
                ].map((phase, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    className="relative bg-white rounded-2xl p-6 border border-ivero-purple/10 shadow-sm hover:shadow-lg hover:border-ivero-purple/30 transition-all"
                  >
                    <div className="absolute -top-3 -left-3 w-9 h-9 rounded-full bg-gradient-to-br from-ivero-purple to-accent text-white font-bold flex items-center justify-center text-sm shadow-md">
                      {i + 1}
                    </div>
                    <div className="mb-4 inline-flex p-3 rounded-xl bg-ivero-purple/10 text-ivero-purple">
                      <phase.icon size={22} />
                    </div>
                    <h3 className="font-display text-lg font-semibold text-[#1A1A2E] mb-2 leading-snug">
                      {phase.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {phase.text}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5 }}
            >
              <div className="relative max-w-3xl mx-auto rounded-2xl border-2 border-ivero-purple/40 bg-gradient-to-br from-white via-[#F8F5FF] to-white p-7 sm:p-9 shadow-md">
                <div className="absolute -top-4 left-6 px-3 py-1 rounded-full bg-gradient-to-r from-ivero-purple to-accent text-white text-xs font-semibold tracking-wide shadow">
                  DADO REAL
                </div>
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="text-ivero-purple flex-shrink-0 mt-1" size={28} />
                  <p className="text-base sm:text-lg text-[#1A1A2E] leading-relaxed font-medium">
                    Marcas que completam o diagnóstico nos primeiros{" "}
                    <span className="text-ivero-purple font-bold">7 dias</span> têm{" "}
                    <span className="text-accent font-bold">3x mais chance</span> de
                    aparecer nas IAs em 30 dias.
                  </p>
                </div>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#1A1A2E] mb-3">
                Você não está sozinho nessa jornada
              </h2>
              <p className="text-base text-muted-foreground max-w-xl mx-auto mb-7">
                Nosso atendimento é prioritário — sempre estaremos aqui para te atender
                quando precisar.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  asChild
                  size="lg"
                  className="bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-full px-7 h-12"
                >
                  <a href="#" target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="mr-2" size={18} /> Falar no WhatsApp
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-ivero-purple/30 text-ivero-purple hover:bg-ivero-purple/5 hover:text-ivero-purple rounded-full px-7 h-12"
                >
                  <a href="#">
                    <Mail className="mr-2" size={18} /> Enviar e-mail
                  </a>
                </Button>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center pb-8"
            >
              <Button
                size="lg"
                onClick={() => navigate("/dashboard")}
                className="text-base sm:text-lg px-10 sm:px-14 py-6 sm:py-7 h-auto rounded-full bg-gradient-to-r from-ivero-purple to-accent hover:opacity-95 text-white shadow-xl shadow-ivero-purple/30 transition-all hover:scale-[1.02]"
              >
                {ctaLabel}
              </Button>
              <p className="text-sm text-muted-foreground mt-4">{ctaSubtext}</p>
            </motion.section>
          </div>
        )}
      </div>
    </div>
  );
};

export default BemVindoPage;
