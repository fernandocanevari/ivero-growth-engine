
-- brand_settings
CREATE TABLE public.brand_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_name text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  sector text NOT NULL DEFAULT '',
  main_competitor text NOT NULL DEFAULT '',
  other_competitors text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- campaigns
CREATE TABLE public.campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  objective text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  start_date date,
  end_date date,
  keywords text NOT NULL DEFAULT '',
  mentions integer NOT NULL DEFAULT 0,
  score integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_brand_settings_updated_at
  BEFORE UPDATE ON public.brand_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
