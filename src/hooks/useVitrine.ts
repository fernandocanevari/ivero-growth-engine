import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type VitrineEngine = "chatgpt" | "google_ai" | "claude";

export const ENGINE_LABEL: Record<VitrineEngine, string> = {
  claude: "Claude",
  google_ai: "Google Modo IA",
  chatgpt: "ChatGPT",
};

/** Abaixo disso a frequência não é confiável — e não deve ser vendida como número. */
export const MIN_RUNS_FOR_FREQUENCY = 3;

export const MAX_QUERIES = 10;

export interface VitrineQuery {
  id: string;
  pergunta: string;
  pais: string;
  idioma: string;
  regiao: string | null;
  ativo: boolean;
  frequencia: "semanal" | "mensal";
  next_run_at: string;
  last_run_at: string | null;
  created_at: string;
}

export interface VitrineRun {
  id: string;
  query_id: string;
  engine: VitrineEngine;
  status: "ok" | "erro";
  marca_citada: boolean;
  custo_usd: number;
  erro_msg: string | null;
  executado_em: string;
}

export interface VitrineCitation {
  id: string;
  run_id: string;
  query_id: string;
  engine: VitrineEngine;
  dominio: string;
  loja_nome: string | null;
  produto_nome: string | null;
  preco_texto: string | null;
  url: string | null;
  url_mascarada: boolean;
  tipo_fonte: "loja" | "marketplace" | "review" | "outro";
  is_marca_do_cliente: boolean;
  posicao: number | null;
  created_at: string;
}

export function useVitrineQueries() {
  return useQuery({
    queryKey: ["vitrine_queries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vitrine_queries")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as VitrineQuery[];
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  });
}

export function useVitrineRuns() {
  return useQuery({
    queryKey: ["vitrine_runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vitrine_runs")
        .select("id, query_id, engine, status, marca_citada, custo_usd, erro_msg, executado_em")
        .order("executado_em", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as VitrineRun[];
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  });
}

export function useVitrineCitations() {
  return useQuery({
    queryKey: ["vitrine_citations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vitrine_citations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as VitrineCitation[];
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  });
}

export function useCreateVitrineQuery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { pergunta: string; regiao?: string | null; frequencia?: "semanal" | "mensal" }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase.from("vitrine_queries").insert({
        user_id: user.id,
        pergunta: input.pergunta.trim(),
        regiao: input.regiao?.trim() || null,
        frequencia: input.frequencia ?? "semanal",
        pais: "BR",
        idioma: "pt-BR",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vitrine_queries"] });
      toast({ title: "Pergunta adicionada" });
    },
    onError: (e: Error) => toast({ title: "Não foi possível adicionar", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteVitrineQuery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vitrine_queries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vitrine_queries"] });
      toast({ title: "Pergunta removida" });
    },
  });
}

export function useRunVitrineQuery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (queryId: string) => {
      const { data, error } = await supabase.functions.invoke("vitrine-run", {
        body: { query_id: queryId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.message || data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vitrine_runs"] });
      qc.invalidateQueries({ queryKey: ["vitrine_citations"] });
      qc.invalidateQueries({ queryKey: ["vitrine_queries"] });
      toast({ title: "Consulta concluída", description: "Os resultados já estão na lista." });
    },
    onError: (e: Error) =>
      toast({ title: "A consulta não foi concluída", description: e.message, variant: "destructive" }),
  });
}

// ---------------------------------------------------------------------
// Frequência de citação — a métrica principal do produto.
// Calculada por leitura: rodadas em que o domínio apareceu ÷ total de rodadas.
// ---------------------------------------------------------------------
export interface DomainFrequency {
  dominio: string;
  loja_nome: string;
  rodadas_com_citacao: number;
  total_rodadas: number;
  taxa: number; // 0–1
  is_marca_do_cliente: boolean;
  tipo_fonte: VitrineCitation["tipo_fonte"];
  ultimo_url: string | null;
  ultimo_produto: string | null;
  ultimo_preco: string | null;
  motores: VitrineEngine[];
}

export function computeFrequency(
  runs: VitrineRun[],
  citations: VitrineCitation[],
  filtro?: { engine?: VitrineEngine | "todos"; queryId?: string | "todas" },
): { totalRuns: number; ranking: DomainFrequency[] } {
  const engine = filtro?.engine && filtro.engine !== "todos" ? filtro.engine : null;
  const queryId = filtro?.queryId && filtro.queryId !== "todas" ? filtro.queryId : null;

  const runsFiltrados = runs.filter(
    (r) => r.status === "ok" && (!engine || r.engine === engine) && (!queryId || r.query_id === queryId),
  );
  const runIds = new Set(runsFiltrados.map((r) => r.id));
  const totalRuns = runsFiltrados.length;

  const porDominio = new Map<string, DomainFrequency & { runsVistos: Set<string> }>();

  for (const c of citations) {
    if (!runIds.has(c.run_id)) continue;
    const atual = porDominio.get(c.dominio);
    if (atual) {
      atual.runsVistos.add(c.run_id);
      if (!atual.motores.includes(c.engine)) atual.motores.push(c.engine);
      atual.ultimo_url = atual.ultimo_url ?? c.url;
      atual.ultimo_produto = atual.ultimo_produto ?? c.produto_nome;
      atual.ultimo_preco = atual.ultimo_preco ?? c.preco_texto;
    } else {
      porDominio.set(c.dominio, {
        dominio: c.dominio,
        loja_nome: c.loja_nome || c.dominio,
        rodadas_com_citacao: 0,
        total_rodadas: totalRuns,
        taxa: 0,
        is_marca_do_cliente: c.is_marca_do_cliente,
        tipo_fonte: c.tipo_fonte,
        ultimo_url: c.url,
        ultimo_produto: c.produto_nome,
        ultimo_preco: c.preco_texto,
        motores: [c.engine],
        runsVistos: new Set([c.run_id]),
      });
    }
  }

  const ranking = [...porDominio.values()]
    .map(({ runsVistos, ...rest }) => ({
      ...rest,
      rodadas_com_citacao: runsVistos.size,
      total_rodadas: totalRuns,
      taxa: totalRuns > 0 ? runsVistos.size / totalRuns : 0,
    }))
    .sort((a, b) => b.taxa - a.taxa || a.dominio.localeCompare(b.dominio));

  return { totalRuns, ranking };
}

/** Série temporal da taxa de aparição da marca do cliente, por dia de rodada. */
export function computeBrandTrend(runs: VitrineRun[]): Array<{ data: string; taxa: number; rodadas: number }> {
  const porDia = new Map<string, { citada: number; total: number }>();
  for (const r of runs) {
    if (r.status !== "ok") continue;
    const dia = r.executado_em.slice(0, 10);
    const atual = porDia.get(dia) ?? { citada: 0, total: 0 };
    atual.total++;
    if (r.marca_citada) atual.citada++;
    porDia.set(dia, atual);
  }
  return [...porDia.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dia, v]) => ({
      data: new Date(dia + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
      taxa: Math.round((v.citada / v.total) * 100),
      rodadas: v.total,
    }));
}

/**
 * Saúde por motor — resiliência. Quando um motor falha, a rodada continua com
 * os outros; a tela precisa dizer qual falhou e por quê.
 */
export interface EngineHealth {
  engine: VitrineEngine;
  ultima_em: string | null;
  status: "ok" | "erro" | "sem_dados";
  erro_msg: string | null;
  rodadas_ok: number;
  rodadas_erro: number;
}

export function computeEngineHealth(runs: VitrineRun[]): EngineHealth[] {
  const engines: VitrineEngine[] = ["claude", "google_ai", "chatgpt"];
  return engines.map((engine) => {
    const doMotor = runs
      .filter((r) => r.engine === engine)
      .sort((a, b) => b.executado_em.localeCompare(a.executado_em));
    const ultima = doMotor[0];
    return {
      engine,
      ultima_em: ultima?.executado_em ?? null,
      status: ultima ? ultima.status : "sem_dados",
      erro_msg: ultima?.erro_msg ?? null,
      rodadas_ok: doMotor.filter((r) => r.status === "ok").length,
      rodadas_erro: doMotor.filter((r) => r.status === "erro").length,
    };
  });
}
