import { motion } from "framer-motion";
import { InfoTooltip } from "@/components/InfoTooltip";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, CheckCircle2, XCircle, Loader2, AlertTriangle, ExternalLink, Globe, Search, RefreshCw } from "lucide-react";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface Citation {
  title: string;
  uri: string;
}

interface SimResult {
  model: string;
  response: string;
  mentionsBrand: boolean;
  error?: boolean;
  errorMessage?: string;
  citations?: Citation[];
}

export default function SimuladorPage() {
  const getHost = (uri: string) => {
    try {
      return new URL(uri).hostname.replace(/^www\./, "");
    } catch {
      return uri;
    }
  };
  const mentionsInSource = (c: Citation, brand: string) => {
    const b = brand.toLowerCase();
    return c.title.toLowerCase().includes(b) || c.uri.toLowerCase().includes(b);
  };
  const [query, setQuery] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const [results, setResults] = useState<SimResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [retryingGemini, setRetryingGemini] = useState(false);
  const { data: brand } = useBrandSettings();

  const brandName = brand?.brand_name || "Sua Marca";

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResults(null);
    setLastQuery(query);

    try {
      const { data, error } = await supabase.functions.invoke("simulate-ai", {
        body: { prompt: query, brandName, mode: "simulator" },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResults(data.results);
    } catch (e: any) {
      console.error("Simulador error:", e);
      toast({ title: "Erro ao simular", description: e.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRetryGemini = async () => {
    if (!lastQuery.trim() || retryingGemini) return;
    setRetryingGemini(true);
    try {
      const { data, error } = await supabase.functions.invoke("simulate-ai", {
        body: { prompt: lastQuery, brandName, mode: "simulator" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const fresh: SimResult | undefined = (data.results || []).find(
        (r: SimResult) => r.model === "Gemini Search",
      );
      if (!fresh) throw new Error("Gemini Search ausente na resposta");

      setResults((prev) =>
        prev ? prev.map((r) => (r.model === "Gemini Search" ? fresh : r)) : prev,
      );

      if (!fresh.citations || fresh.citations.length === 0) {
        toast({
          title: "Sem fontes novamente",
          description: "O Gemini 2.5 ainda não retornou grounding para esta pergunta.",
        });
      } else {
        toast({
          title: "Fontes atualizadas",
          description: `${fresh.citations.length} fonte(s) retornada(s) pelo Gemini 2.5.`,
        });
      }
    } catch (e: any) {
      console.error("Retry Gemini error:", e);
      toast({ title: "Erro ao tentar novamente", description: e.message || "Tente em alguns segundos.", variant: "destructive" });
    } finally {
      setRetryingGemini(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold font-display text-foreground flex items-center">Simulador de Influência em IA <InfoTooltip text="Simule perguntas reais e veja se as IAs recomendam sua marca. Ideal para testar narrativas antes de lançar campanhas e ajustar seu posicionamento." /></h1>
        <p className="text-muted-foreground mt-1">Teste como os modelos de IA respondem sobre sua marca.</p>
      </motion.div>

      <Card>
        <CardContent className="p-5">
          <div className="flex gap-2">
            <Input
              placeholder="Digite uma pergunta, ex: Qual a melhor ferramenta de marketing?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading || !query.trim()} className="bg-primary text-primary-foreground">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              {loading ? "Buscando..." : "Simular"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {results && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map((r) => (
            <Card key={r.model} className={r.error ? "border-l-4 border-l-yellow-500 opacity-75" : r.mentionsBrand ? "border-l-4 border-l-emerald-500" : ""}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-base font-semibold text-foreground">{r.model}</p>
                  {r.error ? (
                    <Badge variant="outline" className="text-[10px] border-yellow-300 text-yellow-700 bg-yellow-50">
                      <AlertTriangle className="h-3 w-3 mr-1" /> {r.errorMessage || "Indisponível"}
                    </Badge>
                  ) : r.mentionsBrand ? (
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Menciona {brandName}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      <XCircle className="h-3 w-3 mr-1" /> Não menciona
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {r.error ? `Este modelo está temporariamente indisponível (${r.errorMessage}).` : `"${r.response}"`}
                </p>

                {!r.error && r.model === "Gemini Search" && (!r.citations || r.citations.length === 0) && (
                  <div className="mt-4 pt-4 border-t border-border space-y-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Search className="h-3.5 w-3.5" />
                      Gemini 2.5 não retornou fontes para esta resposta.
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRetryGemini}
                      disabled={retryingGemini}
                      className="h-8 text-xs"
                    >
                      {retryingGemini ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      {retryingGemini ? "Tentando novamente..." : "Tentar buscar fontes novamente"}
                    </Button>
                  </div>
                )}



                {!r.error && r.citations && r.citations.length > 0 && (() => {
                  const sorted = [...r.citations].sort((a, b) => {
                    const am = mentionsInSource(a, brandName) ? 0 : 1;
                    const bm = mentionsInSource(b, brandName) ? 0 : 1;
                    return am - bm;
                  });
                  const domains = new Set(sorted.map((c) => getHost(c.uri)));
                  const brandHits = sorted.filter((c) => mentionsInSource(c, brandName)).length;
                  return (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <Globe className="h-3.5 w-3.5 text-primary" />
                        <p className="text-xs font-semibold text-foreground">
                          Fontes citadas ({sorted.length})
                        </p>
                        <Badge variant="outline" className="text-[9px] ml-1 border-primary/30 text-primary bg-primary/5">
                          Grounding em tempo real
                        </Badge>
                        <Badge variant="outline" className="text-[9px] border-border text-muted-foreground">
                          {domains.size} {domains.size === 1 ? "domínio" : "domínios"}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mb-3">
                        Páginas que o Gemini 2.5 consultou em tempo real para responder.
                        {brandHits > 0 && (
                          <span className="ml-1 text-emerald-700 font-medium">
                            {brandHits} de {sorted.length} mencionam {brandName}.
                          </span>
                        )}
                      </p>
                      <ul className="space-y-2">
                        {sorted.map((c, i) => {
                          const host = getHost(c.uri);
                          const mentions = mentionsInSource(c, brandName);
                          return (
                            <li
                              key={`${c.uri}-${i}`}
                              className="group flex items-start gap-2.5 p-2 rounded-md border border-border bg-background hover:bg-secondary/40 hover:border-primary/20 transition-colors"
                            >
                              <span className="text-[10px] font-mono text-muted-foreground mt-1 shrink-0 w-5 text-right">
                                [{i + 1}]
                              </span>
                              <img
                                src={`https://www.google.com/s2/favicons?domain=${host}&sz=32`}
                                alt=""
                                width={16}
                                height={16}
                                className="mt-0.5 shrink-0 rounded-sm"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = "none";
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <a
                                    href={c.uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-medium text-foreground hover:text-primary line-clamp-2 leading-snug"
                                    title={c.uri}
                                  >
                                    {c.title}
                                  </a>
                                  <a
                                    href={c.uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="Abrir fonte"
                                    className="shrink-0 text-muted-foreground hover:text-primary opacity-60 group-hover:opacity-100 transition-opacity"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <span className="text-[10px] text-muted-foreground truncate">{host}</span>
                                  {mentions && (
                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[9px] px-1.5 py-0">
                                      <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Menciona {brandName}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-busy="true" aria-live="polite">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-11/12" />
                <Skeleton className="h-3 w-9/12" />
                {i === 3 && (
                  <div className="pt-3 mt-3 border-t border-border space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-3 rounded-full" />
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-4 w-24 rounded-full" />
                    </div>
                    <Skeleton className="h-10 w-full rounded-md" />
                    <Skeleton className="h-10 w-full rounded-md" />
                    <Skeleton className="h-10 w-5/6 rounded-md" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!results && !loading && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">Digite uma pergunta para ver como as IAs respondem</p>
          <p className="text-sm mt-1">Descubra se sua marca está sendo recomendada</p>
        </div>
      )}
    </div>
  );
}
