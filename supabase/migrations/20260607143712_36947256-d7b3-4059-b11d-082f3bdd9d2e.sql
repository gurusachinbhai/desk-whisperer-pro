
-- Harden ticket-attachments storage: enforce path = {company_id}/{user_id}/{file}
-- Keep legacy {user_id}/{file} paths viewable by same-company members for back-compat.

DROP POLICY IF EXISTS "Authenticated can upload ticket attachments" ON storage.objects;
CREATE POLICY "Authenticated can upload ticket attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ticket-attachments'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND (storage.foldername(name))[2] IS NOT NULL
  -- first segment must be a company the uploader belongs to
  AND public.is_company_member(((storage.foldername(name))[1])::uuid)
  -- second segment must be uploader's own user id
  AND auth.uid()::text = (storage.foldername(name))[2]
);

DROP POLICY IF EXISTS "Authenticated view own ticket attachments" ON storage.objects;
CREATE POLICY "Authenticated view own ticket attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'ticket-attachments'
  AND (
    -- New layout: {company_id}/{user_id}/...
    (
      (storage.foldername(name))[2] IS NOT NULL
      AND public.is_company_member(((storage.foldername(name))[1])::uuid)
      AND (
        auth.uid()::text = (storage.foldername(name))[2]
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
    )
    -- Legacy layout: {user_id}/... — uploader or same-company admin
    OR (
      (storage.foldername(name))[2] IS NULL
      AND (
        auth.uid()::text = (storage.foldername(name))[1]
        OR (
          public.has_role(auth.uid(), 'admin'::public.app_role)
          AND EXISTS (
            SELECT 1 FROM public.employee_profiles ep
            WHERE ep.user_id::text = (storage.foldername(name))[1]
              AND public.is_company_member(ep.company_id)
          )
        )
      )
    )
    OR public.is_super_admin()
  )
);

DROP POLICY IF EXISTS "Uploader can delete own ticket attachments" ON storage.objects;
CREATE POLICY "Uploader can delete own ticket attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'ticket-attachments'
  AND (
    (
      (storage.foldername(name))[2] IS NOT NULL
      AND public.is_company_member(((storage.foldername(name))[1])::uuid)
      AND auth.uid()::text = (storage.foldername(name))[2]
    )
    OR (
      (storage.foldername(name))[2] IS NULL
      AND auth.uid()::text = (storage.foldername(name))[1]
    )
    OR public.is_super_admin()
  )
);
