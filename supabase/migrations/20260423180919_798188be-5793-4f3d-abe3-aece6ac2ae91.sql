CREATE TABLE public.employee_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL,
  employee_name TEXT NOT NULL,
  employee_email TEXT NOT NULL,
  invite_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_by UUID,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_invites ENABLE ROW LEVEL SECURITY;

CREATE INDEX employee_invites_company_id_idx ON public.employee_invites(company_id);
CREATE INDEX employee_invites_token_idx ON public.employee_invites(invite_token);
CREATE INDEX employee_invites_email_idx ON public.employee_invites(employee_email);

CREATE TRIGGER employee_invites_updated_at
BEFORE UPDATE ON public.employee_invites
FOR EACH ROW
EXECUTE FUNCTION public.deskflow_touch_updated_at();

CREATE POLICY "Admins can view company invitations"
ON public.employee_invites
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND public.is_company_member(company_id)
);

CREATE POLICY "Employees can view valid token invitations"
ON public.employee_invites
FOR SELECT
TO anon, authenticated
USING (status = 'pending' AND expires_at > now());

CREATE OR REPLACE FUNCTION public.create_employee_invite(
  _company_id UUID,
  _employee_name TEXT,
  _employee_email TEXT
)
RETURNS public.employee_invites
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite public.employee_invites%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.is_company_member(_company_id)) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF length(trim(_employee_name)) < 2 OR length(trim(_employee_name)) > 120 THEN
    RAISE EXCEPTION 'Employee name must be between 2 and 120 characters';
  END IF;

  IF trim(_employee_email) !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN
    RAISE EXCEPTION 'Valid employee email is required';
  END IF;

  INSERT INTO public.employee_invites (company_id, invited_by, employee_name, employee_email)
  VALUES (_company_id, auth.uid(), trim(_employee_name), lower(trim(_employee_email)))
  RETURNING * INTO _invite;

  RETURN _invite;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_employee_invite(
  _invite_token TEXT,
  _display_name TEXT DEFAULT NULL,
  _email TEXT DEFAULT NULL
)
RETURNS public.employee_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite public.employee_invites%ROWTYPE;
  _profile public.employee_profiles%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO _invite
  FROM public.employee_invites
  WHERE invite_token = trim(_invite_token)
    AND status = 'pending'
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation is invalid or expired';
  END IF;

  INSERT INTO public.employee_profiles (user_id, company_id, display_name, email)
  VALUES (
    auth.uid(),
    _invite.company_id,
    coalesce(nullif(trim(coalesce(_display_name, '')), ''), _invite.employee_name),
    coalesce(nullif(lower(trim(coalesce(_email, ''))), ''), _invite.employee_email)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    company_id = EXCLUDED.company_id,
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email
  RETURNING * INTO _profile;

  INSERT INTO public.user_roles (user_id, role, company_id)
  VALUES (auth.uid(), 'user', _invite.company_id)
  ON CONFLICT DO NOTHING;

  UPDATE public.employee_invites
  SET status = 'accepted', accepted_by = auth.uid(), accepted_at = now()
  WHERE id = _invite.id;

  RETURN _profile;
END;
$$;