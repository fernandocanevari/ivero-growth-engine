ALTER TABLE public.assinaturas ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

ALTER TABLE public.assinaturas DROP CONSTRAINT IF EXISTS assinaturas_status_check;

ALTER TABLE public.assinaturas ADD CONSTRAINT assinaturas_status_check CHECK (status IN ('trial', 'pendente', 'ativo', 'inadimplente', 'cancelado'));