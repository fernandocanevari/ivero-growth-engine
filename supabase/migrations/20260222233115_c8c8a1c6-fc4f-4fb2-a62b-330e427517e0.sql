
-- Allow admins to view all brand_settings
CREATE POLICY "Admins can view all brand settings"
ON public.brand_settings
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all campaigns
CREATE POLICY "Admins can view all campaigns"
ON public.campaigns
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
