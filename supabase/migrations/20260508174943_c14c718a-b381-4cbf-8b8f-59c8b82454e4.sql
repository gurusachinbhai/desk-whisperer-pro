
-- 1. Add manager_id + photo_url to employee_profiles
ALTER TABLE public.employee_profiles
  ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES public.employee_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS photo_url text;

CREATE INDEX IF NOT EXISTS idx_employee_profiles_manager_id ON public.employee_profiles(manager_id);

-- 2. salary_profiles
CREATE TABLE IF NOT EXISTS public.salary_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  employee_id uuid NOT NULL UNIQUE,
  user_id uuid,
  annual_ctc numeric(14,2) NOT NULL DEFAULT 0,
  basic numeric(14,2) NOT NULL DEFAULT 0,
  hra numeric(14,2) NOT NULL DEFAULT 0,
  special_allowance numeric(14,2) NOT NULL DEFAULT 0,
  other_allowance numeric(14,2) NOT NULL DEFAULT 0,
  pf_deduction numeric(14,2) NOT NULL DEFAULT 0,
  professional_tax numeric(14,2) NOT NULL DEFAULT 0,
  other_deduction numeric(14,2) NOT NULL DEFAULT 0,
  tax_regime text NOT NULL DEFAULT 'new',
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.salary_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees view own salary"
  ON public.salary_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins view company salaries"
  ON public.salary_profiles FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_company_member(company_id));

CREATE POLICY "Admins insert company salaries"
  ON public.salary_profiles FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND is_company_member(company_id));

CREATE POLICY "Admins update company salaries"
  ON public.salary_profiles FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_company_member(company_id))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND is_company_member(company_id));

CREATE POLICY "Admins delete company salaries"
  ON public.salary_profiles FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_company_member(company_id));

CREATE POLICY "Super admins manage salaries"
  ON public.salary_profiles FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE TRIGGER salary_profiles_touch_updated_at
  BEFORE UPDATE ON public.salary_profiles
  FOR EACH ROW EXECUTE FUNCTION public.deskflow_touch_updated_at();

-- 3. employee_documents
CREATE TABLE IF NOT EXISTS public.employee_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  user_id uuid,
  doc_type text NOT NULL CHECK (doc_type IN ('payslip','itr','tax_forecast','salary_breakdown','other')),
  doc_year integer,
  doc_month integer CHECK (doc_month BETWEEN 1 AND 12),
  title text NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  mime_type text,
  uploaded_by uuid NOT NULL,
  uploaded_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_documents_employee ON public.employee_documents(employee_id, doc_type, doc_year, doc_month);
CREATE INDEX IF NOT EXISTS idx_employee_documents_company ON public.employee_documents(company_id);

ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees view own documents"
  ON public.employee_documents FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins view company documents"
  ON public.employee_documents FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_company_member(company_id));

CREATE POLICY "Admins insert company documents"
  ON public.employee_documents FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND is_company_member(company_id));

CREATE POLICY "Admins update company documents"
  ON public.employee_documents FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_company_member(company_id))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND is_company_member(company_id));

CREATE POLICY "Admins delete company documents"
  ON public.employee_documents FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_company_member(company_id));

CREATE POLICY "Super admins manage documents"
  ON public.employee_documents FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE TRIGGER employee_documents_touch_updated_at
  BEFORE UPDATE ON public.employee_documents
  FOR EACH ROW EXECUTE FUNCTION public.deskflow_touch_updated_at();

-- 4. Storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-documents', 'employee-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS — path layout: {company_id}/{employee_user_id_or_employee_id}/{filename}
CREATE POLICY "Employees download own documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'employee-documents'
    AND EXISTS (
      SELECT 1 FROM public.employee_documents d
      WHERE d.file_path = storage.objects.name
        AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins read company documents files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'employee-documents'
    AND has_role(auth.uid(), 'admin'::app_role)
    AND is_company_member(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Admins upload company documents files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'employee-documents'
    AND has_role(auth.uid(), 'admin'::app_role)
    AND is_company_member(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Admins update company documents files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'employee-documents'
    AND has_role(auth.uid(), 'admin'::app_role)
    AND is_company_member(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Admins delete company documents files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'employee-documents'
    AND has_role(auth.uid(), 'admin'::app_role)
    AND is_company_member(((storage.foldername(name))[1])::uuid)
  );

-- 5. Admins can update employee_profiles in their company (for manager mapping & photo)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='employee_profiles' AND policyname='Admins update company employees'
  ) THEN
    CREATE POLICY "Admins update company employees"
      ON public.employee_profiles FOR UPDATE TO authenticated
      USING (has_role(auth.uid(), 'admin'::app_role) AND is_company_member(company_id))
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND is_company_member(company_id));
  END IF;
END $$;

-- Allow employees to update their own profile (e.g. photo)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='employee_profiles' AND policyname='Users update own employee profile'
  ) THEN
    CREATE POLICY "Users update own employee profile"
      ON public.employee_profiles FOR UPDATE TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;
