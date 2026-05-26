import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, AlertTriangle, Loader2, ExternalLink, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  defaultUrl?: string;
  expectedMarkdown?: string;
}

type Status = "idle" | "loading" | "success" | "warning" | "error";

interface CheckResult {
  label: string;
  ok: boolean;
  detail?: string;
}

function normalizeToLlmsTxt(input: string): string {
  let url = input.trim();
  if (!url) return url;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    const u = new URL(url);
    if (!u.pathname || u.pathname === "/" || !u.pathname.toLowerCase().endsWith("/llms.txt")) {
      u.pathname = "/llms.txt";
    }
    return u.toString();
  } catch {
    return url;
  }
}

function extractBrandName(md: string): string | null {
  const line = md.split("\n").find((l) => l.startsWith("# "));
  return line ? line.replace(/^#\s+/, "").trim() : null;
}

export function DeployValidator({ defaultUrl = "", expectedMarkdown = "" }: Props) {
  const [url, setUrl] = useState(() => (defaultUrl ? normalizeToLlmsTxt(defaultUrl) : ""));
  const [status, setStatus] = useState<Status>("idle");
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (defaultUrl && !url) setUrl(normalizeToLlmsTxt(defaultUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultUrl]);

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = normalizeToLlmsTxt(url);
    if (!target) return;
    setUrl(target);
    setStatus("loading");
    setChecks([]);
    setErrorMessage("");

    try {
      const res = await fetch(target, { method: "GET", redirect: "follow" });
      if (!res.ok) {
        setStatus("error");
        if (res.status === 404) {
          setErrorMessage("Arquivo não encontrado (404). Confirme que está em /llms.txt na raiz do domínio.");
        } else if (res.status >= 500) {
          setErrorMessage(`Servidor respondeu com erro ${res.status}. Tente novamente em alguns minutos.`);
        } else {
          setErrorMessage(`Servidor respondeu com status ${res.status}.`);
        }
        return;
      }

      const contentType = res.headers.get("content-type") || "";
      const body = await res.text();
      const expectedBrand = extractBrandName(expectedMarkdown);
      const hasH1 = body.split("\n").some((l) => l.startsWith("# "));
      const hasBrand = expectedBrand
        ? body.toLowerCase().includes(expectedBrand.toLowerCase())
        : true;

      const results: CheckResult[] = [
        { label: "Arquivo acessível (HTTP 200)", ok: true },
        {
          label: "Content-Type adequado (text/*)",
          ok: contentType.startsWith("text/"),
          detail: contentType ? `Recebido: ${contentType}` : "Cabeçalho ausente",
        },
        {
          label: "Conteúdo não vazio (≥ 50 bytes)",
          ok: body.trim().length >= 50,
          detail: `${body.length} bytes`,
        },
        { label: "Possui H1 (linha iniciando com #)", ok: hasH1 },
        {
          label: expectedBrand ? `Contém o nome da marca: "${expectedBrand}"` : "Nome da marca presente",
          ok: hasBrand,
          detail: !hasBrand ? "O nome da marca esperado não foi encontrado no arquivo remoto." : undefined,
        },
      ];

      setChecks(results);
      setStatus(results.every((c) => c.ok) ? "success" : "warning");
    } catch (err) {
      setStatus("error");
      if (err instanceof TypeError) {
        setErrorMessage(
          "Não foi possível acessar o arquivo. Causa provável: CORS bloqueado pelo servidor ou arquivo inexistente. Abra a URL diretamente no navegador para confirmar."
        );
      } else {
        setErrorMessage(err instanceof Error ? err.message : "Erro desconhecido ao validar.");
      }
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-start gap-2.5 mb-4">
        <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
        <div>
          <h3 className="text-base font-medium text-foreground">Validar instalação</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Depois de subir o arquivo, cole a URL pública abaixo para verificar se está acessível e correto.
          </p>
        </div>
      </div>

      <form onSubmit={handleValidate} className="space-y-2">
        <Label htmlFor="validator-url" className="text-sm font-medium">URL do llms.txt publicado</Label>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            id="validator-url"
            type="url"
            placeholder="https://seudominio.com/llms.txt"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="h-11 rounded-lg flex-1"
            disabled={status === "loading"}
            required
          />
          <Button type="submit" disabled={status === "loading"} className="h-11 px-5 rounded-lg">
            {status === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Validando...
              </>
            ) : (
              "Validar agora"
            )}
          </Button>
        </div>
      </form>

      {status === "success" && (
        <ResultBlock
          tone="success"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          title="llms.txt acessível e válido"
          subtitle="Todos os checks passaram. As IAs já conseguem encontrar e ler seu arquivo."
          checks={checks}
          url={url}
        />
      )}

      {status === "warning" && (
        <ResultBlock
          tone="warning"
          icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
          title="Arquivo acessível, mas com avisos"
          subtitle="O arquivo está público, porém alguns itens precisam de atenção:"
          checks={checks}
          url={url}
        />
      )}

      {status === "error" && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-red-900">Não foi possível validar</p>
            <p className="text-red-800 mt-1 leading-relaxed">{errorMessage}</p>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-red-700 hover:underline"
              >
                Abrir URL no navegador <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function ResultBlock({
  tone,
  icon,
  title,
  subtitle,
  checks,
  url,
}: {
  tone: "success" | "warning";
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  checks: CheckResult[];
  url: string;
}) {
  const toneClasses =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50"
      : "border-amber-200 bg-amber-50";
  const titleColor = tone === "success" ? "text-emerald-900" : "text-amber-900";
  const subColor = tone === "success" ? "text-emerald-800" : "text-amber-800";

  return (
    <div className={cn("mt-4 rounded-lg border p-4", toneClasses)}>
      <div className="flex items-start gap-3">
        {icon}
        <div className="flex-1">
          <p className={cn("font-medium", titleColor)}>{title}</p>
          <p className={cn("text-sm mt-1", subColor)}>{subtitle}</p>

          <ul className="mt-3 space-y-1.5">
            {checks.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                {c.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                )}
                <span className="text-foreground/90">
                  {c.label}
                  {c.detail && <span className="text-muted-foreground"> — {c.detail}</span>}
                </span>
              </li>
            ))}
          </ul>

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-3 text-sm text-primary hover:underline"
          >
            Abrir arquivo no navegador <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
