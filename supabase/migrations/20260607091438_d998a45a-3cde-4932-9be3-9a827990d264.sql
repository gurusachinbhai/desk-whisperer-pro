
CREATE TABLE public.employee_profile_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  changed_by UUID,
  changed_by_name TEXT,
  changed_by_email TEXT,
  changes JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_emp_audit_employee ON public.employee_profile_audit(employee_id, created_at DESC);
CREATE INDEX idx_emp_audit_company ON public.employee_profile_audit(company_id, created_at DESC);

GRANT SELECT, INSERT ON public.employee_profile_audit TO authenticated;
GRANT ALL ON public.employee_profile_audit TO service_role;

ALTER TABLE public.employee_profile_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view company employee audit"
  ON public.employee_profile_audit FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_company_member(company_id));

CREATE POLICY "Super admins view all employee audit"
  ON public.employee_profile_audit FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Admins insert company employee audit"
  ON public.employee_profile_audit FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    AND is_company_member(company_id)
    AND changed_by = auth.uid()
  );

CREATE POLICY "Super admins insert employee audit"
  ON public.employee_profile_audit FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin());
