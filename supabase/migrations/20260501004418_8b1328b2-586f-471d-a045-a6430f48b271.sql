-- Tabela de snapshots completos de auditoria (relatório navegável)
CREATE TABLE public.audit_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source TEXT NOT NULL DEFAULT 'preview',
  site_url TEXT NOT NULL DEFAULT '',
  overall_score INTEGER NOT NULL DEFAULT 0,
  status_label TEXT NOT NULL DEFAULT '',
  radar_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  pillar_details JSONB NOT NULL DEFAULT '[]'::jsonb,
  keyword_cloud JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_engines JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_reports_user_created ON public.audit_reports (user_id, created_at DESC);

ALTER TABLE public.audit_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit reports"
  ON public.audit_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all audit reports"
  ON public.audit_reports FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own audit reports"
  ON public.audit_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own audit reports"
  ON public.audit_reports FOR DELETE
  USING (auth.uid() = user_id);
