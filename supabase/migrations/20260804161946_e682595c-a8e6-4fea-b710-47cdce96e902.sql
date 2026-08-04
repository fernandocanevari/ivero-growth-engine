ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email, is_first_login)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email), NEW.email, true);
  RETURN NEW;
END;
$function$;

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.user_id AND (p.email IS NULL OR p.email = '');