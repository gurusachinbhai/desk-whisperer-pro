
CREATE POLICY "Users manage own biometric files"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'biometric-enrollments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'biometric-enrollments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Admins view company biometric files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'biometric-enrollments'
    AND EXISTS (
      SELECT 1 FROM public.biometric_enrollments be
      WHERE be.face_image_path = storage.objects.name
        AND public.has_role(auth.uid(), 'admin'::public.app_role)
        AND public.is_company_member(be.company_id)
    )
  );
