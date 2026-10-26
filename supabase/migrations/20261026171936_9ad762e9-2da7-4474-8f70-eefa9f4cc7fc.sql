ALTER TABLE public.assinaturas
  ADD COLUMN IF NOT EXISTS upgrade_pendente_plano text,
  ADD COLUMN IF NOT EXISTS upgrade_pendente_ciclo text,
  ADD COLUMN IF NOT EXISTS upgrade_pendente_valor_novo numeric,
  ADD COLUMN IF NOT EXISTS upgrade_pendente_diferenca numeric,
  ADD COLUMN IF NOT EXISTS upgrade_pendente_payment_id text,
  ADD COLUMN IF NOT EXISTS upgrade_pendente_invoice_url text,
  ADD COLUMN IF NOT EXISTS upgrade_pendente_em timestamptz;