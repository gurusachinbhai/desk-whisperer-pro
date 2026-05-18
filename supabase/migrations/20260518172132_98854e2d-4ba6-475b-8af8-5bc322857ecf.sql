
CREATE TABLE public.resumes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  department_id UUID,
  department_name TEXT,
  candidate_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  linkedin TEXT,
  location TEXT,
  professional_summary TEXT,
  work_experience JSONB NOT NULL DEFAULT '[]'::jsonb,
  education JSONB NOT NULL DEFAULT '[]'::jsonb,
  skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  certifications JSONB NOT NULL DEFAULT '[]'::jsonb,
  file_path TEXT,
  file_name TEXT,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_resumes_company ON public.resumes(company_id);
CREATE INDEX idx_resumes_department ON public.resumes(department_id);

ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view resumes"
ON public.resumes FOR SELECT TO authenticated
USING (is_company_member(company_id));

CREATE POLICY "Admins and managers manage resumes"
ON public.resumes FOR ALL TO authenticated
USING (is_company_member(company_id) AND (has_role(auth.uid(), 'admin'::app_role) OR is_company_manager(company_id)))
WITH CHECK (is_company_member(company_id) AND (has_role(auth.uid(), 'admin'::app_role) OR is_company_manager(company_id)));

CREATE POLICY "Super admins manage resumes"
ON public.resumes FOR ALL TO authenticated
USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE OR REPLACE FUNCTION public.resumes_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_resumes_updated_at
BEFORE UPDATE ON public.resumes
FOR EACH ROW EXECUTE FUNCTION public.resumes_touch_updated_at();

INSERT INTO storage.buckets (id, name, public) VALUES ('resume-bank', 'resume-bank', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Company members view resume files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'resume-bank' AND EXISTS (
  SELECT 1 FROM public.resumes r
  WHERE r.file_path = storage.objects.name AND is_company_member(r.company_id)
));

CREATE POLICY "Admins and managers upload resume files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'resume-bank');

CREATE POLICY "Admins and managers update resume files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'resume-bank');

CREATE POLICY "Admins and managers delete resume files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'resume-bank');
