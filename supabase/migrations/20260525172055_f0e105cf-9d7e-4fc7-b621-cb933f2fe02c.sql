
-- 1. company_profiles: drop overly broad public lookup policy
DROP POLICY IF EXISTS "Public can lookup company by code" ON public.company_profiles;

-- 2. employee_invites: drop anon access to invite tokens
DROP POLICY IF EXISTS "Employees can view valid token invitations" ON public.employee_invites;

-- 3. resume-bank storage: enforce admin role + company folder structure
DROP POLICY IF EXISTS "Admins and managers upload resume files" ON storage.objects;
DROP POLICY IF EXISTS "Admins and managers update resume files" ON storage.objects;
DROP POLICY IF EXISTS "Admins and managers delete resume files" ON storage.objects;

CREATE POLICY "Admins upload resume files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'resume-bank'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
  AND public.is_company_member(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Admins update resume files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'resume-bank'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
  AND public.is_company_member(((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = 'resume-bank'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
  AND public.is_company_member(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Admins delete resume files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'resume-bank'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
  AND public.is_company_member(((storage.foldername(name))[1])::uuid)
);

-- 4. it_software_licenses: hide license_key column from non-admins via column-level revoke
REVOKE SELECT (license_key) ON public.it_software_licenses FROM authenticated, anon;
GRANT SELECT (
  id, company_id, software_name, vendor, license_type, total_seats,
  start_date, expiry_date, duration_months, cost, currency,
  renewal_alert_days, notes, created_by, created_at, updated_at
) ON public.it_software_licenses TO authenticated;

-- Provide admin-only RPC to read the license key when needed
CREATE OR REPLACE FUNCTION public.get_software_license_key(_license_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _company uuid;
  _key text;
BEGIN
  SELECT company_id, license_key INTO _company, _key
  FROM public.it_software_licenses WHERE id = _license_id;
  IF _company IS NULL THEN RETURN NULL; END IF;
  IF NOT (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.is_company_member(_company)) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  RETURN _key;
END; $$;

-- 5. ticket-attachments: restrict to authenticated owner/admin reads
DROP POLICY IF EXISTS "Public can view ticket attachments" ON storage.objects;

CREATE POLICY "Authenticated view own ticket attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'ticket-attachments'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.is_super_admin()
  )
);

-- Make bucket private (so direct public URLs no longer work)
UPDATE storage.buckets SET public = false WHERE id = 'ticket-attachments';
