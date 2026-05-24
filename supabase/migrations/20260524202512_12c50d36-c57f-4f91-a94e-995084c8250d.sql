ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_first_login boolean NOT NULL DEFAULT true;

UPDATE public.profiles SET is_first_login = false WHERE created_at < now();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, is_first_login)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email), true);
  RETURN NEW;
END;
$function$;