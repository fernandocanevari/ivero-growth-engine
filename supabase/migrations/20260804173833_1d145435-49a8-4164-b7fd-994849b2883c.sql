CREATE TYPE public.lead_status AS ENUM ('novo', 'contatado', 'qualificado', 'descartado');

ALTER TABLE public.leads
  ADD COLUMN status public.lead_status NOT NULL DEFAULT 'novo',
  ADD COLUMN status_updated_at timestamptz,
  ADD COLUMN admin_notes text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.sync_lead_status_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_leads_status_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.sync_lead_status_updated_at();

DROP POLICY IF EXISTS "Admins can view leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can select leads" ON public.leads;

CREATE POLICY "Admins can view leads"
ON public.leads FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update leads"
ON public.leads FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;