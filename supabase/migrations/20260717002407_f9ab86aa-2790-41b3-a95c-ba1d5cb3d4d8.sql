-- Enums
CREATE TYPE public.action_category AS ENUM ('clareza','autoridade','conversao','posicionamento','relevancia','autoridade_externa');
CREATE TYPE public.action_priority AS ENUM ('alta','media','baixa');
CREATE TYPE public.action_status AS ENUM ('pendente','em_andamento','concluido');
CREATE TYPE public.action_origin AS ENUM ('automatico','manual');

-- Table
CREATE TABLE public.action_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  audit_report_id uuid NULL REFERENCES public.audit_reports(id) ON DELETE SET NULL,
  categoria public.action_category NOT NULL,
  titulo text NOT NULL,
  descricao text NULL,
  prioridade public.action_priority NOT NULL DEFAULT 'media',
  status public.action_status NOT NULL DEFAULT 'pendente',
  origem public.action_origin NOT NULL DEFAULT 'manual',
  impacto_estimado text NULL,
  ordem integer NULL,
  completed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.action_plans TO authenticated;
GRANT ALL ON public.action_plans TO service_role;

-- RLS
ALTER TABLE public.action_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own action plans"
  ON public.action_plans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own action plans"
  ON public.action_plans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own action plans"
  ON public.action_plans FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own action plans"
  ON public.action_plans FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_action_plans_user_status ON public.action_plans (user_id, status);
CREATE INDEX idx_action_plans_user_categoria ON public.action_plans (user_id, categoria);
CREATE INDEX idx_action_plans_audit_report ON public.action_plans (audit_report_id);

-- updated_at trigger (reuse existing handle_updated_at)
CREATE TRIGGER trg_action_plans_updated_at
  BEFORE UPDATE ON public.action_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- completed_at sync trigger
CREATE OR REPLACE FUNCTION public.sync_action_plan_completed_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'concluido' AND (OLD.status IS DISTINCT FROM 'concluido') THEN
    NEW.completed_at := now();
  ELSIF NEW.status <> 'concluido' THEN
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_action_plans_completed_at
  BEFORE INSERT OR UPDATE OF status ON public.action_plans
  FOR EACH ROW EXECUTE FUNCTION public.sync_action_plan_completed_at();