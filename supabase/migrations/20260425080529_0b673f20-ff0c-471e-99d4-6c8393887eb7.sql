-- 1. Add phone column to employee_profiles
ALTER TABLE public.employee_profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Allow directory records (no auth user yet) by making user_id nullable
ALTER TABLE public.employee_profiles
  ALTER COLUMN user_id DROP NOT NULL;

-- 3. Unique email per employee directory record (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS employee_profiles_email_unique
  ON public.employee_profiles (lower(email))
  WHERE email IS NOT NULL;

-- 4. Public RLS so anonymous login screen can resolve company code
DROP POLICY IF EXISTS "Public can lookup company by code" ON public.company_profiles;
CREATE POLICY "Public can lookup company by code"
  ON public.company_profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 5. Lookup company by code
CREATE OR REPLACE FUNCTION public.lookup_company_by_code(_organization_code TEXT)
RETURNS TABLE (id UUID, name TEXT, organization_code TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, organization_code
  FROM public.company_profiles
  WHERE organization_code = upper(trim(_organization_code))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_company_by_code(TEXT) TO anon, authenticated;

-- 6. Lookup employee directory record by company code + (email OR phone)
CREATE OR REPLACE FUNCTION public.lookup_employee_for_login(
  _organization_code TEXT,
  _identifier TEXT
)
RETURNS TABLE (employee_email TEXT, display_name TEXT, company_id UUID, company_name TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ep.email AS employee_email,
         ep.display_name,
         cp.id AS company_id,
         cp.name AS company_name
  FROM public.employee_profiles ep
  JOIN public.company_profiles cp ON cp.id = ep.company_id
  WHERE cp.organization_code = upper(trim(_organization_code))
    AND (
      lower(ep.email) = lower(trim(_identifier))
      OR ep.phone = trim(_identifier)
    )
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_employee_for_login(TEXT, TEXT) TO anon, authenticated;

-- 7. Attach the logged-in user to a directory record (after OTP verify)
CREATE OR REPLACE FUNCTION public.attach_user_to_employee_record(
  _organization_code TEXT,
  _employee_email TEXT
)
RETURNS public.employee_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _company public.company_profiles%ROWTYPE;
  _profile public.employee_profiles%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO _company
  FROM public.company_profiles
  WHERE organization_code = upper(trim(_organization_code));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Company code not found';
  END IF;

  SELECT * INTO _profile
  FROM public.employee_profiles
  WHERE company_id = _company.id
    AND lower(email) = lower(trim(_employee_email))
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No employee record found for this email in the company';
  END IF;

  UPDATE public.employee_profiles
  SET user_id = auth.uid(),
      updated_at = now()
  WHERE id = _profile.id
  RETURNING * INTO _profile;

  INSERT INTO public.user_roles (user_id, role, company_id)
  VALUES (auth.uid(), 'user', _company.id)
  ON CONFLICT DO NOTHING;

  RETURN _profile;
END;
$$;

GRANT EXECUTE ON FUNCTION public.attach_user_to_employee_record(TEXT, TEXT) TO authenticated;

-- 8. Signup helper: validates uniqueness and creates a directory record
CREATE OR REPLACE FUNCTION public.signup_employee_record(
  _organization_code TEXT,
  _company_name TEXT,
  _display_name TEXT,
  _employee_email TEXT,
  _phone TEXT DEFAULT NULL
)
RETURNS public.employee_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _company public.company_profiles%ROWTYPE;
  _profile public.employee_profiles%ROWTYPE;
  _normalized_code TEXT;
BEGIN
  _normalized_code := upper(trim(_organization_code));

  IF length(trim(_employee_email)) = 0 OR trim(_employee_email) !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN
    RAISE EXCEPTION 'A valid email address is required';
  END IF;

  IF length(trim(_display_name)) < 2 THEN
    RAISE EXCEPTION 'Employee name is required';
  END IF;

  IF _normalized_code !~ '^[A-Z0-9-]{3,24}$' THEN
    RAISE EXCEPTION 'Company code must be 3-24 uppercase letters, numbers, or hyphens';
  END IF;

  SELECT * INTO _company
  FROM public.company_profiles
  WHERE organization_code = _normalized_code;

  IF NOT FOUND THEN
    IF length(trim(coalesce(_company_name, ''))) < 2 THEN
      RAISE EXCEPTION 'Company name is required to register a new company';
    END IF;

    INSERT INTO public.company_profiles (name, organization_code)
    VALUES (trim(_company_name), _normalized_code)
    RETURNING * INTO _company;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.employee_profiles
    WHERE lower(email) = lower(trim(_employee_email))
  ) THEN
    RAISE EXCEPTION 'An employee with this email already exists';
  END IF;

  INSERT INTO public.employee_profiles (
    user_id, company_id, display_name, email, phone
  )
  VALUES (
    NULL,
    _company.id,
    trim(_display_name),
    lower(trim(_employee_email)),
    nullif(trim(coalesce(_phone, '')), '')
  )
  RETURNING * INTO _profile;

  RETURN _profile;
END;
$$;

GRANT EXECUTE ON FUNCTION public.signup_employee_record(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- 9. Seed demo company + 5 demo employees
INSERT INTO public.company_profiles (name, organization_code)
VALUES ('Demo Workspace', 'DEMO01')
ON CONFLICT (organization_code) DO NOTHING;

INSERT INTO public.employee_profiles (user_id, company_id, display_name, email, phone)
SELECT NULL, cp.id, v.display_name, v.email, v.phone
FROM (VALUES
  ('EMP1',   'emp1@demo.test',   '+10000000001'),
  ('Sachin', 'sachin@demo.test', '+10000000002'),
  ('EMP2',   'emp2@demo.test',   '+10000000003'),
  ('EMP3',   'emp3@demo.test',   '+10000000004'),
  ('EMP4',   'emp4@demo.test',   '+10000000005')
) AS v(display_name, email, phone)
CROSS JOIN public.company_profiles cp
WHERE cp.organization_code = 'DEMO01'
  AND NOT EXISTS (
    SELECT 1 FROM public.employee_profiles ep
    WHERE lower(ep.email) = lower(v.email)
  );