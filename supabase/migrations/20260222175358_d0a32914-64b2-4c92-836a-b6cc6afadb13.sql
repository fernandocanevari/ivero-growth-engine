
-- Add contact and logo fields to brand_settings
ALTER TABLE public.brand_settings
  ADD COLUMN IF NOT EXISTS contact_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_url text NOT NULL DEFAULT '';
