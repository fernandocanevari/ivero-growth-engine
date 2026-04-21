-- Tabela para armazenar conteúdo gerado pelo Gerador GEO
CREATE TABLE public.generated_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  topic TEXT NOT NULL DEFAULT '',
  tone TEXT NOT NULL DEFAULT 'executive',
  formats TEXT[] NOT NULL DEFAULT ARRAY['article','faq','summary']::TEXT[],
  context_used JSONB NOT NULL DEFAULT '{}'::JSONB,
  article_md TEXT NOT NULL DEFAULT '',
  faq_json JSONB NOT NULL DEFAULT '[]'::JSONB,
  summary_md TEXT NOT NULL DEFAULT '',
  model_used TEXT NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index para listagem rápida do histórico do usuário
CREATE INDEX idx_generated_content_user_created
  ON public.generated_content (user_id, created_at DESC);

-- RLS
ALTER TABLE public.generated_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generated content"
  ON public.generated_content
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generated content"
  ON public.generated_content
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own generated content"
  ON public.generated_content
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all generated content"
  ON public.generated_content
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));