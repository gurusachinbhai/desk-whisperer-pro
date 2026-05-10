-- Employee onboarding & resignation columns
ALTER TABLE public.employee_profiles
  ADD COLUMN IF NOT EXISTS employee_code TEXT,
  ADD COLUMN IF NOT EXISTS uan_number TEXT,
  ADD COLUMN IF NOT EXISTS resignation_date DATE,
  ADD COLUMN IF NOT EXISTS last_working_day DATE,
  ADD COLUMN IF NOT EXISTS exit_status TEXT,
  ADD COLUMN IF NOT EXISTS exit_checklist JSONB DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS employee_profiles_company_code_uidx
  ON public.employee_profiles(company_id, employee_code) WHERE employee_code IS NOT NULL;

-- Sequence-style code generator (per company)
CREATE OR REPLACE FUNCTION public.generate_employee_code(_company_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _code_prefix TEXT;
  _next_num INT;
  _new_code TEXT;
BEGIN
  SELECT upper(substring(regexp_replace(coalesce(organization_code, name), '[^A-Za-z0-9]', '', 'g') from 1 for 4))
    INTO _code_prefix
  FROM public.company_profiles WHERE id = _company_id;

  IF _code_prefix IS NULL OR length(_code_prefix) = 0 THEN
    _code_prefix := 'EMP';
  END IF;

  SELECT COALESCE(MAX( (regexp_replace(employee_code, '^.*-', ''))::int ), 1000) + 1
    INTO _next_num
  FROM public.employee_profiles
  WHERE company_id = _company_id
    AND employee_code ~ ('^' || _code_prefix || '-[0-9]+$');

  _new_code := _code_prefix || '-' || _next_num::text;
  RETURN _new_code;
END;
$$;

-- Desk seats master
CREATE TABLE IF NOT EXISTS public.desk_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  floor TEXT,
  area TEXT,
  seat_label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, floor, area, seat_label)
);

ALTER TABLE public.desk_seats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view seats" ON public.desk_seats
  FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "Admins insert seats" ON public.desk_seats
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') AND public.is_company_member(company_id));
CREATE POLICY "Admins update seats" ON public.desk_seats
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') AND public.is_company_member(company_id))
  WITH CHECK (public.has_role(auth.uid(),'admin') AND public.is_company_member(company_id));
CREATE POLICY "Admins delete seats" ON public.desk_seats
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') AND public.is_company_member(company_id));

CREATE TRIGGER trg_desk_seats_updated
  BEFORE UPDATE ON public.desk_seats
  FOR EACH ROW EXECUTE FUNCTION public.deskflow_touch_updated_at();

-- Allow admins to insert employee profiles for onboarding
CREATE POLICY "Admins insert company employees" ON public.employee_profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') AND public.is_company_member(company_id));