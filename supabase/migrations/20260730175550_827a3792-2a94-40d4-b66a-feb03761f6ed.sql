CREATE TYPE public.action_difficulty AS ENUM ('baixa', 'media', 'alta');

CREATE TYPE public.authority_subcategory AS ENUM (
  'publicacoes_midia',
  'conteudo_autoridade',
  'citacoes_backlinks',
  'comunidades_foruns',
  'reputacao_digital',
  'autoridade_institucional',
  'conteudo_multimidia',
  'seo_geo'
);

CREATE TABLE public.autoridade_externa_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subcategoria public.authority_subcategory NOT NULL,
  titulo text NOT NULL,
  descricao text NOT NULL,
  objetivo text,
  impacto_estimado text,
  tempo_estimado text,
  dificuldade public.action_difficulty NOT NULL DEFAULT 'media',
  prioridade public.action_priority NOT NULL DEFAULT 'media',
  icon text,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.autoridade_externa_catalog TO authenticated;
GRANT ALL ON public.autoridade_externa_catalog TO service_role;

ALTER TABLE public.autoridade_externa_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Catálogo visível para usuários logados"
  ON public.autoridade_externa_catalog
  FOR SELECT
  TO authenticated
  USING (ativo = true);

CREATE POLICY "Admins gerenciam o catálogo"
  ON public.autoridade_externa_catalog
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_autoridade_catalog_updated_at
  BEFORE UPDATE ON public.autoridade_externa_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_autoridade_catalog_subcat
  ON public.autoridade_externa_catalog (subcategoria, ordem);

ALTER TABLE public.action_plans
  ADD COLUMN dificuldade     public.action_difficulty,
  ADD COLUMN tempo_estimado  text,
  ADD COLUMN objetivo        text,
  ADD COLUMN subcategoria    public.authority_subcategory,
  ADD COLUMN catalog_id      uuid REFERENCES public.autoridade_externa_catalog(id) ON DELETE SET NULL;

CREATE INDEX idx_action_plans_subcategoria
  ON public.action_plans (user_id, subcategoria)
  WHERE subcategoria IS NOT NULL;