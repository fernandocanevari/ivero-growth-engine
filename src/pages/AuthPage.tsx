import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { ArrowRight, Eye, EyeOff, Sparkles, ArrowLeft } from "lucide-react";

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Read prefilled values from query string (lead capture → signup handoff)
  const prefEmail = searchParams.get("email") || "";
  const prefName = searchParams.get("name") || "";
  const prefSite = searchParams.get("site") || "";
  const prefPhone = searchParams.get("phone") || "";
  const initialMode = (searchParams.get("mode") || "login").toLowerCase();

  const [isLogin, setIsLogin] = useState(initialMode !== "signup");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState(prefEmail);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [staleSessionCleared, setStaleSessionCleared] = useState(false);

  // Persist any prefilled lead context so the brand profile can be built right after signup
  const hasPrefilledLead = Boolean(prefName || prefSite || prefPhone);

  // Helper: persist brand_settings for a freshly signed-up user
  const persistBrandFromLead = async (userId: string, userEmail: string) => {
    if (!hasPrefilledLead) return;
    try {
      await supabase.from("brand_settings").upsert(
        {
          user_id: userId,
          brand_name: prefName || "",
          website: prefSite || "",
          contact_name: prefName || "",
          contact_email: userEmail,
          contact_phone: prefPhone || "",
        } as any,
        { onConflict: "user_id" }
      );
    } catch (err) {
      console.warn("[AuthPage] Failed to persist brand_settings from lead:", err);
    }
  };

  useEffect(() => {
    // Track whether we just signed up so we can run the brand upsert when the session arrives
    let pendingSignupForUserId: string | null = null;

    // If a lead arrives via /auth?email=...&name=... but the browser already
    // has a stale session for a DIFFERENT user (e.g. admin testing), do NOT
    // auto-redirect them into someone else's dashboard. Force a fresh signup.
    const cameFromLeadGate = hasPrefilledLead || Boolean(prefEmail);
    const isMatchingUser = (sessionEmail?: string | null) =>
      !cameFromLeadGate || (sessionEmail && prefEmail && sessionEmail.toLowerCase() === prefEmail.toLowerCase());

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) return;
      // If we just signed up with prefilled lead data, run the upsert before navigating
      if (event === "SIGNED_IN" && pendingSignupForUserId === session.user.id && hasPrefilledLead) {
        // Defer to avoid awaiting inside the auth callback (prevents deadlocks)
        setTimeout(() => {
          persistBrandFromLead(session.user.id, session.user.email || email);
        }, 0);
        pendingSignupForUserId = null;
      }
      if (isMatchingUser(session.user.email)) {
        navigate("/dashboard", { replace: true });
      }
      // else: stale session from another user — wait for them to sign up/in
    });

    // Expose setter so handleSubmit can mark a pending signup
    (window as any).__iveroPendingSignup = (id: string) => { pendingSignupForUserId = id; };

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      if (cameFromLeadGate && !isMatchingUser(session.user.email)) {
        // Stale session belongs to a different user — sign out so the lead
        // sees the actual signup form instead of being thrown into someone
        // else's dashboard.
        await supabase.auth.signOut();
        setStaleSessionCleared(true);
        return;
      }
      navigate("/dashboard", { replace: true });
    });

    return () => {
      subscription.unsubscribe();
      delete (window as any).__iveroPendingSignup;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + "/dashboard",
          data: {
            display_name: prefName || email.split("@")[0],
          },
        },
      });
      if (error) {
        toast({ title: "Erro ao cadastrar", description: error.message, variant: "destructive" });
      } else {
        const userId = data.user?.id;
        // If the session was returned synchronously, persist immediately.
        if (userId && data.session && hasPrefilledLead) {
          await persistBrandFromLead(userId, email);
        } else if (userId && hasPrefilledLead) {
          // Otherwise mark this user as pending so the auth state listener runs the upsert
          (window as any).__iveroPendingSignup?.(userId);
        }
        toast({
          title: data.session ? "Conta criada!" : "Cadastro realizado!",
          description: data.session
            ? "Bem-vindo ao seu dashboard executivo."
            : "Verifique seu email para confirmar e acessar o dashboard.",
        });
      }
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Email enviado!", description: "Verifique sua caixa de entrada para redefinir a senha." });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-ivero-gradient flex-col justify-between p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-white/15 blur-2xl" />
        </div>

        <div className="relative z-10">
          <h1 className="text-5xl font-display font-bold text-white">Ivero</h1>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-4 py-2 text-sm text-white/90">
            <Sparkles className="w-4 h-4" />
            Inteligência de marca para IA
          </div>
          <h2 className="text-4xl xl:text-5xl font-display font-bold text-white leading-tight">
            Seu painel de inteligência está a um login de distância.
          </h2>
          <p className="text-lg text-white/70 max-w-md">
            Acompanhe métricas, alertas e insights sobre como as IAs falam da sua marca — tudo em tempo real.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4">
          <div className="flex -space-x-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-white/30 bg-white/20 backdrop-blur-sm" />
            ))}
          </div>
          <p className="text-sm text-white/60">+500 marcas já monitoram sua presença em IA</p>
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden text-center">
            <h1 className="text-2xl font-display font-bold text-gradient">Ivero</h1>
          </div>

          {isForgotPassword ? (
            <>
              <div className="space-y-2">
                <button
                  onClick={() => setIsForgotPassword(false)}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar ao login
                </button>
                <h2 className="text-2xl font-display font-bold text-foreground">Recuperar senha</h2>
                <p className="text-muted-foreground">Informe seu email para receber o link de redefinição.</p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-foreground">Email</Label>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="h-12 bg-secondary/50 border-border focus:border-primary"
                  />
                </div>
                <Button type="submit" variant="hero" className="w-full h-12 text-base" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar link de recuperação"}
                </Button>
              </form>
            </>
          ) : (
            <>
              {staleSessionCleared && (
                <div className="rounded-xl border border-border bg-muted/40 p-3 flex items-start gap-2">
                  <ArrowLeft className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0 rotate-180" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-foreground">Sessão anterior encerrada</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Detectamos uma conta diferente conectada neste navegador. Encerramos para você criar sua conta com segurança.
                    </p>
                  </div>
                </div>
              )}
              {hasPrefilledLead && !isLogin && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-foreground">Continuando seu diagnóstico</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Pré-populamos seus dados. Defina uma senha para acessar o dashboard executivo.
                    </p>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <h2 className="text-2xl font-display font-bold text-foreground">
                  {isLogin ? "Bem-vindo de volta" : (hasPrefilledLead ? `Olá${prefName ? `, ${prefName.split(" ")[0]}` : ""}!` : "Crie sua conta")}
                </h2>
                <p className="text-muted-foreground">
                  {isLogin ? "Entre para acessar seu painel de inteligência." : "Comece a monitorar sua marca em IA agora."}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-foreground">Email</Label>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="h-12 bg-secondary/50 border-border focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-foreground">Senha</Label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => setIsForgotPassword(true)}
                        className="text-xs text-primary hover:underline"
                      >
                        Esqueceu a senha?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-12 bg-secondary/50 border-border focus:border-primary pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" variant="hero" className="w-full h-12 text-base" disabled={loading}>
                  {loading ? "Aguarde..." : (
                    <>
                      {isLogin ? "Entrar" : "Criar conta"}
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </form>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {isLogin ? "Não tem conta?" : "Já tem conta?"}{" "}
                  <button onClick={() => setIsLogin(!isLogin)} className="text-primary font-medium hover:underline">
                    {isLogin ? "Cadastre-se gratuitamente" : "Entrar"}
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
