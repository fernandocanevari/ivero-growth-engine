-- Enums
CREATE TYPE public.proposta_origem AS ENUM ('preview', 'convite');
CREATE TYPE public.proposta_plano AS ENUM ('presenca', 'influencia', 'autoridade', 'dominio');
CREATE TYPE public.proposta_status AS ENUM ('enviada', 'visualizada', 'em_negociacao', 'aceita', 'recusada', 'expirada');
CREATE TYPE public.proposta_motivo_recusa AS ENUM ('preco', 'momento', 'concorrente', 'sem_fit', 'sem_resposta', 'outro');

-- Tabela
CREATE TABLE public.propostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  empresa_nome text NOT NULL DEFAULT '',
  empresa_site text NOT NULL DEFAULT '',
  contato_nome text,
  contato_email text,
  contato_telefone text,
  origem public.proposta_origem NOT NULL DEFAULT 'preview',
  diagnostico_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  score_geral integer NOT NULL DEFAULT 0,
  plano_sugerido public.proposta_plano NOT NULL DEFAULT 'presenca',
  valor_proposto numeric(10,2) NOT NULL DEFAULT 0,
  valor_negociado numeric(10,2),
  status public.proposta_status NOT NULL DEFAULT 'enviada',
  motivo_recusa_categoria public.proposta_motivo_recusa,
  motivo_recusa_texto text,
  notas_admin text NOT NULL DEFAULT '',
  viewed_at timestamptz,
  responded_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_propostas_slug ON public.propostas(slug);
CREATE INDEX idx_propostas_status ON public.propostas(status);
CREATE INDEX idx_propostas_created_at ON public.propostas(created_at DESC);

-- RLS
ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all propostas"
  ON public.propostas FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert propostas"
  ON public.propostas FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update propostas"
  ON public.propostas FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete propostas"
  ON public.propostas FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger updated_at
CREATE TRIGGER update_propostas_updated_at
  BEFORE UPDATE ON public.propostas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();