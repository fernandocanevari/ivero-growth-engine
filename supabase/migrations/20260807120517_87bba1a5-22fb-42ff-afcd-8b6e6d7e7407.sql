ALTER TABLE public.assinaturas DROP CONSTRAINT assinaturas_status_check;
ALTER TABLE public.assinaturas ADD CONSTRAINT assinaturas_status_check
  CHECK (status = ANY (ARRAY['trial'::text,'pendente'::text,'ativo'::text,'inadimplente'::text,'cancelado'::text,'expirado'::text]));