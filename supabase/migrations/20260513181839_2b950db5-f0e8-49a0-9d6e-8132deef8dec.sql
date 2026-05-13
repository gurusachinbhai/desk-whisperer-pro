-- Audit log table for admin role changes
CREATE TABLE IF NOT EXISTS public.admin_role_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  target_user_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('granted', 'revoked')),
  performed_by uuid,
  performed_at timestamptz NOT NULL DEFAULT now(),
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_admin_role_audit_company ON public.admin_role_audit(company_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_role_audit_target ON public.admin_role_audit(target_user_id, performed_at DESC);

ALTER TABLE public.admin_role_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins view all admin audit"
  ON public.admin_role_audit FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "Company admins view their company admin audit"
  ON public.admin_role_audit FOR SELECT
  TO authenticated
  USING (
    company_id IS NOT NULL
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
    AND public.is_company_member(company_id)
  );

-- Trigger function to log admin role grants/revokes
CREATE OR REPLACE FUNCTION public.log_admin_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.role = 'admin' THEN
      INSERT INTO public.admin_role_audit (company_id, target_user_id, action, performed_by)
      VALUES (NEW.company_id, NEW.user_id, 'granted', auth.uid());
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.role = 'admin' THEN
      INSERT INTO public.admin_role_audit (company_id, target_user_id, action, performed_by)
      VALUES (OLD.company_id, OLD.user_id, 'revoked', auth.uid());
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_admin_role_insert ON public.user_roles;
CREATE TRIGGER trg_log_admin_role_insert
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_admin_role_change();

DROP TRIGGER IF EXISTS trg_log_admin_role_delete ON public.user_roles;
CREATE TRIGGER trg_log_admin_role_delete
  AFTER DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_admin_role_change();