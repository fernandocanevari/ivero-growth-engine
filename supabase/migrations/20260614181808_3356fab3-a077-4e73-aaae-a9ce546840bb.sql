
-- 1) Validate lead email format at the database level
ALTER TABLE public.leads
  ADD CONSTRAINT leads_email_format_chk
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- 2) Allow users to delete their own logos in the brand-logos bucket
CREATE POLICY "Users can delete own logo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'brand-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 3) Admins can read simulation_results so the table is not orphaned
CREATE POLICY "Admins can view simulation_results"
ON public.simulation_results FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4) Pin search_path on handle_updated_at (function_search_path_mutable)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;
