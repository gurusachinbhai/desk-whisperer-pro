
-- Departments
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members view departments" ON public.departments
  FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "Admins insert departments" ON public.departments
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role) AND public.is_company_member(company_id));
CREATE POLICY "Admins update departments" ON public.departments
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role) AND public.is_company_member(company_id))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role) AND public.is_company_member(company_id));
CREATE POLICY "Admins delete departments" ON public.departments
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role) AND public.is_company_member(company_id));
CREATE POLICY "Super admins manage departments" ON public.departments
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE TRIGGER trg_departments_touch BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.deskflow_touch_updated_at();

-- Projects
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members view projects" ON public.projects
  FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "Admins insert projects" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role) AND public.is_company_member(company_id));
CREATE POLICY "Admins update projects" ON public.projects
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role) AND public.is_company_member(company_id))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role) AND public.is_company_member(company_id));
CREATE POLICY "Admins delete projects" ON public.projects
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role) AND public.is_company_member(company_id));
CREATE POLICY "Super admins manage projects" ON public.projects
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE TRIGGER trg_projects_touch BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.deskflow_touch_updated_at();

-- Employee profile mapping
ALTER TABLE public.employee_profiles
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

-- Employee KYC (sensitive)
CREATE TABLE public.employee_kyc (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL UNIQUE,
  user_id uuid,
  company_id uuid NOT NULL,
  pan_number text,
  aadhar_number text,
  bank_account_holder text,
  bank_account_number text,
  bank_ifsc text,
  bank_name text,
  bank_branch text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.employee_kyc ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employee views own kyc" ON public.employee_kyc
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins view company kyc" ON public.employee_kyc
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role) AND public.is_company_member(company_id));
CREATE POLICY "Admins insert company kyc" ON public.employee_kyc
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role) AND public.is_company_member(company_id));
CREATE POLICY "Admins update company kyc" ON public.employee_kyc
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role) AND public.is_company_member(company_id))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role) AND public.is_company_member(company_id));
CREATE POLICY "Admins delete company kyc" ON public.employee_kyc
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role) AND public.is_company_member(company_id));
CREATE POLICY "Super admins manage kyc" ON public.employee_kyc
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE TRIGGER trg_employee_kyc_touch BEFORE UPDATE ON public.employee_kyc
  FOR EACH ROW EXECUTE FUNCTION public.deskflow_touch_updated_at();

CREATE INDEX idx_projects_dept ON public.projects(department_id);
CREATE INDEX idx_employee_dept ON public.employee_profiles(department_id);
CREATE INDEX idx_employee_project ON public.employee_profiles(project_id);
