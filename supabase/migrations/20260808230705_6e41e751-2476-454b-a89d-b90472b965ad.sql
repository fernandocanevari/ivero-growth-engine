ALTER TABLE public.assinaturas ADD COLUMN IF NOT EXISTS asaas_checkout_id text;
CREATE INDEX IF NOT EXISTS assinaturas_asaas_checkout_id_idx ON public.assinaturas (asaas_checkout_id);
ALTER TABLE public.assinaturas DROP CONSTRAINT IF EXISTS assinaturas_status_check;
ALTER TABLE public.assinaturas ADD CONSTRAINT assinaturas_status_check CHECK (status = ANY (ARRAY['trial'::text,'pendente'::text,'ativo'::text,'inadimplente'::text,'atrasado'::text,'cancelado'::text,'expirado'::text]));