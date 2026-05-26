import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Download, Copy, Plus, Trash2, FileSearch, ArrowRight, Info, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { DeployGuideSection } from "./DeployGuideSection";
import { DeployValidator } from "./DeployValidator";

interface PageRow { title: string; url: string; description: string; }
interface SectionRow { name: string; description: string; }

interface FormState {
  brandName: string;
  description: string;
  positioning: string;
  language: "pt-BR" | "en" | "es";
  pages: PageRow[];
  sections: SectionRow[];
}

interface Props {
  initialUrl: string;
  onUrlChange: (url: string) => void;
  onGoToMonitoramento: () => void;
}

const LANG_LABEL: Record<FormState["language"], string> = {
  "pt-BR": "Português",
  en: "English",
  es: "Espanhol",
};

function buildMarkdown(s: FormState): string {
  const lines: string[] = [];
  lines.push(`# ${s.brandName || "Sua Marca"}`);
  lines.push("");
  if (s.description) {
    lines.push(`> ${s.description.trim()}`);
    lines.push("");
  }
  if (s.positioning) {
    lines.push("## Sobre a marca");
    lines.push("");
    lines.push(s.positioning.trim());
    lines.push("");
  }
  const validPages = s.pages.filter((p) => p.title && p.url);
  if (validPages.length) {
    lines.push("## Páginas principais");
    lines.push("");
    for (const p of validPages) {
      const desc = p.description ? `: ${p.description.trim()}` : "";
      lines.push(`- [${p.title.trim()}](${p.url.trim()})${desc}`);
    }
    lines.push("");
  }
  const validSections = s.sections.filter((sec) => sec.name);
  if (validSections.length) {
    lines.push("## Seções do site");
    lines.push("");
    for (const sec of validSections) {
      const desc = sec.description ? `: ${sec.description.trim()}` : "";
      lines.push(`- **${sec.name.trim()}**${desc}`);
    }
    lines.push("");
  }
  lines.push("---");
  lines.push(`Idioma principal: ${LANG_LABEL[s.language]}`);
  lines.push(`Gerado por Ivero · ${new Date().toLocaleDateString("pt-BR")}`);
  return lines.join("\n");
}

function emptyForm(): FormState {
  return {
    brandName: "",
    description: "",
    positioning: "",
    language: "pt-BR",
    pages: [{ title: "", url: "", description: "" }],
    sections: [{ name: "", description: "" }],
  };
}

export function GeradorTab({ initialUrl, onUrlChange, onGoToMonitoramento }: Props) {
  const [url, setUrl] = useState(initialUrl);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [form, setForm] = useState<FormState | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(initialUrl);
  }, [initialUrl]);

  const markdown = useMemo(() => (form ? buildMarkdown(form) : ""), [form]);

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (trimmed.length < 4) {
      toast.error("Informe uma URL válida.");
      return;
    }
    onUrlChange(trimmed);
    setLoading(true);
    setProgress(8);
    const interval = setInterval(() => {
      setProgress((p) => (p < 90 ? p + Math.random() * 6 : p));
    }, 700);

    try {
      const { data, error } = await supabase.functions.invoke<{
        origin: string;
        brandName: string;
        description: string;
        brandPositioning: string;
        language: string;
        mainPages: Array<{ title: string; url: string; description: string }>;
        sections: Array<{ name: string; description: string }>;
      }>("generate-llms-txt", { body: { url: trimmed } });
      if (error) throw error;
      if (!data) throw new Error("Resposta vazia do servidor.");

      const lang = (["pt-BR", "en", "es"].includes(data.language) ? data.language : "pt-BR") as FormState["language"];
      setForm({
        brandName: data.brandName || "",
        description: data.description || "",
        positioning: data.brandPositioning || "",
        language: lang,
        pages: data.mainPages?.length ? data.mainPages : [{ title: "", url: "", description: "" }],
        sections: data.sections?.length ? data.sections : [{ name: "", description: "" }],
      });
      setProgress(100);
      toast.success("Conteúdo extraído com sucesso.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao extrair conteúdo.";
      toast.error(msg);
    } finally {
      clearInterval(interval);
      setTimeout(() => setLoading(false), 250);
    }
  };

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const updatePage = (idx: number, patch: Partial<PageRow>) => {
    setForm((prev) => prev ? { ...prev, pages: prev.pages.map((p, i) => i === idx ? { ...p, ...patch } : p) } : prev);
  };
  const addPage = () => setForm((prev) => prev ? { ...prev, pages: [...prev.pages, { title: "", url: "", description: "" }] } : prev);
  const removePage = (idx: number) => setForm((prev) => prev ? { ...prev, pages: prev.pages.filter((_, i) => i !== idx) } : prev);

  const updateSection = (idx: number, patch: Partial<SectionRow>) => {
    setForm((prev) => prev ? { ...prev, sections: prev.sections.map((s, i) => i === idx ? { ...s, ...patch } : s) } : prev);
  };
  const addSection = () => setForm((prev) => prev ? { ...prev, sections: [...prev.sections, { name: "", description: "" }] } : prev);
  const removeSection = (idx: number) => setForm((prev) => prev ? { ...prev, sections: prev.sections.filter((_, i) => i !== idx) } : prev);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      toast.success("Markdown copiado.");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "llms.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast.success("Download iniciado.");
  };

  const startBlank = () => setForm(emptyForm());

  // Step 1: URL extraction
  if (!form) {
    return (
      <div className="space-y-4">
        <Card className="p-5">
          <form onSubmit={handleExtract} className="space-y-3">
            <Label htmlFor="gen-url" className="text-sm font-medium">URL do seu site</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                id="gen-url"
                type="url"
                placeholder="https://seusite.com.br"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="h-11 rounded-lg flex-1"
                disabled={loading}
                required
              />
              <Button type="submit" disabled={loading} className="h-11 px-5 rounded-lg">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Extraindo conteúdo...
                  </>
                ) : (
                  <>
                    <FileSearch className="h-4 w-4 mr-2" />
                    Extrair conteúdo do site
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              A Ivero faz scraping do seu site e preenche o editor abaixo com nome, descrição, páginas e seções.
            </p>
            {loading && (
              <div className="pt-2 space-y-1.5">
                <Progress value={progress} className="h-1.5" />
                <p className="text-[11px] text-muted-foreground">Isso pode levar até 30 segundos</p>
              </div>
            )}
          </form>
        </Card>
        <div className="text-center">
          <button
            type="button"
            onClick={startBlank}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            ou começar com um arquivo em branco
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-medium text-foreground">Revise e edite seu LLMs.txt antes de baixar</h2>
        <p className="text-sm text-muted-foreground mt-1">
          O conteúdo abaixo foi gerado automaticamente com base no seu site. Você pode editar qualquer campo antes de fazer o download.
        </p>
      </div>

      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* LEFT — editor */}
        <Card className="p-5 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="brand">Nome da marca / empresa</Label>
            <Input id="brand" value={form.brandName} onChange={(e) => updateForm("brandName", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">Descrição da empresa</Label>
            <Textarea id="desc" rows={3} value={form.description} onChange={(e) => updateForm("description", e.target.value)} />
          </div>

          {/* Páginas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Páginas principais</Label>
              <Button type="button" size="sm" variant="ghost" onClick={addPage} className="h-7 px-2 text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {form.pages.map((p, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-start">
                  <Input
                    placeholder="Título"
                    value={p.title}
                    onChange={(e) => updatePage(i, { title: e.target.value })}
                    className="col-span-4 h-9 text-sm"
                  />
                  <Input
                    placeholder="https://..."
                    value={p.url}
                    onChange={(e) => updatePage(i, { url: e.target.value })}
                    className="col-span-4 h-9 text-sm"
                  />
                  <Input
                    placeholder="Descrição"
                    value={p.description}
                    onChange={(e) => updatePage(i, { description: e.target.value })}
                    className="col-span-3 h-9 text-sm"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removePage(i)}
                    className="col-span-1 h-9 w-9 text-muted-foreground hover:text-red-600"
                    disabled={form.pages.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Seções */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Seções do site</Label>
              <Button type="button" size="sm" variant="ghost" onClick={addSection} className="h-7 px-2 text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {form.sections.map((s, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-start">
                  <Input
                    placeholder="Nome da seção"
                    value={s.name}
                    onChange={(e) => updateSection(i, { name: e.target.value })}
                    className="col-span-4 h-9 text-sm"
                  />
                  <Input
                    placeholder="Descrição (1 linha)"
                    value={s.description}
                    onChange={(e) => updateSection(i, { description: e.target.value })}
                    className="col-span-7 h-9 text-sm"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeSection(i)}
                    className="col-span-1 h-9 w-9 text-muted-foreground hover:text-red-600"
                    disabled={form.sections.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pos">O que as IAs devem saber sobre sua marca</Label>
            <Textarea id="pos" rows={4} value={form.positioning} onChange={(e) => updateForm("positioning", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lang">Idioma principal do conteúdo</Label>
            <Select value={form.language} onValueChange={(v) => updateForm("language", v as FormState["language"])}>
              <SelectTrigger id="lang" className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pt-BR">Português</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Espanhol</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* RIGHT — preview */}
        <Card className="p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-medium">Preview do arquivo gerado</Label>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              className="h-8 px-2 text-xs"
              aria-label="Copiar markdown"
            >
              {copied ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
          <div className="flex-1 bg-muted/40 border border-border rounded-md overflow-hidden">
            <pre className="text-xs font-mono leading-relaxed p-4 overflow-auto max-h-[640px] whitespace-pre-wrap text-foreground/90">
              {markdown}
            </pre>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Nome do arquivo: <code className="font-mono">llms.txt</code> · Atualiza em tempo real conforme você edita.
          </p>
        </Card>
      </motion.div>

      {/* Actions */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleDownload} className="h-10 px-5 bg-primary hover:bg-primary/90 text-primary-foreground">
              <Download className="h-4 w-4 mr-2" /> Baixar llms.txt
            </Button>
            <Button onClick={handleCopy} variant="outline" className="h-10 px-5">
              <Copy className="h-4 w-4 mr-2" /> Copiar conteúdo
            </Button>
          </div>
          <button
            type="button"
            onClick={onGoToMonitoramento}
            className="text-sm text-primary hover:underline inline-flex items-center gap-1 self-start sm:self-auto"
          >
            Ativar monitoramento para este arquivo <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </Card>

      {/* Instruction banner */}
      <div className={cn("rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-start gap-3")}>
        <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
        <p className="text-sm text-foreground">
          <span className="font-medium">Como usar:</span> faça o upload do arquivo <code className="font-mono text-xs bg-background px-1.5 py-0.5 rounded border">llms.txt</code> para a pasta raiz do seu domínio (ex.: <code className="font-mono text-xs bg-background px-1.5 py-0.5 rounded border">seusite.com/llms.txt</code>). O arquivo ficará acessível publicamente para que os modelos de IA possam lê-lo ao rastrear seu site.
        </p>
      </div>
    </div>
  );
}
