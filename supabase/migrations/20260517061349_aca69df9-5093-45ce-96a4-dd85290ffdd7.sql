
-- Training assignments
CREATE TABLE public.training_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  course_id uuid NOT NULL,
  assigned_to_employee_id uuid NOT NULL,
  assigned_to_user_id uuid,
  assigned_to_name text,
  assigned_by uuid,
  assigned_by_name text,
  due_date date,
  status text NOT NULL DEFAULT 'assigned',
  progress_pct int NOT NULL DEFAULT 0,
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.training_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees view own assignments"
  ON public.training_assignments FOR SELECT TO authenticated
  USING (assigned_to_user_id = auth.uid());

CREATE POLICY "Employees update own assignment progress"
  ON public.training_assignments FOR UPDATE TO authenticated
  USING (assigned_to_user_id = auth.uid())
  WITH CHECK (assigned_to_user_id = auth.uid());

CREATE POLICY "Admins and managers manage assignments"
  ON public.training_assignments FOR ALL TO authenticated
  USING (is_company_member(company_id) AND (has_role(auth.uid(), 'admin'::app_role) OR is_company_manager(company_id)))
  WITH CHECK (is_company_member(company_id) AND (has_role(auth.uid(), 'admin'::app_role) OR is_company_manager(company_id)));

CREATE POLICY "Super admins manage assignments"
  ON public.training_assignments FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE INDEX idx_train_assign_emp ON public.training_assignments(assigned_to_employee_id);
CREATE INDEX idx_train_assign_company ON public.training_assignments(company_id);

-- Appraisal cycles
CREATE TABLE public.appraisal_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text NOT NULL,
  cycle_type text NOT NULL DEFAULT 'annual',
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.appraisal_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view appraisal cycles"
  ON public.appraisal_cycles FOR SELECT TO authenticated
  USING (is_company_member(company_id));

CREATE POLICY "Admins manage appraisal cycles"
  ON public.appraisal_cycles FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_company_member(company_id))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND is_company_member(company_id));

CREATE POLICY "Super admins manage appraisal cycles"
  ON public.appraisal_cycles FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Appraisal form templates
CREATE TABLE public.appraisal_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.appraisal_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view appraisal forms"
  ON public.appraisal_forms FOR SELECT TO authenticated
  USING (is_company_member(company_id));

CREATE POLICY "Admins manage appraisal forms"
  ON public.appraisal_forms FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_company_member(company_id))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND is_company_member(company_id));

CREATE POLICY "Super admins manage appraisal forms"
  ON public.appraisal_forms FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Appraisal reviews (one per employee per cycle)
CREATE TABLE public.appraisal_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  cycle_id uuid NOT NULL,
  form_id uuid,
  employee_id uuid NOT NULL,
  employee_user_id uuid,
  employee_name text,
  manager_id uuid,
  manager_user_id uuid,
  manager_name text,
  self_responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  manager_responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  self_overall_rating numeric,
  manager_overall_rating numeric,
  final_overall_rating numeric,
  employee_comments text,
  manager_comments text,
  admin_comments text,
  status text NOT NULL DEFAULT 'draft',
  employee_submitted_at timestamptz,
  manager_signed_at timestamptz,
  manager_signed_by uuid,
  admin_signed_at timestamptz,
  admin_signed_by uuid,
  admin_signed_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cycle_id, employee_id)
);

ALTER TABLE public.appraisal_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees view own appraisal"
  ON public.appraisal_reviews FOR SELECT TO authenticated
  USING (employee_user_id = auth.uid());

CREATE POLICY "Employees update own appraisal self section"
  ON public.appraisal_reviews FOR UPDATE TO authenticated
  USING (employee_user_id = auth.uid() AND status IN ('draft','employee_submitted'))
  WITH CHECK (employee_user_id = auth.uid());

CREATE POLICY "Managers view reports appraisals"
  ON public.appraisal_reviews FOR SELECT TO authenticated
  USING (manager_user_id = auth.uid());

CREATE POLICY "Managers update reports appraisals"
  ON public.appraisal_reviews FOR UPDATE TO authenticated
  USING (manager_user_id = auth.uid())
  WITH CHECK (manager_user_id = auth.uid());

CREATE POLICY "Admins manage company appraisals"
  ON public.appraisal_reviews FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_company_member(company_id))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND is_company_member(company_id));

CREATE POLICY "Super admins manage appraisals"
  ON public.appraisal_reviews FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE INDEX idx_appraisal_reviews_emp ON public.appraisal_reviews(employee_id);
CREATE INDEX idx_appraisal_reviews_cycle ON public.appraisal_reviews(cycle_id);

-- updated_at triggers
CREATE TRIGGER trg_training_assignments_updated BEFORE UPDATE ON public.training_assignments
  FOR EACH ROW EXECUTE FUNCTION public.deskflow_touch_updated_at();
CREATE TRIGGER trg_appraisal_cycles_updated BEFORE UPDATE ON public.appraisal_cycles
  FOR EACH ROW EXECUTE FUNCTION public.deskflow_touch_updated_at();
CREATE TRIGGER trg_appraisal_forms_updated BEFORE UPDATE ON public.appraisal_forms
  FOR EACH ROW EXECUTE FUNCTION public.deskflow_touch_updated_at();
CREATE TRIGGER trg_appraisal_reviews_updated BEFORE UPDATE ON public.appraisal_reviews
  FOR EACH ROW EXECUTE FUNCTION public.deskflow_touch_updated_at();
