-- 1) Consolidate ticket-attachments delete policies
DROP POLICY IF EXISTS "Users can delete own ticket attachments" ON storage.objects;

-- 2) Scope employee_kyc policies to authenticated role only (no anon evaluation)
DROP POLICY IF EXISTS "Employee views own kyc" ON public.employee_kyc;
DROP POLICY IF EXISTS "Admins view company kyc" ON public.employee_kyc;
DROP POLICY IF EXISTS "Admins insert company kyc" ON public.employee_kyc;
DROP POLICY IF EXISTS "Admins update company kyc" ON public.employee_kyc;
DROP POLICY IF EXISTS "Admins delete company kyc" ON public.employee_kyc;
DROP POLICY IF EXISTS "Super admins manage kyc" ON public.employee_kyc;

CREATE POLICY "Employee views own kyc" ON public.employee_kyc
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins view company kyc" ON public.employee_kyc
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_company_member(company_id));

CREATE POLICY "Admins insert company kyc" ON public.employee_kyc
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND is_company_member(company_id));

CREATE POLICY "Admins update company kyc" ON public.employee_kyc
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_company_member(company_id))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND is_company_member(company_id));

CREATE POLICY "Admins delete company kyc" ON public.employee_kyc
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_company_member(company_id));

CREATE POLICY "Super admins manage kyc" ON public.employee_kyc
  FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

REVOKE ALL ON public.employee_kyc FROM anon;