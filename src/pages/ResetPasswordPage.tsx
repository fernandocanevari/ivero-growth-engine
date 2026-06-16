import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Erro", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Senha atualizada!", description: "Você será redirecionado ao dashboard." });
      setTimeout(async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data } = await supabase
              .from("profiles")
              .select("is_first_login")
              .eq("user_id", user.id)
              .maybeSingle();
            navigate(data?.is_first_login ? "/bem-vindo" : "/dashboard", { replace: true });
            return;
          }
        } catch {/* fall through */}
        navigate("/dashboard", { replace: true });
      }, 1500);
    }
    setLoading(false);
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md text-center space-y-4">
          <h1 className="text-2xl font-display font-bold text-foreground">Verificando link...</h1>
          <p className="text-muted-foreground">Aguarde enquanto validamos seu acesso.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-display font-bold text-gradient">Ivero</h1>
          <h2 className="text-xl font-display font-bold text-foreground">Redefinir senha</h2>
          <p className="text-muted-foreground">Crie uma nova senha para sua conta.</p>
        </div>

        <form onSubmit={handleReset} className="space-y-5">
          <div className="space-y-2">
            <Label className="text-foreground">Nova senha</Label>
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
          <div className="space-y-2">
            <Label className="text-foreground">Confirmar senha</Label>
            <Input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="h-12 bg-secondary/50 border-border focus:border-primary"
            />
          </div>
          <Button type="submit" variant="hero" className="w-full h-12 text-base" disabled={loading}>
            {loading ? "Atualizando..." : (
              <>
                Salvar nova senha
                <CheckCircle2 className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
