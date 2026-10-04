ALTER TABLE public.action_plans ADD COLUMN IF NOT EXISTS geracao text;
ALTER TABLE public.action_plans ADD CONSTRAINT action_plans_geracao_check CHECK (geracao IS NULL OR geracao IN ('ia','fallback'));

CREATE TABLE public.action_plan_generations (
  audit_report_id uuid PRIMARY KEY REFERENCES public.audit_reports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  brand_id uuid REFERENCES public.brand_settings(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'processando',
  caminho text,
  acoes_criadas integer NOT NULL DEFAULT 0,
  detalhe text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.action_plan_generations TO authenticated;
GRANT ALL ON public.action_plan_generations TO service_role;
ALTER TABLE public.action_plan_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dono ou agencia ve geracoes"
  ON public.action_plan_generations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_brand_access(brand_id));
CREATE TRIGGER action_plan_generations_updated_at BEFORE UPDATE ON public.action_plan_generations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();