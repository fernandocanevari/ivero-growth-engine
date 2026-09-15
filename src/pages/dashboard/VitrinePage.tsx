import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { InfoTooltip } from "@/components/InfoTooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ShoppingBag,
  Play,
  Trash2,
  Plus,
  ExternalLink,
  Info,
  Loader2,
  Store,
  Link2Off,
} from "lucide-react";
import {
  useVitrineQueries,
  useVitrineRuns,
  useVitrineCitations,
  useCreateVitrineQuery,
  useDeleteVitrineQuery,
  useRunVitrineQuery,
  computeFrequency,
  computeBrandTrend,
  computeEngineHealth,
  ENGINE_LABEL,
  MIN_RUNS_FOR_FREQUENCY,
  type VitrineEngine,
  type DomainFrequency,
} from "@/hooks/useVitrine";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useAuditReports } from "@/hooks/useAuditReports";
import { vitrineQuotaFor } from "@/lib/vitrine-quota";
import { buildVitrineSuggestions } from "@/lib/vitrine-suggestions";
import { cn } from "@/lib/utils";

const TIPO_LABEL: Record<string, string> = {
  loja: "Loja",
  marketplace: "Marketplace",
  review: "Review/Blog",
  outro: "Outro",
};

function pct(v: number) {
  return `${Math.round(v * 100)}%`;
}

export default function VitrinePage() {
  const { data: brand } = useBrandSettings();
  const { isAdmin, isTrial, plano } = useSubscriptionStatus();
  const { reports = [] } = useAuditReports() as unknown as { reports?: Array<{ keyword_cloud?: unknown }> };
  const { data: queries = [], isLoading: loadingQueries } = useVitrineQueries();
  const { data: runs = [] } = useVitrineRuns();
  const { data: citations = [] } = useVitrineCitations();
  const createQuery = useCreateVitrineQuery();
  const deleteQuery = useDeleteVitrineQuery();
  const runQuery = useRunVitrineQuery();

  const [novaPergunta, setNovaPergunta] = useState("");
  const [engineFiltro, setEngineFiltro] = useState<VitrineEngine | "todos">("todos");
  const [queryFiltro, setQueryFiltro] = useState<string>("todas");
  const [rodando, setRodando] = useState<string | null>(null);

  const { quota } = useMemo(
    () => vitrineQuotaFor({ isAdmin, isTrial, plano }),
    [isAdmin, isTrial, plano],
  );
  const maxPerguntas = quota.maxPerguntas;

  const { totalRuns, ranking } = useMemo(
    () => computeFrequency(runs, citations, { engine: engineFiltro, queryId: queryFiltro }),
    [runs, citations, engineFiltro, queryFiltro],
  );

  // Ranking de LOJAS em primeiro plano; conteúdo editorial em bloco separado,
  // para o ranking não ser poluído por blog e comparativo.
  const lojas = useMemo<DomainFrequency[]>(
    () => ranking.filter((r) => r.tipo_fonte === "loja" || r.tipo_fonte === "marketplace"),
    [ranking],
  );
  const conteudos = useMemo<DomainFrequency[]>(
    () => ranking.filter((r) => r.tipo_fonte === "review" || r.tipo_fonte === "outro"),
    [ranking],
  );

  const trend = useMemo(() => computeBrandTrend(runs), [runs]);
  const engineHealth = useMemo(() => computeEngineHealth(runs), [runs]);

  const keywords = useMemo(() => {
    const cloud = reports?.[0]?.keyword_cloud;
    if (!Array.isArray(cloud)) return [];
    return cloud
      .map((k) => (typeof k === "object" && k && "term" in k ? String((k as { term: string }).term) : ""))
      .filter(Boolean)
      .slice(0, 6);
  }, [reports]);

  const sugestoes = useMemo(
    () =>
      buildVitrineSuggestions({
        sector: brand?.sector,
        brandName: brand?.brand_name,
        keywords,
        regiao:
          brand?.coverage_type === "regional" && brand?.coverage_city
            ? `${brand.coverage_city}${brand.coverage_state ? `/${brand.coverage_state}` : ""}`
            : null,
        jaCadastradas: queries.map((q) => q.pergunta),
        limite: 4,
      }),
    [brand, keywords, queries],
  );

  const marcaNoRanking = ranking.find((r) => r.is_marca_do_cliente);
  const posicaoMarca = marcaNoRanking ? ranking.indexOf(marcaNoRanking) + 1 : null;
  const custoTotal = runs.reduce((acc, r) => acc + Number(r.custo_usd || 0), 0);
  const poucasRodadas = totalRuns < MIN_RUNS_FOR_FREQUENCY;
  const rodadas30d = runs.filter(
    (r) => new Date(r.executado_em).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).length;

  const handleRun = async (id: string) => {
    setRodando(id);
    try {
      await runQuery.mutateAsync(id);
    } finally {
      setRodando(null);
    }
  };

  const renderLinha = (r: DomainFrequency) => (
    <li
      key={r.dominio}
      className={cn(
        "rounded-md border p-3",
        r.is_marca_do_cliente ? "border-primary/40 bg-primary/[0.04]" : "border-border",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-foreground">{r.loja_nome}</span>
        <span className="text-xs text-muted-foreground">{r.dominio}</span>
        <Badge variant="secondary" className="text-[10px]">
          {TIPO_LABEL[r.tipo_fonte] ?? r.tipo_fonte}
        </Badge>
        {r.is_marca_do_cliente && (
          <Badge className="text-[10px] bg-primary text-primary-foreground">Sua marca</Badge>
        )}
        <span className="ml-auto text-sm font-semibold text-foreground">
          {poucasRodadas
            ? `${r.rodadas_com_citacao} de ${r.total_rodadas}`
            : `${pct(r.taxa)} · ${r.rodadas_com_citacao} de ${r.total_rodadas}`}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
        <div
          className="h-1.5 rounded-full bg-primary"
          style={{ width: `${Math.max(4, Math.round(r.taxa * 100))}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>{r.motores.map((m) => ENGINE_LABEL[m]).join(", ")}</span>
        {r.ultimo_produto && <span>· {r.ultimo_produto}</span>}
        {r.ultimo_preco && <span>· {r.ultimo_preco}</span>}
        {r.ultimo_url && !r.ultimo_url.includes("vertexaisearch") ? (
          <a
            href={r.ultimo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            Abrir página <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="inline-flex items-center gap-1">
            <Link2Off className="h-3 w-3" /> link mascarado pelo motor
          </span>
        )}
      </div>
    </li>
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-primary" strokeWidth={1.75} />
          <h1 className="text-2xl font-bold font-display text-foreground">Vitrine IA</h1>
          <Badge variant="outline" className="border-accent/40 text-accent text-[10px] uppercase tracking-wider">
            Beta
          </Badge>
          <InfoTooltip text="Quando um consumidor pergunta a uma IA onde comprar, quais lojas e páginas a IA cita — e com que frequência a sua marca aparece nessa lista." />
        </div>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Cadastre as perguntas de compra do seu mercado. A cada rodada consultamos {" "}
          <strong>Claude</strong>, <strong>Google Modo IA</strong> e <strong>ChatGPT</strong> com busca ao vivo,
          restrita a Brasil e português, e registramos quais lojas foram citadas.
        </p>
      </div>

      {/* Aviso honesto de amostragem */}
      {poucasRodadas && (
        <Card className="border-accent/40 bg-accent/5">
          <CardContent className="flex gap-3 p-4 text-sm">
            <Info className="h-4 w-4 shrink-0 text-accent mt-0.5" />
            <p className="text-foreground/80">
              <strong>Ainda coletando.</strong> A IA responde de forma diferente a cada consulta — uma rodada
              isolada não é medida confiável. A frequência de citação só é apresentada como número a partir de{" "}
              {MIN_RUNS_FOR_FREQUENCY} rodadas. Você tem {totalRuns} até agora.
            </p>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Rodadas registradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{totalRuns}</p>
            <p className="text-xs text-muted-foreground mt-1">{queries.length} pergunta(s) cadastrada(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Sua marca no ranking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              {posicaoMarca ? `${posicaoMarca}º` : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {marcaNoRanking
                ? `citada em ${marcaNoRanking.rodadas_com_citacao} de ${marcaNoRanking.total_rodadas} consultas`
                : brand?.website
                  ? "ainda não citada nas consultas registradas"
                  : "cadastre o site da marca em Configurações"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Custo acumulado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">US$ {custoTotal.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">consultas com busca ao vivo</p>
          </CardContent>
        </Card>
      </div>

      {/* Perguntas de compra */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Perguntas de compra</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={novaPergunta}
              onChange={(e) => setNovaPergunta(e.target.value)}
              placeholder="Ex.: melhor tênis para maratona custo-benefício"
              maxLength={300}
              disabled={queries.length >= maxPerguntas}
            />
            <Button
              onClick={() => {
                if (novaPergunta.trim().length < 3) return;
                createQuery.mutate({ pergunta: novaPergunta }, { onSuccess: () => setNovaPergunta("") });
              }}
              disabled={
                createQuery.isPending || novaPergunta.trim().length < 3 || queries.length >= maxPerguntas
              }
              className="shrink-0"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Adicionar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {queries.length} de {maxPerguntas} perguntas no seu plano · {rodadas30d} consultas nos últimos
            30 dias (teto de {quota.maxRodadasMes})
          </p>

          {loadingQueries ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : queries.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Nenhuma pergunta ainda. Comece com a pergunta que um cliente faria antes de comprar de você.
              </p>
              {sugestoes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-foreground">Sugestões para a sua marca:</p>
                  <div className="flex flex-wrap gap-2">
                    {sugestoes.map((s) => (
                      <Button
                        key={s}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        disabled={createQuery.isPending}
                        onClick={() => createQuery.mutate({ pergunta: s })}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {queries.map((q) => {
                const rodadasDaPergunta = runs.filter((r) => r.query_id === q.id).length;
                return (
                  <li key={q.id} className="flex flex-wrap items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{q.pergunta}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {q.pais} · {q.idioma}
                        {q.regiao ? ` · ${q.regiao}` : ""} · {q.frequencia} · {rodadasDaPergunta} rodada(s)
                        {q.last_run_at
                          ? ` · última em ${new Date(q.last_run_at).toLocaleDateString("pt-BR")}`
                          : " · nunca executada"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRun(q.id)}
                      disabled={rodando !== null}
                    >
                      {rodando === q.id ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Play className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Consultar agora
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteQuery.mutate(q.id)}
                      aria-label="Remover pergunta"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Ranking de lojas por frequência */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Store className="h-4 w-4 text-primary" />
            Lojas citadas por frequência
            <InfoTooltip text="Percentual de consultas em que cada loja apareceu. É a única leitura honesta: uma rodada isolada varia muito." />
          </CardTitle>
          <div className="flex gap-2">
            <Select value={engineFiltro} onValueChange={(v) => setEngineFiltro(v as VitrineEngine | "todos")}>
              <SelectTrigger className="w-[170px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os motores</SelectItem>
                <SelectItem value="claude">{ENGINE_LABEL.claude}</SelectItem>
                <SelectItem value="google_ai">{ENGINE_LABEL.google_ai}</SelectItem>
                <SelectItem value="chatgpt">{ENGINE_LABEL.chatgpt}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={queryFiltro} onValueChange={setQueryFiltro}>
              <SelectTrigger className="w-[210px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as perguntas</SelectItem>
                {queries.map((q) => (
                  <SelectItem key={q.id} value={q.id}>
                    {q.pergunta.slice(0, 40)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {ranking.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma citação registrada com esses filtros. Rode uma consulta para começar.
            </p>
          ) : (
            <ul className="space-y-2">
              {ranking.slice(0, 25).map((r) => (
                <li
                  key={r.dominio}
                  className={cn(
                    "rounded-md border p-3",
                    r.is_marca_do_cliente ? "border-primary/40 bg-primary/[0.04]" : "border-border",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{r.loja_nome}</span>
                    <span className="text-xs text-muted-foreground">{r.dominio}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {TIPO_LABEL[r.tipo_fonte] ?? r.tipo_fonte}
                    </Badge>
                    {r.is_marca_do_cliente && (
                      <Badge className="text-[10px] bg-primary text-primary-foreground">Sua marca</Badge>
                    )}
                    <span className="ml-auto text-sm font-semibold text-foreground">
                      {poucasRodadas
                        ? `${r.rodadas_com_citacao} de ${r.total_rodadas}`
                        : `${pct(r.taxa)} · ${r.rodadas_com_citacao} de ${r.total_rodadas}`}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full bg-primary"
                      style={{ width: `${Math.max(4, Math.round(r.taxa * 100))}%` }}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{r.motores.map((m) => ENGINE_LABEL[m]).join(", ")}</span>
                    {r.ultimo_produto && <span>· {r.ultimo_produto}</span>}
                    {r.ultimo_preco && <span>· {r.ultimo_preco}</span>}
                    {r.ultimo_url && !r.ultimo_url.includes("vertexaisearch") ? (
                      <a
                        href={r.ultimo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        Abrir página <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Link2Off className="h-3 w-3" /> link mascarado pelo motor
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Evolução da taxa de aparição da marca */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Evolução da sua taxa de aparição
            <InfoTooltip text="Percentual das consultas do dia em que alguma IA citou a sua marca. Ganha sentido com várias rodadas ao longo das semanas." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trend.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sua linha começa na primeira consulta registrada.
            </p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 8, right: 16, bottom: 4, left: -12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="data" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <ReTooltip
                    formatter={(v: number) => [`${v}%`, "Aparição da marca"]}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="taxa"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
