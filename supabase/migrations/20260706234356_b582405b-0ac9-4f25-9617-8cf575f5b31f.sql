
CREATE OR REPLACE FUNCTION public.handle_new_user_trial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plano text;
BEGIN
  v_plano := COALESCE(NEW.raw_user_meta_data->>'plano_escolhido', 'presenca');
  IF v_plano NOT IN ('presenca', 'influencia', 'autoridade') THEN
    v_plano := 'presenca';
  END IF;

  INSERT INTO public.assinaturas (
    user_id, plano, status, data_inicio, data_vencimento, trial_ends_at
  )
  SELECT
    NEW.id,
    v_plano,
    'trial',
    now(),
    now() + interval '30 days',
    now() + interval '7 days'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.assinaturas WHERE user_id = NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_trial ON auth.users;
CREATE TRIGGER on_auth_user_created_trial
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_trial();
