import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, ArrowRight, Clock, Sparkles, Target, ShieldCheck, MessageCircle, XCircle } from "lucide-react";
import { PLANOS, type PlanoSugerido } from "@/lib/pricing-rules";
import { RecusaModal } from "@/components/proposta/RecusaModal";
import { toast } from "@/hooks/use-toast";

interface PropostaPublic {
  slug: string;
  empresa_nome: string;
  empresa_site: string;
  contato_nome: string | null;
  origem: "preview" | "convite";
  diagnostico_snapshot: any;
  score_geral: number;
  plano_sugerido: PlanoSugerido;
  valor_proposto: number;
  status: string;
  expires_at: string;
  created_at: string;
}

interface Props {
  variant?: "proposta" | "convite";
}

export default function PropostaComercialPage({ variant = "proposta" }: Props) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<PropostaPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recusaOpen, setRecusaOpen] = useState(false);
  const [respondida, setRespondida] = useState<"aceita" | "recusada" | null>(null);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-proposta-public?slug=${encodeURIComponent(slug)}`;
        const res = await fetch(url, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "" },
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setError(j.error || "Proposta não encontrada");
        } else {
          const json = await res.json();
          setData(json);
          if (json.status === "aceita" || json.status === "recusada") setRespondida(json.status);
        }
      } catch (e: any) {
        setError(e?.message || "Erro ao carregar");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const handleAceitar = async () => {
    if (!slug) return;
    const { error: invokeErr } = await supabase.functions.invoke("responder-proposta", {
      body: { slug, acao: "aceita" },
    });
    if (invokeErr) {
      toast({ title: "Erro", description: invokeErr.message, variant: "destructive" });
      return;
    }
    // Redireciona ao cadastro com plano pré-selecionado
    navigate(`/auth?mode=signup&intent=proposta&slug=${encodeURIComponent(slug)}&plano=${data?.plano_sugerido || ""}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-3 max-w-md">
          <XCircle className="w-12 h-12 text-destructive mx-auto" />
          <h1 className="font-display text-2xl font-bold">Proposta indisponível</h1>
          <p className="text-muted-foreground">{error || "Esta proposta não existe ou expirou."}</p>
          <Button onClick={() => navigate("/")}>Voltar ao site</Button>
        </div>
      </div>
    );
  }

  // Fallback defensivo: valores legados (ex. "dominio") não podem quebrar a tela.
  const plano = PLANOS[data.plano_sugerido] ?? PLANOS.autoridade;
  const expiresDate = new Date(data.expires_at);
  const expired = data.status === "expirada" || expiresDate < new Date();
  const diasRestantes = Math.max(0, Math.ceil((expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const radar: any[] = Array.isArray(data.diagnostico_snapshot?.radar) ? data.diagnostico_snapshot.radar : [];

  const headerLabel = variant === "convite" ? "Convite personalizado" : "Proposta comercial";

  // Estado pós-resposta
  if (respondida === "aceita") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4 max-w-md">
          <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
          <h1 className="font-display text-2xl font-bold">Proposta aceita!</h1>
          <p className="text-muted-foreground">Crie sua conta para começar agora mesmo.</p>
          <Button size="lg" onClick={handleAceitar}>
            Continuar para o cadastro <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }
  if (respondida === "recusada") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-3 max-w-md">
          <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto" />
          <h1 className="font-display text-2xl font-bold">Resposta recebida</h1>
          <p className="text-muted-foreground">Obrigado pelo retorno. Estamos por aqui se mudar de ideia.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      {/* Header */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="text-xl font-display font-bold text-gradient">
            Ivero
          </button>
          {!expired && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              {diasRestantes > 0 ? `Válida por ${diasRestantes} dia${diasRestantes > 1 ? "s" : ""}` : "Expira hoje"}
            </div>
          )}
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 py-10 max-w-3xl space-y-8">
        {/* Hero */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="space-y-3">
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground leading-tight">
              {data.empresa_nome || data.empresa_site || "Sua marca"}
            </h1>
            <p className="text-lg text-muted-foreground">
              Diagnóstico de presença em IA e plano recomendado para evoluir sua influência nos próximos 90 dias.
            </p>
          </div>
        </motion.section>

        {/* Score atual */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Score GEO atual</p>
                <p className="font-display text-5xl sm:text-6xl font-bold text-gradient mt-2">{data.score_geral}</p>
                <p className="text-xs text-muted-foreground mt-1">de 100 pontos possíveis</p>
              </div>
              <div className="text-right max-w-xs">
                <p className="text-sm font-semibold text-foreground">
                  {data.score_geral < 40 ? "Sua marca é praticamente invisível para as IAs."
                    : data.score_geral < 60 ? "Você existe nas IAs, mas concorrentes estão à frente."
                    : data.score_geral < 80 ? "Boa presença. Ainda dá para virar referência."
                    : "Você já é referência. Hora de consolidar liderança."}
                </p>
              </div>
            </div>

            {radar.length > 0 && (
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-3">
                {radar.map((p: any) => (
                  <div key={p.subject} className="text-center p-3 rounded-lg bg-muted/40">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{p.subject}</p>
                    <p className="font-display text-xl font-bold text-foreground mt-1">{p.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.section>

        {/* Plano recomendado */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
          <div className="rounded-2xl border-2 border-primary/30 bg-card overflow-hidden shadow-[0_8px_40px_-12px_hsl(var(--primary)/0.25)]">
            <div className="bg-ivero-gradient p-1" />
            <div className="p-6 sm:p-8 space-y-5">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-widest">Plano recomendado</span>
              </div>

              <div className="space-y-2">
                <h2 className="font-display text-3xl font-bold text-foreground">Plano {plano.name}</h2>
                <p className="text-muted-foreground">{plano.tagline}</p>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="font-display text-4xl font-bold text-foreground">
                  R$ {plano.monthlyPrice.toLocaleString("pt-BR")}
                </span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {plano.metrics.map((m) => (
                  <div key={m.label} className="p-3 rounded-lg bg-muted/40 text-center">
                    <p className="font-display font-bold text-foreground">{m.value}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{m.label}</p>
                  </div>
                ))}
              </div>

              <ul className="space-y-2 pt-2">
                {[
                  ...plano.highlights,
                  "Dashboard GEO completo",
                  "Análise Comparativa com concorrentes",
                  "Suporte prioritário",
                  "Sem contrato — cancele quando quiser",
                ].map((h) => (
                  <li key={h} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.section>

        {/* CTA principal — destaque máximo */}
        {!expired && (
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.22 }}>
            <Button
              size="lg"
              className="w-full h-16 text-lg font-bold bg-ivero-gradient hover:opacity-90 text-primary-foreground rounded-2xl shadow-[0_12px_40px_-10px_hsl(var(--primary)/0.55)]"
              onClick={handleAceitar}
            >
              Sim, quero ativar o Plano {plano.name} agora
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </motion.section>
        )}

        {/* Garantia / valor */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.25 }}>
          <div className="rounded-xl border border-border bg-muted/30 p-5 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Sem fidelidade. Cancela quando quiser.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Setup em até 48h. Acompanhamento estratégico mensal incluso.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Recusa secundária */}
        {!expired && (
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.28 }}>
            <Button variant="ghost" size="lg" className="w-full h-12 text-muted-foreground hover:text-foreground" onClick={() => setRecusaOpen(true)}>
              Não tenho interesse
            </Button>
          </motion.section>
        )}

        {expired && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
            <p className="text-sm text-amber-900 font-medium">Esta proposta expirou.</p>
            <p className="text-xs text-amber-700 mt-1">Entre em contato para receber uma nova proposta atualizada.</p>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground pt-4">
          <MessageCircle className="w-3 h-3 inline mr-1" />
          Dúvidas? Responda esse link ou fale com nosso time.
        </p>
      </div>

      <RecusaModal
        open={recusaOpen}
        onOpenChange={setRecusaOpen}
        slug={slug || ""}
        onSuccess={() => setRespondida("recusada")}
      />
    </div>
  );
}
