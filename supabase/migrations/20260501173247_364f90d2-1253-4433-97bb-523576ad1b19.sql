-- Companies: status + address + contact info
ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS address_line1 text,
  ADD COLUMN IF NOT EXISTS address_line2 text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid;

-- Grandfather existing companies as approved
UPDATE public.company_profiles SET status = 'approved', approved_at = now() WHERE status = 'pending';

-- Employee profile status
ALTER TABLE public.employee_profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid;

UPDATE public.employee_profiles SET status = 'approved', approved_at = now() WHERE status = 'pending';

-- Super admin helper
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
$$;

-- RLS: super admins can see everything
DROP POLICY IF EXISTS "Super admins can view all companies" ON public.company_profiles;
CREATE POLICY "Super admins can view all companies"
ON public.company_profiles FOR SELECT TO authenticated
USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins can update companies" ON public.company_profiles;
CREATE POLICY "Super admins can update companies"
ON public.company_profiles FOR UPDATE TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins can view all employees" ON public.employee_profiles;
CREATE POLICY "Super admins can view all employees"
ON public.employee_profiles FOR SELECT TO authenticated
USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins can update employees" ON public.employee_profiles;
CREATE POLICY "Super admins can update employees"
ON public.employee_profiles FOR UPDATE TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins can view all roles" ON public.user_roles;
CREATE POLICY "Super admins can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins can manage roles" ON public.user_roles;
CREATE POLICY "Super admins can manage roles"
ON public.user_roles FOR ALL TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Approve / suspend RPCs
CREATE OR REPLACE FUNCTION public.approve_company(_company_id uuid)
RETURNS public.company_profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _c public.company_profiles%ROWTYPE;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Super admin access required'; END IF;
  UPDATE public.company_profiles SET status='approved', approved_at=now(), approved_by=auth.uid()
  WHERE id=_company_id RETURNING * INTO _c;
  RETURN _c;
END; $$;

CREATE OR REPLACE FUNCTION public.suspend_company(_company_id uuid)
RETURNS public.company_profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _c public.company_profiles%ROWTYPE;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Super admin access required'; END IF;
  UPDATE public.company_profiles SET status='suspended' WHERE id=_company_id RETURNING * INTO _c;
  RETURN _c;
END; $$;

CREATE OR REPLACE FUNCTION public.approve_employee(_employee_id uuid)
RETURNS public.employee_profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _e public.employee_profiles%ROWTYPE;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Super admin access required'; END IF;
  UPDATE public.employee_profiles SET status='approved', approved_at=now(), approved_by=auth.uid()
  WHERE id=_employee_id RETURNING * INTO _e;
  RETURN _e;
END; $$;

CREATE OR REPLACE FUNCTION public.suspend_employee(_employee_id uuid)
RETURNS public.employee_profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _e public.employee_profiles%ROWTYPE;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Super admin access required'; END IF;
  UPDATE public.employee_profiles SET status='suspended' WHERE id=_employee_id RETURNING * INTO _e;
  RETURN _e;
END; $$;

CREATE OR REPLACE FUNCTION public.grant_super_admin(_email text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Super admin access required'; END IF;
  SELECT id INTO _uid FROM auth.users WHERE lower(email)=lower(trim(_email)) LIMIT 1;
  IF _uid IS NULL THEN RAISE EXCEPTION 'User with that email not found'; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'super_admin') ON CONFLICT DO NOTHING;
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.revoke_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Super admin access required'; END IF;
  DELETE FROM public.user_roles WHERE user_id=_user_id AND role='super_admin';
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _result jsonb; _companies int; _approved int; _pending int; _suspended int; _employees int; _emp_pending int;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Super admin access required'; END IF;
  SELECT count(*), count(*) FILTER (WHERE status='approved'), count(*) FILTER (WHERE status='pending'), count(*) FILTER (WHERE status='suspended')
    INTO _companies, _approved, _pending, _suspended FROM public.company_profiles;
  SELECT count(*), count(*) FILTER (WHERE status='pending') INTO _employees, _emp_pending FROM public.employee_profiles;
  _result := jsonb_build_object(
    'companies_total', _companies,
    'companies_approved', _approved,
    'companies_pending', _pending,
    'companies_suspended', _suspended,
    'employees_total', _employees,
    'employees_pending', _emp_pending
  );
  RETURN _result;
END; $$;