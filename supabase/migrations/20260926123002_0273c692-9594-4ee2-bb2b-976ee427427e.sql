-- Agências: cria marca do cliente sem dono individual (user_id NULL), vinculada via agency_brands.
CREATE OR REPLACE FUNCTION public.create_agency_brand()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_brand uuid;
  v_name text; v_email text; v_phone text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = v_uid AND account_type = 'agency') THEN
    RAISE EXCEPTION 'somente_agencias';
  END IF;
  SELECT COALESCE(nome_completo, display_name, ''), COALESCE(email, ''), COALESCE(celular, '')
    INTO v_name, v_email, v_phone FROM public.profiles WHERE user_id = v_uid;
  INSERT INTO public.brand_settings (user_id, contact_name, contact_email, contact_phone)
  VALUES (NULL, COALESCE(v_name,''), COALESCE(v_email,''), COALESCE(v_phone,''))
  RETURNING id INTO v_brand;
  INSERT INTO public.agency_brands (agency_user_id, brand_id, status) VALUES (v_uid, v_brand, 'ativo');
  RETURN v_brand;
END;
$$;
REVOKE ALL ON FUNCTION public.create_agency_brand() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_agency_brand() TO authenticated;

-- Respostas do perfil e concorrentes: acesso também pela agência vinculada.
CREATE POLICY "Brand access manage onboarding_responses" ON public.onboarding_responses
  FOR ALL TO authenticated USING (public.has_brand_access(brand_id)) WITH CHECK (public.has_brand_access(brand_id));
CREATE POLICY "Brand access manage competitors" ON public.competitors
  FOR ALL TO authenticated USING (public.has_brand_access(brand_id)) WITH CHECK (public.has_brand_access(brand_id));

-- Vitrine: execuções e citações visíveis para a agência pela pergunta da marca.
CREATE POLICY "Brand access view vitrine runs" ON public.vitrine_runs
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.vitrine_queries q WHERE q.id = vitrine_runs.query_id AND q.brand_id IS NOT NULL AND public.has_brand_access(q.brand_id)));
CREATE POLICY "Brand access view vitrine citations" ON public.vitrine_citations
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.vitrine_queries q WHERE q.id = vitrine_citations.query_id AND q.brand_id IS NOT NULL AND public.has_brand_access(q.brand_id)));