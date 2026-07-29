import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { ArrowRight, Eye, EyeOff, Sparkles, ArrowLeft } from "lucide-react";
import { identifyUser, track } from "@/lib/analytics";
import { formatPhoneBR } from "@/lib/format-phone";

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Read prefilled values from query string (lead capture → signup handoff)
  const prefEmail = searchParams.get("email") || "";
  const prefName = searchParams.get("name") || "";
  const prefSite = searchParams.get("site") || "";
  const prefPhone = searchParams.get("phone") || "";
  const redirectParam = searchParams.get("redirect") || "";
  const safeRedirect = redirectParam.startsWith("/") && !redirectParam.startsWith("//") ? redirectParam : "";
  const initialMode = (searchParams.get("mode") || (typeof window !== "undefined" && window.location.pathname === "/signup" ? "signup" : "login")).toLowerCase();

  const [isLogin, setIsLogin] = useState(initialMode !== "signup");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState(prefEmail);
  const [password, setPassword] = useState("");
  const [nomeCompleto, setNomeCompleto] = useState(prefName);
  const [celular, setCelular] = useState(prefPhone ? formatPhoneBR(prefPhone) : "");

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [staleSessionCleared, setStaleSessionCleared] = useState(false);

  // Persist any prefilled lead context so the brand profile can be built right after signup
  const hasPrefilledLead = Boolean(prefName || prefSite || prefPhone);

  // Helper: persist brand_settings contact context for a freshly signed-up user.
  // NOTE: brand_name is intentionally NOT written here — ele é preenchido depois
  // pela análise do site no onboarding (ivero-onboarding-analyze).
  const persistBrandFromLead = async (userId: string, userEmail: string) => {
    if (!hasPrefilledLead) return;
    try {
      await supabase.from("brand_settings").upsert(
        {
          user_id: userId,
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

  // Helper: persist signup fields with STRICT separation of concerns.
  // profiles = person identity only (nome_completo, display_name, celular)
  // brand_settings = brand identity (brand_name vem da análise do site no onboarding)
  // Never duplicate data across these two tables.
  const persistProfileExtras = async (
    userId: string,
    extras: { nome_completo: string; celular: string }
  ) => {
    try {
      await supabase
        .from("profiles")
        .update({
          nome_completo: extras.nome_completo,
          display_name: extras.nome_completo || undefined,
          celular: extras.celular,
        } as any)
        .eq("user_id", userId);
    } catch (err) {
      console.warn("[AuthPage] Failed to persist profile extras:", err);
    }
  };


  // Helper: redirect after login. Single source of truth = onboarding_responses.
  // If a row exists for this user's brand, they've completed onboarding → dashboard.
  // Otherwise, send them to the real onboarding (never /bem-vindo, which is
  // reserved for Asaas payment returns via ?from=asaas).
  const redirectAfterAuth = async (userId: string) => {
    if (safeRedirect) {
      navigate(safeRedirect, { replace: true });
      return;
    }

    try {
      // Admins skip everything and go straight to the admin panel
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (roleRow) {
        navigate("/dashboard/admin", { replace: true });
        return;
      }

      const { data: brand } = await supabase
        .from("brand_settings")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (brand?.id) {
        const { data: resp } = await supabase
          .from("onboarding_responses")
          .select("id")
          .eq("brand_id", brand.id)
          .limit(1)
          .maybeSingle();
        if (resp) {
          navigate("/dashboard", { replace: true });
          return;
        }
      }

      // Sem respostas ainda — vai para o onboarding real.
      navigate("/onboarding/perguntas", { replace: true });
    } catch {
      navigate("/dashboard", { replace: true });
    }
  };

  useEffect(() => {
    // Track whether we just signed up so we can run the brand upsert when the session arrives
    let pendingSignupForUserId: string | null = null;
    // A signup is "in flight" from the moment handleSubmit calls signUp until
    // either the SIGNED_IN event is handled or an error clears it. This covers
    // the race where Supabase emits SIGNED_IN synchronously during signUp,
    // before handleSubmit has the userId to bind to pendingSignupForUserId.
    let signupInFlight = false;
    // Extras collected at signup time, persisted to profiles once the session arrives
    let pendingSignupExtras: { nome_completo: string; celular: string } | null = null;

    // If a lead arrives via /auth?email=...&name=... but the browser already
    // has a stale session for a DIFFERENT user (e.g. admin testing), do NOT
    // auto-redirect them into someone else's dashboard. Force a fresh signup.
    const cameFromLeadGate = hasPrefilledLead || Boolean(prefEmail);
    const isMatchingUser = (sessionEmail?: string | null) =>
      !cameFromLeadGate || (sessionEmail && prefEmail && sessionEmail.toLowerCase() === prefEmail.toLowerCase());

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) return;
      const isPendingSignup =
        event === "SIGNED_IN" &&
        (signupInFlight || pendingSignupForUserId === session.user.id);
      // If we just signed up with prefilled lead data, run the upsert before navigating
      if (isPendingSignup && hasPrefilledLead) {
        // Defer to avoid awaiting inside the auth callback (prevents deadlocks)
        setTimeout(() => {
          persistBrandFromLead(session.user.id, session.user.email || email);
        }, 0);
      }
      if (isPendingSignup && pendingSignupExtras) {
        const extras = pendingSignupExtras;
        setTimeout(() => {
          persistProfileExtras(session.user.id, extras);
        }, 0);
      }
      if (isPendingSignup) {
        pendingSignupForUserId = null;
        pendingSignupExtras = null;
        signupInFlight = false;
        // After signup the user goes to the onboarding questions step —
        // never /bem-vindo, which is reserved for real Asaas payment returns.
        navigate("/onboarding/perguntas", { replace: true });
        return;
      }
      if (isMatchingUser(session.user.email)) {
        redirectAfterAuth(session.user.id);
      }
      // else: stale session from another user — wait for them to sign up/in
    });

    // Expose setters so handleSubmit can mark a pending signup with its extras
    (window as any).__iveroPendingSignup = (id: string) => { pendingSignupForUserId = id; };
    (window as any).__iveroPendingSignupExtras = (extras: { nome_completo: string; celular: string }) => {
      pendingSignupExtras = extras;
    };
    // Called BEFORE supabase.auth.signUp so the listener treats the next
    // SIGNED_IN as a signup even if the session arrives synchronously.
    (window as any).__iveroPendingSignupPre = () => { signupInFlight = true; };
    // Called on signUp error to release the flag so subsequent logins are
    // routed normally by redirectAfterAuth.
    (window as any).__iveroPendingSignupClear = () => {
      signupInFlight = false;
      pendingSignupForUserId = null;
      pendingSignupExtras = null;
    };

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      // Always force a clean login when the user explicitly opens /auth.
      // This prevents stale sessions (e.g. a previous admin or another
      // account) from silently bouncing the user into someone else's
      // dashboard without ever showing the login form.
      await supabase.auth.signOut();
      setStaleSessionCleared(true);
    });

    return () => {
      subscription.unsubscribe();
      delete (window as any).__iveroPendingSignup;
      delete (window as any).__iveroPendingSignupExtras;
      delete (window as any).__iveroPendingSignupPre;
      delete (window as any).__iveroPendingSignupClear;
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
      const celularDigits = celular.replace(/\D/g, "");
      if (celularDigits.length < 10 || celularDigits.length > 11) {
        setLoading(false);
        toast({
          title: "Celular inválido",
          description: "Informe um celular no formato (11) 91234-5678.",
          variant: "destructive",
        });
        return;
      }
      const extras = {
        nome_completo: nomeCompleto.trim(),
        celular: celular.trim(),
      };
      // Read chosen plan from landing-page CTA (localStorage) and pass it as
      // signup metadata so the DB trigger creates the trial with the right plan
      // atomically. Falls back to "presenca" if none was chosen.
      const PLAN_SLUG_MAP: Record<string, string> = {
        Presença: "presenca",
        Influência: "influencia",
        Autoridade: "autoridade",
        presenca: "presenca",
        influencia: "influencia",
        autoridade: "autoridade",
      };
      let planoEscolhido = "presenca";
      try {
        const stored = localStorage.getItem("ivero_selected_plan");
        if (stored && PLAN_SLUG_MAP[stored]) planoEscolhido = PLAN_SLUG_MAP[stored];
      } catch {
        // ignore storage errors
      }
      // Mark this attempt as a signup BEFORE calling signUp, so the
      // onAuthStateChange listener recognizes the SIGNED_IN event as a signup
      // (even when Supabase returns a session synchronously) and routes to
      // /onboarding/perguntas instead of running redirectAfterAuth →
      // /bem-vindo. Regression fix: previously the pending flag was only set
      // in the async (email-confirmation) branch, causing the sync branch to
      // race with the listener and land on /bem-vindo.
      (window as any).__iveroPendingSignupExtras?.(extras);
      (window as any).__iveroPendingSignupPre?.();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + "/onboarding/perguntas",
          data: {
            display_name: extras.nome_completo || prefName || email.split("@")[0],
            nome_completo: extras.nome_completo,
            celular: extras.celular,
            plano_escolhido: planoEscolhido,
          },
        },
      });
      if (error) {
        (window as any).__iveroPendingSignupClear?.();
        toast({ title: "Erro ao cadastrar", description: error.message, variant: "destructive" });
      } else {
        const userId = data.user?.id;
        // Bind the pending-signup flag to the concrete userId now that we have it.
        if (userId) {
          (window as any).__iveroPendingSignup?.(userId);
        }
        // If the session was returned synchronously, persist immediately.
        // Navigation is handled by the onAuthStateChange listener via the
        // pending-signup flag above, avoiding a race with redirectAfterAuth.
        if (userId && data.session) {
          if (hasPrefilledLead) {
            await persistBrandFromLead(userId, email);
          }
          await persistProfileExtras(userId, extras);
        }

        // Funnel step 4: signup completed. Alias the lead's email-identity
        // to the new auth.users.id so the full pre-signup journey stays attached.
        if (userId) {
          identifyUser(userId, { email });
          track("signup_completed", {
            email,
            user_id: userId,
            came_from_lead_gate: hasPrefilledLead,
          });
        }
        toast({
          title: data.session ? "Conta criada!" : "Cadastro realizado!",
          description: data.session
            ? "Vamos conhecer melhor sua marca."
            : "Verifique seu email para confirmar e continuar.",
        });
        // Cleanup: chosen plan already traveled with signUp metadata
        try { localStorage.removeItem("ivero_selected_plan"); } catch {}
        if (userId && data.session) {
          navigate("/onboarding/perguntas", { replace: true });
        }
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
      <div className="flex-1 flex items-start lg:items-center justify-center px-6 py-8 sm:px-12 sm:py-10 bg-background overflow-y-auto">
        <div className="w-full max-w-md space-y-6">
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

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Email</Label>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="h-11 bg-secondary/50 border-border focus:border-primary"
                  />
                </div>
                <Button type="submit" variant="hero" className="w-full h-11 text-base" disabled={loading}>
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

              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-foreground">Nome completo</Label>
                      <Input
                        type="text"
                        required
                        maxLength={100}
                        value={nomeCompleto}
                        onChange={(e) => setNomeCompleto(e.target.value)}
                        placeholder="Seu nome completo"
                        className="h-11 bg-secondary/50 border-border focus:border-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Celular</Label>
                      <Input
                        type="tel"
                        inputMode="numeric"
                        required
                        maxLength={16}
                        value={celular}
                        onChange={(e) => setCelular(formatPhoneBR(e.target.value))}
                        placeholder="(11) 91234-5678"
                        className="h-11 bg-secondary/50 border-border focus:border-primary"
                      />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label className="text-foreground">Email</Label>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="h-11 bg-secondary/50 border-border focus:border-primary"
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
                      className="h-11 bg-secondary/50 border-border focus:border-primary pr-12"
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

                <Button type="submit" variant="hero" className="w-full h-11 text-base" disabled={loading}>
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
