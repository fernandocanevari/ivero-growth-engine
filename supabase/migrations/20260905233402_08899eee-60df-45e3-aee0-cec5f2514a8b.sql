ALTER TABLE public.assinaturas
  ADD COLUMN IF NOT EXISTS asaas_checkout_created_at timestamptz;

UPDATE public.assinaturas
SET asaas_checkout_id = NULL,
    updated_at = now()
WHERE status = 'trial'
  AND asaas_subscription_id IS NULL
  AND asaas_checkout_id IS NOT NULL;