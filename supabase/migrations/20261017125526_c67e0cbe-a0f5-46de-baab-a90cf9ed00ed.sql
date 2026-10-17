ALTER TABLE public.assinaturas ADD COLUMN IF NOT EXISTS checkout_context jsonb;
CREATE TABLE public.checkout_creation_locks (user_id uuid PRIMARY KEY, token uuid NOT NULL, expires_at timestamptz NOT NULL);
GRANT ALL ON public.checkout_creation_locks TO service_role;
ALTER TABLE public.checkout_creation_locks ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.claim_checkout_creation(_user_id uuid, _token uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.checkout_creation_locks(user_id,token,expires_at) VALUES (_user_id,_token,now()+interval '2 minutes') ON CONFLICT (user_id) DO UPDATE SET token=EXCLUDED.token,expires_at=EXCLUDED.expires_at WHERE checkout_creation_locks.expires_at<=now();
 RETURN FOUND;
END; $$;
REVOKE ALL ON FUNCTION public.claim_checkout_creation(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_checkout_creation(uuid,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.release_checkout_creation(_user_id uuid,_token uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ UPDATE public.checkout_creation_locks SET expires_at=now() WHERE user_id=_user_id AND token=_token; $$;
REVOKE ALL ON FUNCTION public.release_checkout_creation(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.release_checkout_creation(uuid,uuid) TO service_role;