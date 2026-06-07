
DROP POLICY IF EXISTS "Authenticated view own ticket attachments" ON storage.objects;

CREATE POLICY "Authenticated view own ticket attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'ticket-attachments'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR public.is_super_admin()
      OR (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        AND EXISTS (
          SELECT 1
          FROM public.employee_profiles ep
          WHERE ep.user_id::text = (storage.foldername(name))[1]
            AND public.is_company_member(ep.company_id)
        )
      )
    )
  );
