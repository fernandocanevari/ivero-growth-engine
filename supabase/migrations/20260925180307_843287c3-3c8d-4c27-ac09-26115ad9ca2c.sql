CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_type text := CASE WHEN NEW.raw_user_meta_data->>'account_type' = 'agency' THEN 'agency' ELSE 'individual' END;
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email, is_first_login, account_type, nome_empresa)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.email,
    true,
    v_type,
    CASE WHEN v_type = 'agency' THEN NULLIF(trim(NEW.raw_user_meta_data->>'nome_empresa'), '') ELSE NULL END
  );
  RETURN NEW;
END;
$function$;