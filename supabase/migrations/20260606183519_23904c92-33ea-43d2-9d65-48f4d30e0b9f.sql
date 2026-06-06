
CREATE TABLE IF NOT EXISTS public.biometric_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  company_id uuid NOT NULL,
  face_image_path text,
  face_enrolled_at timestamptz,
  webauthn_credential_id text,
  thumb_enrolled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.biometric_enrollments TO authenticated;
GRANT ALL ON public.biometric_enrollments TO service_role;

ALTER TABLE public.biometric_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own biometric enrollment"
  ON public.biometric_enrollments
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND is_company_member(company_id));

CREATE POLICY "Admins view company biometric enrollments"
  ON public.biometric_enrollments
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_company_member(company_id));

CREATE POLICY "Admins delete company biometric enrollments"
  ON public.biometric_enrollments
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_company_member(company_id));

CREATE POLICY "Super admins manage biometric enrollments"
  ON public.biometric_enrollments
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE TRIGGER biometric_enrollments_touch_updated_at
  BEFORE UPDATE ON public.biometric_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
