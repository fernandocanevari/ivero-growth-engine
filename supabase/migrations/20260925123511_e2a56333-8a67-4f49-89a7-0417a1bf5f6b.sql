
-- 1. account_type em profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'individual';

CREATE OR REPLACE FUNCTION public.validate_profile_account_type()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.account_type IS NULL OR NEW.account_type NOT IN ('individual','agency') THEN
    RAISE EXCEPTION 'account_type inválido: use individual ou agency';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER validate_profile_account_type_trg BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.validate_profile_account_type();

-- 2. agency_brands
CREATE TABLE public.agency_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_user_id uuid NOT NULL,
  brand_id uuid NOT NULL REFERENCES public.brand_settings(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'ativo',
  added_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_user_id, brand_id)
);
CREATE INDEX agency_brands_agency_idx ON public.agency_brands(agency_user_id) WHERE status = 'ativo';
CREATE INDEX agency_brands_brand_idx ON public.agency_brands(brand_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_brands TO authenticated;
GRANT ALL ON public.agency_brands TO service_role;
ALTER TABLE public.agency_brands ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.validate_agency_brand()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('ativo','removido') THEN
    RAISE EXCEPTION 'status inválido em agency_brands';
  END IF;
  IF NEW.status = 'removido' AND NEW.removed_at IS NULL THEN NEW.removed_at := now(); END IF;
  IF NEW.status = 'ativo' THEN NEW.removed_at := NULL; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER validate_agency_brand_trg BEFORE INSERT OR UPDATE ON public.agency_brands
FOR EACH ROW EXECUTE FUNCTION public.validate_agency_brand();
CREATE TRIGGER agency_brands_updated_at BEFORE UPDATE ON public.agency_brands
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. has_brand_access
CREATE OR REPLACE FUNCTION public.has_brand_access(_brand_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _brand_id IS NOT NULL AND auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.brand_settings b WHERE b.id = _brand_id AND b.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.agency_brands ab
      JOIN public.profiles p ON p.user_id = ab.agency_user_id AND p.account_type = 'agency'
      WHERE ab.brand_id = _brand_id AND ab.agency_user_id = auth.uid() AND ab.status = 'ativo'
    )
  )
$$;
REVOKE EXECUTE ON FUNCTION public.has_brand_access(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_brand_access(uuid) TO authenticated, service_role;

-- Políticas agency_brands: agência vê e gerencia só os próprios vínculos, apenas para marcas que ela mesma possui
CREATE POLICY "Agency views own brand links" ON public.agency_brands FOR SELECT TO authenticated
  USING (agency_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Agency links own brands" ON public.agency_brands FOR INSERT TO authenticated
  WITH CHECK (
    agency_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.account_type = 'agency')
    AND EXISTS (SELECT 1 FROM public.brand_settings b WHERE b.id = brand_id AND b.user_id = auth.uid())
  );
CREATE POLICY "Agency updates own brand links" ON public.agency_brands FOR UPDATE TO authenticated
  USING (agency_user_id = auth.uid()) WITH CHECK (agency_user_id = auth.uid());

-- 4. brand_id opcional nas tabelas de inteligência
ALTER TABLE public.audit_reports    ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brand_settings(id) ON DELETE SET NULL;
ALTER TABLE public.analysis_history ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brand_settings(id) ON DELETE SET NULL;
ALTER TABLE public.vitrine_queries  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brand_settings(id) ON DELETE SET NULL;
ALTER TABLE public.action_plans     ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brand_settings(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS audit_reports_brand_idx    ON public.audit_reports(brand_id)    WHERE brand_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS analysis_history_brand_idx ON public.analysis_history(brand_id) WHERE brand_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS vitrine_queries_brand_idx  ON public.vitrine_queries(brand_id)  WHERE brand_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS action_plans_brand_idx     ON public.action_plans(brand_id)     WHERE brand_id IS NOT NULL;

-- 5. Políticas ADICIONAIS por marca (as de user_id continuam intactas)
CREATE POLICY "Brand access view brand settings" ON public.brand_settings FOR SELECT TO authenticated
  USING (public.has_brand_access(id));
CREATE POLICY "Brand access update brand settings" ON public.brand_settings FOR UPDATE TO authenticated
  USING (public.has_brand_access(id)) WITH CHECK (public.has_brand_access(id));

CREATE POLICY "Brand access view audit reports" ON public.audit_reports FOR SELECT TO authenticated
  USING (brand_id IS NOT NULL AND public.has_brand_access(brand_id));
CREATE POLICY "Brand access insert audit reports" ON public.audit_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND brand_id IS NOT NULL AND public.has_brand_access(brand_id));
CREATE POLICY "Brand access delete audit reports" ON public.audit_reports FOR DELETE TO authenticated
  USING (brand_id IS NOT NULL AND public.has_brand_access(brand_id));

CREATE POLICY "Brand access view analysis history" ON public.analysis_history FOR SELECT TO authenticated
  USING (brand_id IS NOT NULL AND public.has_brand_access(brand_id));
CREATE POLICY "Brand access insert analysis history" ON public.analysis_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND brand_id IS NOT NULL AND public.has_brand_access(brand_id));

CREATE POLICY "Brand access all vitrine queries" ON public.vitrine_queries FOR ALL TO authenticated
  USING (brand_id IS NOT NULL AND public.has_brand_access(brand_id))
  WITH CHECK (brand_id IS NOT NULL AND public.has_brand_access(brand_id));

CREATE POLICY "Brand access view action plans" ON public.action_plans FOR SELECT TO authenticated
  USING (brand_id IS NOT NULL AND public.has_brand_access(brand_id));
CREATE POLICY "Brand access insert action plans" ON public.action_plans FOR INSERT TO authenticated
  WITH CHECK (brand_id IS NOT NULL AND public.has_brand_access(brand_id));
CREATE POLICY "Brand access update action plans" ON public.action_plans FOR UPDATE TO authenticated
  USING (brand_id IS NOT NULL AND public.has_brand_access(brand_id))
  WITH CHECK (brand_id IS NOT NULL AND public.has_brand_access(brand_id));
CREATE POLICY "Brand access delete action plans" ON public.action_plans FOR DELETE TO authenticated
  USING (brand_id IS NOT NULL AND public.has_brand_access(brand_id));
