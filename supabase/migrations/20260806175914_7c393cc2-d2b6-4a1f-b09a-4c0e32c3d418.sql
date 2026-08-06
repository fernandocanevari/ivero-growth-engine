CREATE UNIQUE INDEX IF NOT EXISTS assinaturas_user_ativa_uniq
ON public.assinaturas (user_id)
WHERE status IN ('ativo', 'trial', 'inadimplente', 'pendente');