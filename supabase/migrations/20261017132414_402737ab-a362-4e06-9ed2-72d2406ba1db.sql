CREATE POLICY checkout_locks_service_only ON public.checkout_creation_locks FOR ALL TO service_role USING (true) WITH CHECK (true);
ALTER TABLE public.assinaturas ADD COLUMN IF NOT EXISTS counted_payment_ids text[] NOT NULL DEFAULT '{}';
CREATE OR REPLACE FUNCTION public.record_checkout_payment(_assinatura_id uuid,_payment_id text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE n integer; BEGIN
 IF _payment_id IS NULL OR length(_payment_id)=0 THEN RAISE EXCEPTION 'payment_id_required'; END IF;
 UPDATE public.assinaturas SET ciclos_pagos=ciclos_pagos+1, counted_payment_ids=array_append(counted_payment_ids,_payment_id), compromisso_inicio=CASE WHEN ciclo_contratado='anual' THEN coalesce(compromisso_inicio,now()) ELSE compromisso_inicio END WHERE id=_assinatura_id AND NOT (_payment_id=ANY(counted_payment_ids)) RETURNING ciclos_pagos INTO n;
 IF n IS NULL THEN SELECT ciclos_pagos INTO n FROM public.assinaturas WHERE id=_assinatura_id; END IF;
 RETURN n; END; $$;
REVOKE ALL ON FUNCTION public.record_checkout_payment(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_checkout_payment(uuid,text) TO service_role;