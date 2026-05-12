
-- 1. Subscription columns on company_profiles
ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS subscription_plan text,
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS subscription_seats integer,
  ADD COLUMN IF NOT EXISTS subscription_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_renews_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_amount numeric,
  ADD COLUMN IF NOT EXISTS subscription_currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS subscribed_by uuid;

-- 2. Trigger to enforce max 3 admins per company
CREATE OR REPLACE FUNCTION public.enforce_max_admins_per_company()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE _count int;
BEGIN
  IF NEW.role = 'admin' AND NEW.company_id IS NOT NULL THEN
    SELECT count(*) INTO _count
    FROM public.user_roles
    WHERE role = 'admin'
      AND company_id = NEW.company_id
      AND (TG_OP = 'INSERT' OR id <> NEW.id);
    IF _count >= 3 THEN
      RAISE EXCEPTION 'A company can have at most 3 admins'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_max_admins_per_company ON public.user_roles;
CREATE TRIGGER trg_enforce_max_admins_per_company
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_max_admins_per_company();

-- 3. Lookup user names/emails (super admin only)
CREATE OR REPLACE FUNCTION public.lookup_user_names(_user_ids uuid[])
RETURNS TABLE(user_id uuid, email text, display_name text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Super admin access required';
  END IF;
  RETURN QUERY
  SELECT u.id AS user_id,
         u.email::text AS email,
         COALESCE(
           (SELECT ep.display_name FROM public.employee_profiles ep WHERE ep.user_id = u.id ORDER BY ep.created_at LIMIT 1),
           split_part(u.email, '@', 1)
         ) AS display_name
  FROM auth.users u
  WHERE u.id = ANY(_user_ids);
END;
$$;

-- 4. Update company profile (super admin)
CREATE OR REPLACE FUNCTION public.update_company_profile(
  _company_id uuid,
  _name text,
  _domain text,
  _address_line1 text,
  _address_line2 text,
  _city text,
  _state text,
  _postal_code text,
  _country text,
  _contact_name text,
  _contact_email text,
  _contact_phone text,
  _subscription_plan text,
  _subscription_status text,
  _subscription_seats integer,
  _subscription_amount numeric,
  _subscription_currency text,
  _subscription_started_at timestamptz,
  _subscription_renews_at timestamptz
)
RETURNS public.company_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _c public.company_profiles%ROWTYPE;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Super admin access required';
  END IF;
  UPDATE public.company_profiles SET
    name = COALESCE(NULLIF(trim(_name), ''), name),
    domain = NULLIF(trim(COALESCE(_domain,'')), ''),
    address_line1 = NULLIF(trim(COALESCE(_address_line1,'')), ''),
    address_line2 = NULLIF(trim(COALESCE(_address_line2,'')), ''),
    city = NULLIF(trim(COALESCE(_city,'')), ''),
    state = NULLIF(trim(COALESCE(_state,'')), ''),
    postal_code = NULLIF(trim(COALESCE(_postal_code,'')), ''),
    country = NULLIF(trim(COALESCE(_country,'')), ''),
    contact_name = NULLIF(trim(COALESCE(_contact_name,'')), ''),
    contact_email = NULLIF(trim(COALESCE(_contact_email,'')), ''),
    contact_phone = NULLIF(trim(COALESCE(_contact_phone,'')), ''),
    subscription_plan = NULLIF(trim(COALESCE(_subscription_plan,'')), ''),
    subscription_status = COALESCE(NULLIF(trim(COALESCE(_subscription_status,'')), ''), subscription_status),
    subscription_seats = _subscription_seats,
    subscription_amount = _subscription_amount,
    subscription_currency = COALESCE(NULLIF(trim(COALESCE(_subscription_currency,'')), ''), subscription_currency),
    subscription_started_at = _subscription_started_at,
    subscription_renews_at = _subscription_renews_at,
    subscribed_by = CASE WHEN _subscription_plan IS NOT NULL AND subscribed_by IS NULL THEN auth.uid() ELSE subscribed_by END,
    updated_at = now()
  WHERE id = _company_id
  RETURNING * INTO _c;
  RETURN _c;
END;
$$;
