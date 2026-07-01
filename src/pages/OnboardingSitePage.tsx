import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, X, Globe, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

type Phase = "url" | "loading" | "confirm" | "objectives";

type AnalysisResult = {
  brand_name: string;
  description: string;
  sector: string;
  competitors: string[];
  normalized_url: string;
};

const LOADING_MESSAGES = [
  "Acessando o site da sua marca...",
  "Estou dando uma olhada em tudo que você publica...",
  "Interessante — já estou entendendo como sua marca se posiciona",
  "Agora estou mapeando quem divide esse mercado com você",
  "Pronto. Tenho o que precisava para começar.",
];

const OBJECTIVES = [
  {
    value: "aparecer_mais_frequencia",
    label: "Aparecer com mais frequência nas respostas das IAs",
  },
  {
    value: "entender_percepcao_atual",
    label: "Entender o que as IAs estão dizendo sobre minha marca hoje",
  },
  {
    value: "superar_concorrentes_comparacao",
    label: "Aparecer melhor que meus concorrentes nas comparações que as IAs fazem",
  },
  {
    value: "conteudo_citavel",
    label: "Ter mais conteúdo técnico/institucional que as IAs possam citar",
  },
] as const;

export default function OnboardingSitePage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("url");
  const [url, setUrl] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [brandName, setBrandName] = useState("");
  const [description, setDescription] = useState("");
  const [sector, setSector] = useState("");
  const [competitors, setCompetitors] = useState<{ name: string; suggested: boolean }[]>([]);
  const [newCompetitor, setNewCompetitor] = useState("");
  const [objetivos, setObjetivos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<{ kind: "site_inaccessible" | "insufficient_content"; message: string; normalizedUrl?: string } | null>(null);
  const loadingTimerRef = useRef<number | null>(null);
  const urlInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setUserId(user.id);
    })();
  }, [navigate]);

  // Loading message cycler
  useEffect(() => {
    if (phase !== "loading") return;
    setLoadingStep(0);
    const id = window.setInterval(() => {
      setLoadingStep((s) => Math.min(s + 1, LOADING_MESSAGES.length - 1));
    }, 2200);
    loadingTimerRef.current = id;
    return () => window.clearInterval(id);
  }, [phase]);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setErrorState(null);
    setPhase("loading");
    try {
      const { data, error } = await supabase.functions.invoke("ivero-onboarding-analyze", {
        body: { url: url.trim() },
      });
      if (error) throw error;
      if (data?.error === "site_inaccessible") {
        setErrorState({ kind: "site_inaccessible", message: data?.message || "Hmm, não consegui acessar esse site. Verifique o endereço e tente novamente." });
        setPhase("url");
        return;
      }
      if (data?.error === "insufficient_content") {
        setErrorState({ kind: "insufficient_content", message: data?.message || "Consegui acessar o site, mas ele tem pouco conteúdo pra eu analisar. Tente outro endereço ou continue mesmo assim.", normalizedUrl: data?.normalized_url });
        setPhase("url");
        return;
      }
      if (!data || data.error) throw new Error(data?.error || "Erro ao analisar");
      const result = data as AnalysisResult;
      setAnalysis(result);
      setBrandName(result.brand_name || "");
      setDescription(result.description || "");
      setSector(result.sector || "");
      setCompetitors(
        (result.competitors || []).map((name) => ({ name, suggested: true })),
      );
      setPhase("confirm");
    } catch {
      setErrorState({
        kind: "site_inaccessible",
        message: "Hmm, não consegui acessar esse site. Verifique o endereço e tente novamente.",
      });
      setPhase("url");
    }
  };

  const handleContinueAnyway = () => {
    setAnalysis({ brand_name: "", description: "", sector: "", competitors: [], normalized_url: errorState?.normalizedUrl || url.trim() });
    setBrandName("");
    setDescription("");
    setSector("");
    setCompetitors([]);
    setErrorState(null);
    setPhase("confirm");
  };

  const handleTryAnother = () => {
    setUrl("");
    setErrorState(null);
    setTimeout(() => urlInputRef.current?.focus(), 0);
  };

  const removeCompetitor = (idx: number) => {
    setCompetitors((list) => list.filter((_, i) => i !== idx));
  };

  const addCompetitor = () => {
    const n = newCompetitor.trim();
    if (!n) return;
    setCompetitors((list) => [...list, { name: n, suggested: false }]);
    setNewCompetitor("");
  };

  const handleConfirm = () => {
    if (!brandName.trim()) {
      toast({ title: "Informe o nome da empresa", variant: "destructive" });
      return;
    }
    setPhase("objectives");
  };

  const toggleObjective = (value: string) => {
    setObjetivos((prev) => {
      if (prev.includes(value)) return prev.filter((v) => v !== value);
      if (prev.length >= 3) return prev;
      return [...prev, value];
    });
  };

  const handleFinish = async () => {
    if (!userId || objetivos.length < 1) return;
    setSaving(true);
    try {
      // 1) Upsert brand_settings
      const { data: existing } = await supabase
        .from("brand_settings")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      const brandPayload = {
        user_id: userId,
        brand_name: brandName.trim(),
        description: description.trim(),
        sector: sector.trim(),
        website: analysis?.normalized_url || url.trim(),
        objetivos,
      } as never;

      let brandId: string;
      if (existing?.id) {
        const { error } = await supabase
          .from("brand_settings")
          .update(brandPayload)
          .eq("id", existing.id);
        if (error) throw error;
        brandId = existing.id;
      } else {
        const { data, error } = await supabase
          .from("brand_settings")
          .insert(brandPayload)
          .select("id")
          .single();
        if (error) throw error;
        brandId = data.id;
      }

      // 2) Replace competitors for this brand
      await supabase.from("competitors").delete().eq("brand_id", brandId);
      if (competitors.length > 0) {
        const rows = competitors.map((c) => ({
          brand_id: brandId,
          nome: c.name,
          sugerido_por_ia: c.suggested,
          aprovado_pelo_usuario: true,
        }));
        const { error: cErr } = await supabase.from("competitors").insert(rows as never);
        if (cErr) throw cErr;
      }

      navigate("/onboarding/diagnostico");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar";
      toast({ title: "Não foi possível salvar", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8F5FF] via-white to-[#FBF7FF] px-4 sm:px-6 py-10 sm:py-16">
      <div className="max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {phase === "url" && (
            <motion.div
              key="url"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-8">
                <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A2E] leading-tight mb-3">
                  Qual é o site da sua marca?
                </h1>
                <p className="text-base text-muted-foreground">
                  Vou dar uma olhada nele e já voltar com o que entendi sobre você.
                </p>
              </div>
              <form
                onSubmit={handleAnalyze}
                className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-ivero-purple/10 p-6 sm:p-8 space-y-4"
              >
                <div>
                  <Label htmlFor="site">Endereço do site</Label>
                  <div className="relative mt-1.5">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="site"
                      type="text"
                      placeholder="www.suaempresa.com.br"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="pl-9"
                      autoFocus
                      required
                      ref={urlInputRef}
                    />
                  </div>
                </div>
                {errorState && (
                  <div className="rounded-lg border border-[#F5B7B1] bg-[#FDECEA] px-4 py-3 text-sm text-[#8B2B23]">
                    <p>{errorState.message}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {errorState.kind === "insufficient_content" ? (
                        <>
                          <Button type="button" variant="outline" size="sm" onClick={handleTryAnother}>
                            Tentar outro endereço
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="bg-[#6C5CE7] hover:bg-[#5b4ddb] text-white"
                            onClick={handleContinueAnyway}
                          >
                            Continuar mesmo assim
                          </Button>
                        </>
                      ) : (
                        <Button type="button" variant="outline" size="sm" onClick={handleTryAnother}>
                          Tentar novamente
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full bg-[#6C5CE7] hover:bg-[#5b4ddb] text-white"
                  disabled={!url.trim()}
                >
                  Analisar
                </Button>
              </form>
            </motion.div>
          )}

          {phase === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-ivero-purple/10 p-10 text-center"
            >
              <Loader2 className="h-10 w-10 animate-spin text-[#6C5CE7] mx-auto mb-6" />
              <div className="min-h-[60px] flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={loadingStep}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35 }}
                    className="text-lg font-medium text-[#1A1A2E]"
                  >
                    {LOADING_MESSAGES[loadingStep]}
                  </motion.p>
                </AnimatePresence>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Isso costuma levar alguns segundos.
              </p>
            </motion.div>
          )}

          {phase === "confirm" && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-8">
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1A1A2E] leading-tight mb-2">
                  Foi isso que eu entendi sobre a sua marca.
                </h1>
                <p className="text-base text-muted-foreground">
                  Confira e ajuste o que precisar antes de continuar.
                </p>
              </div>
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-ivero-purple/10 p-6 sm:p-8 space-y-5">
                <div>
                  <Label htmlFor="brand">Nome da empresa</Label>
                  <Input
                    id="brand"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="desc">O que a sua empresa faz</Label>
                  <Textarea
                    id="desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1.5 min-h-[80px]"
                  />
                </div>
                <div>
                  <Label htmlFor="sector">Segmento de mercado</Label>
                  <Input
                    id="sector"
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Concorrentes</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Identificamos esses concorrentes prováveis. Remova quem não fizer sentido ou adicione outros.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {competitors.map((c, i) => (
                      <span
                        key={`${c.name}-${i}`}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm border ${
                          c.suggested
                            ? "bg-[#F5F3FF] border-[#6C5CE7]/30 text-[#1A1A2E]"
                            : "bg-white border-[#E5E5E5] text-[#1A1A2E]"
                        }`}
                      >
                        {c.name}
                        <button
                          type="button"
                          onClick={() => removeCompetitor(i)}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label={`Remover ${c.name}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                    {competitors.length === 0 && (
                      <span className="text-sm text-muted-foreground">Nenhum concorrente listado.</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Adicionar outro concorrente"
                      value={newCompetitor}
                      onChange={(e) => setNewCompetitor(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCompetitor();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={addCompetitor}>
                      Adicionar
                    </Button>
                  </div>
                </div>
                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={handleConfirm}
                    className="bg-[#6C5CE7] hover:bg-[#5b4ddb] text-white"
                  >
                    Está correto, continuar
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {phase === "objectives" && (
            <motion.div
              key="objectives"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-8">
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1A1A2E] leading-tight mb-2">
                  O que você quer conquistar com a Ivero?
                </h1>
                <p className="text-base text-muted-foreground">
                  Escolha de 1 a 3 objetivos. Vamos focar a sua estratégia neles.
                </p>
              </div>
              <div className="grid gap-3">
                {OBJECTIVES.map((obj) => {
                  const isSelected = objetivos.includes(obj.value);
                  const disabled = !isSelected && objetivos.length >= 3;
                  return (
                    <button
                      key={obj.value}
                      type="button"
                      onClick={() => toggleObjective(obj.value)}
                      disabled={disabled}
                      className={`relative text-left rounded-2xl border-2 p-5 transition-all duration-150 ${
                        isSelected
                          ? "border-[#6C5CE7] bg-[#F5F3FF] shadow-md"
                          : "border-[#E5E5E5] bg-white hover:border-[#6C5CE7]/50 hover:bg-[#FAF8FF]"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 inline-flex w-6 h-6 rounded-full border-2 items-center justify-center flex-shrink-0 ${
                            isSelected ? "border-[#6C5CE7] bg-[#6C5CE7]" : "border-[#C9C9D4]"
                          }`}
                        >
                          {isSelected && <Check className="h-4 w-4 text-white" />}
                        </span>
                        <span className="text-[15px] sm:text-base text-[#1A1A2E] leading-snug">
                          {obj.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-4 text-center">
                {objetivos.length}/3 selecionado{objetivos.length === 1 ? "" : "s"}
              </p>
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleFinish}
                  disabled={objetivos.length < 1 || saving}
                  className="bg-[#6C5CE7] hover:bg-[#5b4ddb] text-white"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando...
                    </>
                  ) : (
                    "Concluir e ver meu diagnóstico"
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
