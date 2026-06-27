
-- onboarding_responses: única fonte de verdade para respostas das 3 perguntas
CREATE TABLE IF NOT EXISTS public.onboarding_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brand_settings(id) ON DELETE CASCADE,
  p1_maturidade_ia text NOT NULL CHECK (p1_maturidade_ia IN (
    'nem_aparecemos','nao_sei_dizer','aparecemos_sem_referencia','aparecemos_com_destaque'
  )),
  p2_criterio_mercado text NOT NULL CHECK (p2_criterio_mercado IN (
    'preco_custo','confianca_reputacao','qualidade_tecnica','indicacao_social'
  )),
  p3_maior_risco text NOT NULL CHECK (p3_maior_risco IN (
    'concorrente_ocupa_espaco','informacao_errada','nao_mencionado','perde_cliente_sem_saber'
  )),
  dashboard_hint_dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_responses TO authenticated;
GRANT ALL ON public.onboarding_responses TO service_role;

ALTER TABLE public.onboarding_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own onboarding_responses"
  ON public.onboarding_responses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.brand_settings bs
      WHERE bs.id = onboarding_responses.brand_id AND bs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.brand_settings bs
      WHERE bs.id = onboarding_responses.brand_id AND bs.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins read all onboarding_responses"
  ON public.onboarding_responses FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_onboarding_responses_brand_id ON public.onboarding_responses(brand_id);

-- competitors: estrutura adiantada para o PROMPT 3
CREATE TABLE IF NOT EXISTS public.competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brand_settings(id) ON DELETE CASCADE,
  nome text NOT NULL,
  url text,
  sugerido_por_ia boolean NOT NULL DEFAULT false,
  aprovado_pelo_usuario boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.competitors TO authenticated;
GRANT ALL ON public.competitors TO service_role;

ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own competitors"
  ON public.competitors FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.brand_settings bs
      WHERE bs.id = competitors.brand_id AND bs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.brand_settings bs
      WHERE bs.id = competitors.brand_id AND bs.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins read all competitors"
  ON public.competitors FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_competitors_brand_id ON public.competitors(brand_id);
