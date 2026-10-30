ALTER TABLE public.assinaturas
  ADD COLUMN IF NOT EXISTS multa_pendente_valor numeric,
  ADD COLUMN IF NOT EXISTS multa_pendente_ciclos integer,
  ADD COLUMN IF NOT EXISTS multa_pendente_payment_id text,
  ADD COLUMN IF NOT EXISTS multa_pendente_invoice_url text,
  ADD COLUMN IF NOT EXISTS multa_pendente_em timestamptz,
  ADD COLUMN IF NOT EXISTS multa_ultimo_payment_id text;