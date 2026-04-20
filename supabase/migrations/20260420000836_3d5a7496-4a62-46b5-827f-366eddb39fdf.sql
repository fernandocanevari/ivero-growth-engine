-- Garantir que cada usuário só tenha um registro em brand_settings (necessário para upsert por user_id)
-- Primeiro remover possíveis duplicatas existentes (mantendo o mais recente)
DELETE FROM public.brand_settings a
USING public.brand_settings b
WHERE a.user_id = b.user_id
  AND a.user_id IS NOT NULL
  AND a.created_at < b.created_at;

-- Adicionar a constraint UNIQUE
ALTER TABLE public.brand_settings
  ADD CONSTRAINT brand_settings_user_id_unique UNIQUE (user_id);