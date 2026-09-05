import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowRight, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SearchScan } from "@/components/ui/search-scan";
import { useOnboardingResponses } from "@/hooks/useOnboardingResponses";
import { getOpeningPhrase } from "@/lib/onboarding-recommendation";
import { supabase } from "@/integrations/supabase/client";
import {
  runDiagnostic,
  persistDiagnostic,
  extractBrandFromUrl,
} from "@/lib/diagnostic-engine";

const LOADING_MESSAGES = [
  "Consultando os modelos de IA sobre a sua marca...",
  "Comparando as respostas de cada modelo...",
  "Medindo clareza, autoridade e conversão...",
  "Avaliando posicionamento e relevância no seu nicho...",
  "Consolidando o seu Score de Influência em IA...",
];

function bandFor(score: number) {
  if (score < 40) return { label: "Crítico", cls: "bg-red-50 text-red-700 border-red-200" };
  if (score < 60) return { label: "Insuficiente", cls: "bg-orange-50 text-orange-700 border-orange-200" };
  if (score < 75) return { label: "Moderado", cls: "bg-amber-50 text-amber-700 border-amber-200" };
  if (score < 90) return { label: "Sólido", cls: "bg-sky-50 text-sky-700 border-sky-200" };
  return { label: "Referência", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
}

/**
 * Etapa 3 do onboarding — Diagnóstico real.
 *
 * O cadastro direto (caminho 2) não passa pelo /preview, então é aqui que a
 * análise de verdade roda (simulate-ai, mesmo motor do preview), usando o site
 * e a marca capturados na etapa 2. O resultado é persistido em audit_reports +
 * analysis_history para que o menu "Diagnóstico IA" mostre exatamente o mesmo
 * dado que o cliente acabou de ver.
 */
export default function OnboardingDiagnosticoPlaceholderPage() {
  const navigate = useNavigate();
  const { data: responses, isLoading } = useOnboardingResponses();

  const [phase, setPhase] = useState<"loading" | "done" | "error">("loading");
  const [msgIndex, setMsgIndex] = useState(0);
  // Só o que a tela mostra — permite adotar snapshots já salvos sem
  // reconstruir o objeto completo do motor de diagnóstico.
  const [result, setResult] = useState<{ overallScore: number; pillarDetails: any[] } | null>(null);
  // Já existia diagnóstico (veio do /preview ou de uma auditoria anterior)?
  // Nesse caso não roda simulate-ai de novo — só adota o resultado.
  const [adopted, setAdopted] = useState(false);
  const didRun = useRef(false);

  // Fallback: se por algum motivo não achamos as respostas (usuário
  // acessou direto sem passar pelas perguntas), redireciona pro dashboard.
  useEffect(() => {
    if (!isLoading && !responses) {
      navigate("/dashboard", { replace: true });
    }
  }, [isLoading, responses, navigate]);

  // Rotação das frases do loading
  useEffect(() => {
    if (phase !== "loading") return;
    const id = setInterval(() => {
      setMsgIndex((i) => (i < LOADING_MESSAGES.length - 1 ? i + 1 : i));
    }, 2600);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (isLoading || !responses || didRun.current) return;
    didRun.current = true;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Belt-and-suspenders: o onboarding real foi concluído.
      await supabase
        .from("profiles")
        .update({ is_first_login: false } as never)
        .eq("user_id", user.id);

      // Site/marca vindos da etapa 2 (perfil da marca).
      const { data: brand } = await supabase
        .from("brand_settings")
        .select("brand_name, website")
        .eq("user_id", user.id)
        .maybeSingle();

      const siteUrl = (brand as { website?: string } | null)?.website ?? "";
      const brandName =
        (brand as { brand_name?: string } | null)?.brand_name ||
        (siteUrl ? extractBrandFromUrl(siteUrl) : "");

      // ── Reaproveitamento: se o cliente já rodou o diagnóstico (veio do
      // /preview ou já tem auditoria salva), não paga simulate-ai de novo.
      const { data: lastAudit } = await supabase
        .from("audit_reports")
        .select("overall_score, pillar_details")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const audit = lastAudit as { overall_score?: number; pillar_details?: unknown } | null;
      if (audit && typeof audit.overall_score === "number" && audit.overall_score > 0) {
        setResult({
          overallScore: audit.overall_score,
          pillarDetails: Array.isArray(audit.pillar_details) ? audit.pillar_details : [],
        });
        setAdopted(true);
        setPhase("done");
        return;
      }

      try {
        const raw = sessionStorage.getItem("ivero:lastDiagnostic");
        const payload = raw ? JSON.parse(raw) : null;
        if (payload && typeof payload.geoScore === "number" && payload.geoScore > 0) {
          setResult({
            overallScore: payload.geoScore,
            pillarDetails: Array.isArray(payload.pillarDetails) ? payload.pillarDetails : [],
          });
          setAdopted(true);
          setPhase("done");
          return;
        }
      } catch {
        // storage corrompido: segue para a análise normal
      }

      if (!brandName) {
        setPhase("error");
        return;
      }

      const started = Date.now();
      const diag = await runDiagnostic(brandName);
      // Gate mínimo de loading para a leitura das frases não ser atropelada.
      const elapsed = Date.now() - started;
      if (elapsed < 4500) await new Promise((r) => setTimeout(r, 4500 - elapsed));

      if (!diag.ok) {
        setPhase("error");
        return;
      }

      await persistDiagnostic({
        userId: user.id,
        siteUrl,
        source: "onboarding",
        result: diag,
        writeAnalysisHistory: true,
      });

      setResult(diag);
      setPhase("done");
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

  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F8F5FF] via-white to-[#FBF7FF] px-4 py-16 flex items-center justify-center">
        <div className="max-w-xl w-full text-center">
          <SearchScan className="mx-auto mb-8" />
          <p className="font-display text-2xl md:text-3xl font-bold text-[#1A1A2E] mb-3">
            Agora vou analisar sua marca nas respostas das IAs
          </p>
          <AnimatePresence mode="wait">
            <motion.p
              key={msgIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="text-muted-foreground"
            >
              {LOADING_MESSAGES[msgIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F8F5FF] via-white to-[#FBF7FF] px-4 py-16 flex items-center justify-center">
        <div className="max-w-xl w-full text-center space-y-5">
          <div className="mx-auto w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <p className="font-display text-2xl font-bold text-[#1A1A2E]">
            Não foi possível concluir a análise agora
          </p>
          <p className="text-muted-foreground">
            Os modelos de IA estão com instabilidade temporária. Você já pode entrar no
            seu painel — o diagnóstico pode ser rodado novamente a qualquer momento.
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/dashboard")}
            className="bg-[#6C5CE7] hover:bg-[#5b4ddb] text-white"
          >
            Ir para meu dashboard <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </div>
    );
  }

  const overall = result?.overallScore ?? 0;
  const overallBand = bandFor(overall);

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
        <h1 className="font-display text-xl md:text-2xl font-bold text-[#1A1A2E] leading-tight mb-8">
          {phrase}
        </h1>

        {/* Score geral real */}
        <div className="rounded-2xl border border-[#E9E3FF] bg-white shadow-sm p-8 mb-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
            Score de Influência em IA
          </p>
          <p className="font-display text-6xl font-bold text-[#1A1A2E] leading-none">
            {overall}
            <span className="text-2xl text-muted-foreground">/100</span>
          </p>
          <span className={`inline-block mt-4 text-xs font-medium px-3 py-1 rounded-full border ${overallBand.cls}`}>
            {overallBand.label}
          </span>
        </div>

        {/* Resumo por pilar */}
        <div className="grid sm:grid-cols-2 gap-3 mb-8 text-left">
          {(result?.pillarDetails ?? []).map((p: any) => {
            const band = typeof p.score === "number" ? bandFor(p.score) : null;
            return (
              <div key={p.name} className="rounded-xl border border-[#EDE9FB] bg-white p-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-semibold text-[#1A1A2E]">{p.name}</span>
                  <span className="text-sm font-bold text-[#6C5CE7]">
                    {typeof p.score === "number" ? p.score : "—"}
                  </span>
                </div>
                {band && (
                  <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full border ${band.cls}`}>
                    {band.label}
                  </span>
                )}
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{p.summary}</p>
              </div>
            );
          })}
        </div>

        <Button
          size="lg"
          onClick={() => navigate("/dashboard/diagnostico")}
          className="bg-[#6C5CE7] hover:bg-[#5b4ddb] text-white"
        >
          {adopted ? "Concluir e ir para o dashboard" : "Concluir e ver meu diagnóstico"} <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </motion.div>
    </div>
  );
}
