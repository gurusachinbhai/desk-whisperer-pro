CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.company_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 120),
  organization_code TEXT NOT NULL UNIQUE CHECK (organization_code ~ '^[A-Z0-9-]{3,24}$'),
  domain TEXT CHECK (domain IS NULL OR domain ~ '^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.employee_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  company_id UUID NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (length(trim(display_name)) BETWEEN 2 AND 120),
  email TEXT CHECK (email IS NULL OR email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  company_id UUID REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, company_id)
);

ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_company_member(_company_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employee_profiles
    WHERE user_id = auth.uid()
      AND company_id = _company_id
  )
$$;

CREATE POLICY "Members can view their company"
ON public.company_profiles
FOR SELECT
TO authenticated
USING (public.is_company_member(id) OR created_by = auth.uid());

CREATE POLICY "Users can view employees in their company"
ON public.employee_profiles
FOR SELECT
TO authenticated
USING (public.is_company_member(company_id));

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view company roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  company_id IS NOT NULL
  AND public.has_role(auth.uid(), 'admin')
  AND public.is_company_member(company_id)
);

CREATE OR REPLACE FUNCTION public.register_company_profile(
  _company_name TEXT,
  _organization_code TEXT,
  _display_name TEXT,
  _email TEXT DEFAULT NULL,
  _domain TEXT DEFAULT NULL
)
RETURNS public.company_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _company public.company_profiles%ROWTYPE;
  _normalized_code TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  _normalized_code := upper(trim(_organization_code));

  IF length(trim(_company_name)) < 2 OR length(trim(_company_name)) > 120 THEN
    RAISE EXCEPTION 'Company name must be between 2 and 120 characters';
  END IF;

  IF _normalized_code !~ '^[A-Z0-9-]{3,24}$' THEN
    RAISE EXCEPTION 'Organization code must be 3-24 uppercase letters, numbers, or hyphens';
  END IF;

  INSERT INTO public.company_profiles (name, organization_code, domain, created_by)
  VALUES (trim(_company_name), _normalized_code, nullif(trim(coalesce(_domain, '')), ''), auth.uid())
  RETURNING * INTO _company;

  INSERT INTO public.employee_profiles (user_id, company_id, display_name, email)
  VALUES (auth.uid(), _company.id, trim(_display_name), nullif(trim(coalesce(_email, '')), ''))
  ON CONFLICT (user_id) DO UPDATE SET
    company_id = EXCLUDED.company_id,
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email;

  INSERT INTO public.user_roles (user_id, role, company_id)
  VALUES (auth.uid(), 'admin', _company.id)
  ON CONFLICT DO NOTHING;

  RETURN _company;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_company_profile(
  _organization_code TEXT,
  _display_name TEXT,
  _email TEXT DEFAULT NULL
)
RETURNS public.company_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _company public.company_profiles%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO _company
  FROM public.company_profiles
  WHERE organization_code = upper(trim(_organization_code));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Company not found';
  END IF;

  INSERT INTO public.employee_profiles (user_id, company_id, display_name, email)
  VALUES (auth.uid(), _company.id, trim(_display_name), nullif(trim(coalesce(_email, '')), ''))
  ON CONFLICT (user_id) DO UPDATE SET
    company_id = EXCLUDED.company_id,
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email;

  INSERT INTO public.user_roles (user_id, role, company_id)
  VALUES (auth.uid(), 'user', _company.id)
  ON CONFLICT DO NOTHING;

  RETURN _company;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_company_profile(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_company_profile(TEXT, TEXT, TEXT) TO authenticated;

CREATE TRIGGER company_profiles_touch_updated_at
BEFORE UPDATE ON public.company_profiles
FOR EACH ROW EXECUTE FUNCTION public.deskflow_touch_updated_at();

CREATE TRIGGER employee_profiles_touch_updated_at
BEFORE UPDATE ON public.employee_profiles
FOR EACH ROW EXECUTE FUNCTION public.deskflow_touch_updated_at();