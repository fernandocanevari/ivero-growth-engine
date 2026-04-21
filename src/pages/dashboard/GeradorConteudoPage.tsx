import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { marked } from "marked";
import {
  PenLine,
  Sparkles,
  Copy,
  Download,
  FileText,
  Trash2,
  Loader2,
  CheckCircle2,
  History,
  Lock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { useGenerateContent } from "@/hooks/useGenerateContent";
import {
  useContentHistory,
  useDeleteGeneratedContent,
  type GeneratedContentRow,
} from "@/hooks/useContentHistory";
import { useGenerationQuota } from "@/hooks/useGenerationQuota";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { useAnalysisHistory } from "@/hooks/useAnalysisHistory";
import { UpgradeModal } from "@/components/dashboard/UpgradeModal";
import {
  exportAsMarkdown,
  exportAsDocx,
  copyToClipboard,
} from "@/lib/content-export";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const TONES = [
  { value: "executivo", label: "Executivo" },
  { value: "tecnico", label: "Técnico" },
  { value: "didatico", label: "Didático" },
  { value: "jornalistico", label: "Jornalístico" },
];

interface PillarInfo {
  name: string;
  score: number;
  weak: boolean;
}

export default function GeradorConteudoPage() {
  const { data: brand } = useBrandSettings();
  const { data: history } = useAnalysisHistory();
  const quota = useGenerationQuota();
  const { data: contentHistory, isLoading: historyLoading } = useContentHistory();
  const generate = useGenerateContent();
  const deleteContent = useDeleteGeneratedContent();

  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("executivo");
  const [formats, setFormats] = useState<string[]>(["article", "faq", "summary"]);
  const [contextSelections, setContextSelections] = useState<Record<string, boolean>>({});
  const [activeContent, setActiveContent] = useState<GeneratedContentRow | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const pillars = useMemo<PillarInfo[]>(() => {
    const last = history?.[0];
    if (!last) return [];
    return [
      { name: "Clareza", score: last.clarity_score, weak: last.clarity_score < 60 },
      { name: "Autoridade", score: last.authority_score, weak: last.authority_score < 60 },
      { name: "Posicionamento", score: last.positioning_score, weak: last.positioning_score < 60 },
      { name: "Conversão", score: last.conversion_score, weak: last.conversion_score < 60 },
      { name: "Relevância", score: last.experience_score, weak: last.experience_score < 60 },
    ];
  }, [history]);

  const contextItems = useMemo(() => {
    const items: { key: string; label: string; defaultOn: boolean }[] = [];
    pillars
      .filter((p) => p.weak)
      .forEach((p) =>
        items.push({
          key: `weak:${p.name}`,
          label: `Pilar fraco: ${p.name} (${p.score})`,
          defaultOn: true,
        }),
      );
    if (brand?.main_competitor) {
      items.push({
        key: "competitor",
        label: `Concorrente: ${brand.main_competitor}`,
        defaultOn: true,
      });
    }
    if (brand?.sector) {
      items.push({
        key: "sector",
        label: `Setor: ${brand.sector}`,
        defaultOn: true,
      });
    }
    return items;
  }, [pillars, brand]);

  const isContextChecked = (key: string) => {
    if (key in contextSelections) return contextSelections[key];
    return contextItems.find((c) => c.key === key)?.defaultOn ?? false;
  };

  const toggleFormat = (f: string) => {
    setFormats((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f],
    );
  };

  const buildContextPayload = () => {
    const ctx: any = {};
    if (brand?.brand_name) ctx.brandName = brand.brand_name;
    if (isContextChecked("sector") && brand?.sector) ctx.sector = brand.sector;
    if (isContextChecked("competitor") && brand?.main_competitor)
      ctx.mainCompetitor = brand.main_competitor;
    const weak = pillars
      .filter((p) => p.weak && isContextChecked(`weak:${p.name}`))
      .map((p) => ({ name: p.name, score: p.score }));
    if (weak.length) ctx.weakPillars = weak;
    const strong = pillars.filter((p) => p.score >= 75).map((p) => ({ name: p.name, score: p.score }));
    if (strong.length) ctx.strongPillars = strong;
    return ctx;
  };

  const handleGenerate = async () => {
    if (topic.trim().length < 3) {
      toast({
        title: "Tema muito curto",
        description: "Descreva o tema com pelo menos 3 caracteres.",
        variant: "destructive",
      });
      return;
    }
    if (formats.length === 0) {
      toast({ title: "Selecione ao menos um formato.", variant: "destructive" });
      return;
    }
    if (quota.exhausted) {
      track("content_generation_blocked_by_quota", {
        used: quota.used,
        limit: quota.limit,
      });
      setUpgradeOpen(true);
      return;
    }
    const result = await generate.mutateAsync({
      topic: topic.trim(),
      tone,
      formats,
      context: buildContextPayload(),
    });
    setActiveContent(result);
  };

  const onCopy = async (text: string, label: string) => {
    const ok = await copyToClipboard(text);
    track("content_export", { format: "clipboard", section: label });
    toast({ title: ok ? `${label} copiado` : "Falha ao copiar" });
  };

  const onExportMd = (c: GeneratedContentRow) => {
    track("content_export", { format: "md" });
    exportAsMarkdown({
      topic: c.topic,
      article_md: c.article_md,
      faq: c.faq_json ?? [],
      summary_md: c.summary_md,
    });
  };

  const onExportDocx = async (c: GeneratedContentRow) => {
    track("content_export", { format: "docx" });
    await exportAsDocx({
      topic: c.topic,
      article_md: c.article_md,
      faq: c.faq_json ?? [],
      summary_md: c.summary_md,
    });
  };

  const renderMarkdown = (md: string) => ({
    __html: marked.parse(md || "*Vazio*", { async: false }) as string,
  });

  const faqMd = (faq: { question: string; answer: string }[]) =>
    faq.map((q) => `### ${q.question}\n\n${q.answer}`).join("\n\n");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <PenLine className="h-7 w-7 text-primary" />
            Gerador de Conteúdo Estratégico
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Crie artigos, FAQs e resumos otimizados para serem citados pelas IAs —
            ajustados ao diagnóstico da sua marca.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {quota.unlimited ? (
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" /> Ilimitado
            </Badge>
          ) : (
            <Badge
              variant={quota.exhausted ? "destructive" : "secondary"}
              className="gap-1"
            >
              {quota.exhausted ? <Lock className="h-3 w-3" /> : null}
              {quota.used}/{quota.limit} no trial
            </Badge>
          )}
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr,1fr] gap-6">
            {/* Left column — form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="topic" className="text-sm font-semibold">Tema</Label>
                <Textarea
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Sobre o que devemos escrever? Ex: Como escolher um CRM para pequenas empresas"
                  rows={3}
                  className="mt-1.5"
                  maxLength={500}
                />
                <p className="text-[11px] text-muted-foreground mt-1">{topic.length}/500</p>
              </div>

              <div>
                <Label className="text-sm font-semibold">Formato</Label>
                <div className="flex flex-wrap gap-3 mt-1.5">
                  {[
                    { id: "article", label: "Artigo" },
                    { id: "faq", label: "FAQ" },
                    { id: "summary", label: "Resumo" },
                  ].map((f) => (
                    <label
                      key={f.id}
                      className="flex items-center gap-2 cursor-pointer text-sm"
                    >
                      <Checkbox
                        checked={formats.includes(f.id)}
                        onCheckedChange={() => toggleFormat(f.id)}
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="tone" className="text-sm font-semibold">Tom</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger id="tone" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={generate.isPending}
                className="w-full sm:w-auto gap-2"
                size="lg"
              >
                {generate.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Gerando...
                  </>
                ) : quota.exhausted ? (
                  <>
                    <Lock className="h-4 w-4" /> Liberar mais gerações
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Gerar Conteúdo
                  </>
                )}
              </Button>
              {quota.exhausted && (
                <p className="text-xs text-muted-foreground">
                  Você atingiu o limite de {quota.limit} gerações do trial. Faça upgrade para continuar.
                </p>
              )}
            </div>

            {/* Right column — context */}
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Contexto do diagnóstico
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Marque o que deve influenciar o conteúdo. Ajuda a IA a fechar lacunas reais.
              </p>
              <div className="mt-3 space-y-2">
                {contextItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    Rode um diagnóstico e configure sua marca para liberar contexto avançado.
                  </p>
                ) : (
                  contextItems.map((item) => (
                    <label
                      key={item.key}
                      className="flex items-start gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={isContextChecked(item.key)}
                        onCheckedChange={(v) =>
                          setContextSelections((prev) => ({ ...prev, [item.key]: !!v }))
                        }
                        className="mt-0.5"
                      />
                      <span className="leading-snug">{item.label}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Result */}
      {activeContent && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-display flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {activeContent.topic}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Gerado com {activeContent.model_used} · {new Date(activeContent.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onExportMd(activeContent)}>
                    <Download className="h-3.5 w-3.5" /> .md
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onExportDocx(activeContent)}>
                    <FileText className="h-3.5 w-3.5" /> .docx
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="article">
                <TabsList>
                  <TabsTrigger value="article">Artigo</TabsTrigger>
                  <TabsTrigger value="faq">FAQ</TabsTrigger>
                  <TabsTrigger value="summary">Resumo</TabsTrigger>
                </TabsList>

                <TabsContent value="article" className="mt-4 space-y-3">
                  <div className="flex justify-end">
                    <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => onCopy(activeContent.article_md, "Artigo")}>
                      <Copy className="h-3.5 w-3.5" /> Copiar
                    </Button>
                  </div>
                  <article
                    className="prose prose-sm max-w-none prose-headings:font-display prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground"
                    dangerouslySetInnerHTML={renderMarkdown(activeContent.article_md)}
                  />
                </TabsContent>

                <TabsContent value="faq" className="mt-4 space-y-3">
                  <div className="flex justify-end">
                    <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => onCopy(faqMd(activeContent.faq_json ?? []), "FAQ")}>
                      <Copy className="h-3.5 w-3.5" /> Copiar
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {(activeContent.faq_json ?? []).map((q, i) => (
                      <div key={i} className="rounded-lg border border-border p-4">
                        <p className="font-semibold text-sm text-foreground">{q.question}</p>
                        <p className="text-sm text-foreground/80 mt-1.5 leading-relaxed">{q.answer}</p>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="summary" className="mt-4 space-y-3">
                  <div className="flex justify-end">
                    <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => onCopy(activeContent.summary_md, "Resumo")}>
                      <Copy className="h-3.5 w-3.5" /> Copiar
                    </Button>
                  </div>
                  <article
                    className="prose prose-sm max-w-none prose-headings:font-display prose-headings:text-foreground prose-p:text-foreground/90"
                    dangerouslySetInnerHTML={renderMarkdown(activeContent.summary_md)}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <History className="h-4 w-4" /> Histórico ({contentHistory?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : !contentHistory || contentHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Nenhum conteúdo gerado ainda.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {contentHistory.map((c) => (
                <li
                  key={c.id}
                  className={cn(
                    "py-3 flex items-center justify-between gap-3",
                    activeContent?.id === c.id && "bg-primary/[0.03] -mx-2 px-2 rounded",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{c.topic}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleString("pt-BR")} · {c.formats.join(", ")}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => setActiveContent(c)}>
                      Abrir
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (activeContent?.id === c.id) setActiveContent(null);
                        deleteContent.mutate(c.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  );
}
