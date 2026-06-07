
CREATE TABLE public.hr_kiosk_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE,
  verification_mode text NOT NULL DEFAULT 'either',
  max_enrollment_attempts integer NOT NULL DEFAULT 3,
  max_verify_retries integer NOT NULL DEFAULT 3,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hr_kiosk_settings_mode_chk CHECK (verification_mode IN ('face','thumb','both','either')),
  CONSTRAINT hr_kiosk_settings_enroll_chk CHECK (max_enrollment_attempts BETWEEN 1 AND 20),
  CONSTRAINT hr_kiosk_settings_retry_chk CHECK (max_verify_retries BETWEEN 1 AND 20)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_kiosk_settings TO authenticated;
GRANT ALL ON public.hr_kiosk_settings TO service_role;

ALTER TABLE public.hr_kiosk_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view kiosk settings" ON public.hr_kiosk_settings
  FOR SELECT TO authenticated USING (public.is_company_member(company_id));

CREATE POLICY "Admins manage kiosk settings" ON public.hr_kiosk_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.is_company_member(company_id))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.is_company_member(company_id));

CREATE POLICY "Super admins manage kiosk settings" ON public.hr_kiosk_settings
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE TRIGGER hr_kiosk_settings_touch
  BEFORE UPDATE ON public.hr_kiosk_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
