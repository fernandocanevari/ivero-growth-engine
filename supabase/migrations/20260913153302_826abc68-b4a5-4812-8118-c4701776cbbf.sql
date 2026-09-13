-- Vitrine IA v1 ------------------------------------------------------------
-- Módulo isolado do cálculo dos 5 pilares. Nada aqui toca simulate-ai,
-- audit_reports ou analysis_history.

CREATE TYPE public.vitrine_engine AS ENUM ('chatgpt', 'google_ai', 'claude');
CREATE TYPE public.vitrine_run_status AS ENUM ('ok', 'erro');
CREATE TYPE public.vitrine_source_type AS ENUM ('loja', 'marketplace', 'review', 'outro');
CREATE TYPE public.vitrine_frequency AS ENUM ('semanal', 'mensal');

-- 1) Perguntas de compra do cliente -----------------------------------------
CREATE TABLE public.vitrine_queries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pergunta text NOT NULL,
  pais text NOT NULL DEFAULT 'BR',
  idioma text NOT NULL DEFAULT 'pt-BR',
  regiao text,
  ativo boolean NOT NULL DEFAULT true,
  frequencia public.vitrine_frequency NOT NULL DEFAULT 'semanal',
  next_run_at timestamptz NOT NULL DEFAULT now(),
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vitrine_queries_pergunta_len CHECK (char_length(trim(pergunta)) BETWEEN 3 AND 300)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vitrine_queries TO authenticated;
GRANT ALL ON public.vitrine_queries TO service_role;
ALTER TABLE public.vitrine_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vitrine_queries_owner_all" ON public.vitrine_queries
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "vitrine_queries_admin_select" ON public.vitrine_queries
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER vitrine_queries_updated_at
  BEFORE UPDATE ON public.vitrine_queries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX vitrine_queries_user_idx ON public.vitrine_queries (user_id, ativo);
CREATE INDEX vitrine_queries_due_idx ON public.vitrine_queries (next_run_at) WHERE ativo;

-- 2) Rodadas (pergunta x motor x execução) ----------------------------------
CREATE TABLE public.vitrine_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query_id uuid NOT NULL REFERENCES public.vitrine_queries(id) ON DELETE CASCADE,
  engine public.vitrine_engine NOT NULL,
  status public.vitrine_run_status NOT NULL DEFAULT 'ok',
  resposta_texto text NOT NULL DEFAULT '',
  dominios jsonb NOT NULL DEFAULT '[]'::jsonb,
  marca_citada boolean NOT NULL DEFAULT false,
  custo_usd numeric(10,5) NOT NULL DEFAULT 0,
  duracao_ms integer NOT NULL DEFAULT 0,
  erro_msg text,
  executado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Registro imutável: leitura para o dono, escrita só pelo servidor.
GRANT SELECT ON public.vitrine_runs TO authenticated;
GRANT ALL ON public.vitrine_runs TO service_role;
ALTER TABLE public.vitrine_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vitrine_runs_owner_select" ON public.vitrine_runs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "vitrine_runs_admin_select" ON public.vitrine_runs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX vitrine_runs_user_time_idx ON public.vitrine_runs (user_id, executado_em DESC);
CREATE INDEX vitrine_runs_query_idx ON public.vitrine_runs (query_id, executado_em DESC);

-- 3) Citações (loja/página citada dentro de uma rodada) ---------------------
CREATE TABLE public.vitrine_citations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES public.vitrine_runs(id) ON DELETE CASCADE,
  query_id uuid NOT NULL REFERENCES public.vitrine_queries(id) ON DELETE CASCADE,
  engine public.vitrine_engine NOT NULL,
  dominio text NOT NULL,
  loja_nome text,
  produto_nome text,
  preco_texto text,
  url text,
  url_mascarada boolean NOT NULL DEFAULT false,
  tipo_fonte public.vitrine_source_type NOT NULL DEFAULT 'outro',
  is_marca_do_cliente boolean NOT NULL DEFAULT false,
  posicao integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.vitrine_citations TO authenticated;
GRANT ALL ON public.vitrine_citations TO service_role;
ALTER TABLE public.vitrine_citations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vitrine_citations_owner_select" ON public.vitrine_citations
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "vitrine_citations_admin_select" ON public.vitrine_citations
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX vitrine_citations_user_time_idx ON public.vitrine_citations (user_id, created_at DESC);
CREATE INDEX vitrine_citations_dominio_idx ON public.vitrine_citations (user_id, dominio);
CREATE INDEX vitrine_citations_run_idx ON public.vitrine_citations (run_id);