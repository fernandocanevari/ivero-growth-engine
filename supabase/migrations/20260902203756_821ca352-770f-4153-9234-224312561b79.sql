ALTER TABLE public.assinaturas ALTER COLUMN ciclo_contratado DROP DEFAULT;

CREATE OR REPLACE FUNCTION public.handle_new_user_trial()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_plano text;
  v_ciclo text;
BEGIN
  v_plano := COALESCE(NEW.raw_user_meta_data->>'plano_escolhido', 'presenca');
  IF v_plano NOT IN ('presenca', 'influencia', 'autoridade') THEN
    v_plano := 'presenca';
  END IF;

  -- Fallback seguro: sem escolha explícita, mensal (valor cheio, sem compromisso).
  v_ciclo := lower(COALESCE(NEW.raw_user_meta_data->>'ciclo_escolhido', 'mensal'));
  IF v_ciclo NOT IN ('mensal', 'anual') THEN
    v_ciclo := 'mensal';
  END IF;

  INSERT INTO public.assinaturas (
    user_id, plano, status, data_inicio, data_vencimento, trial_ends_at,
    ciclo_contratado, compromisso_inicio
  )
  SELECT
    NEW.id,
    v_plano,
    'trial',
    now(),
    now() + interval '30 days',
    now() + interval '7 days',
    v_ciclo,
    CASE WHEN v_ciclo = 'anual' THEN now() ELSE NULL END
  WHERE NOT EXISTS (
    SELECT 1 FROM public.assinaturas WHERE user_id = NEW.id
  );

  RETURN NEW;
END;
$function$;