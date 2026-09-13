// Execução de uma pergunta da Vitrine IA + gravação das rodadas/citações.
// Compartilhado por vitrine-run (manual) e vitrine-schedule (agendado).
import {
  runAllEngines,
  marcaCitada,
  isMarcaDoCliente,
  normalizeDomain,
  type QueryContext,
} from "./vitrine-engines.ts";

export interface VitrineQueryRow {
  id: string;
  user_id: string;
  pergunta: string;
  pais: string;
  idioma: string;
  regiao: string | null;
  frequencia: "semanal" | "mensal";
}

// deno-lint-ignore no-explicit-any
type Admin = any;

export async function executeVitrineQuery(admin: Admin, query: VitrineQueryRow) {
  const { data: brand } = await admin
    .from("brand_settings")
    .select("brand_name, website, coverage_city, coverage_state, coverage_type")
    .eq("user_id", query.user_id)
    .maybeSingle();

  const marcaDominio = brand?.website
    ? normalizeDomain(brand.website.startsWith("http") ? brand.website : `https://${brand.website}`)
    : null;

  const ctx: QueryContext = {
    pergunta: query.pergunta,
    pais: query.pais || "BR",
    idioma: query.idioma || "pt-BR",
    regiao:
      query.regiao ||
      (brand?.coverage_type === "regional" && brand?.coverage_city
        ? `${brand.coverage_city}/${brand.coverage_state ?? ""}`.replace(/\/$/, "")
        : null),
    marcaNome: brand?.brand_name ?? null,
    marcaDominio,
  };

  const results = await runAllEngines(ctx);
  const resumo: Array<{ engine: string; status: string; citacoes: number; erro: string | null }> = [];

  for (const r of results) {
    const { data: run, error: runErr } = await admin
      .from("vitrine_runs")
      .insert({
        user_id: query.user_id,
        query_id: query.id,
        engine: r.engine,
        status: r.status,
        resposta_texto: r.resposta_texto,
        dominios: r.citations.map((c) => c.dominio),
        marca_citada: marcaCitada(r, ctx),
        custo_usd: r.custo_usd,
        duracao_ms: r.duracao_ms,
        erro_msg: r.erro_msg,
      })
      .select("id")
      .single();

    if (runErr || !run) {
      console.error("vitrine_runs insert falhou:", runErr?.message);
      continue;
    }

    if (r.citations.length > 0) {
      const rows = r.citations.map((c) => ({
        user_id: query.user_id,
        run_id: run.id,
        query_id: query.id,
        engine: r.engine,
        dominio: c.dominio,
        loja_nome: c.loja_nome,
        produto_nome: c.produto_nome,
        preco_texto: c.preco_texto,
        url: c.url,
        url_mascarada: c.url_mascarada,
        tipo_fonte: c.tipo_fonte,
        is_marca_do_cliente: isMarcaDoCliente(c.dominio, ctx),
        posicao: c.posicao,
      }));
      const { error: cErr } = await admin.from("vitrine_citations").insert(rows);
      if (cErr) console.error("vitrine_citations insert falhou:", cErr.message);
    }

    resumo.push({ engine: r.engine, status: r.status, citacoes: r.citations.length, erro: r.erro_msg });
  }

  const proxima = new Date();
  proxima.setDate(proxima.getDate() + (query.frequencia === "mensal" ? 30 : 7));
  await admin
    .from("vitrine_queries")
    .update({ last_run_at: new Date().toISOString(), next_run_at: proxima.toISOString() })
    .eq("id", query.id);

  return resumo;
}
