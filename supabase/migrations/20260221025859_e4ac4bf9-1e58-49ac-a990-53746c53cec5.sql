
-- Table to store client onboarding answers
CREATE TABLE public.client_onboarding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question_1 TEXT NOT NULL DEFAULT '',
  question_2 TEXT NOT NULL DEFAULT '',
  question_3 TEXT NOT NULL DEFAULT '',
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_onboarding ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own onboarding" ON public.client_onboarding FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own onboarding" ON public.client_onboarding FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own onboarding" ON public.client_onboarding FOR UPDATE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_client_onboarding_updated_at
BEFORE UPDATE ON public.client_onboarding
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
