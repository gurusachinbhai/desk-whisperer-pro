-- Tighten ticket-attachments INSERT policy to enforce per-user folder ownership
DROP POLICY IF EXISTS "Authenticated can upload ticket attachments" ON storage.objects;
CREATE POLICY "Authenticated can upload ticket attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ticket-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Tighten training-videos DELETE policy to enforce company membership
DROP POLICY IF EXISTS "Admins and managers delete training videos" ON storage.objects;
CREATE POLICY "Admins and managers delete training videos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'training-videos'
  AND public.is_company_member(((storage.foldername(name))[1])::uuid)
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.is_company_manager(((storage.foldername(name))[1])::uuid)
  )
);

-- Add admin DELETE policies for accounting tables for consistency with other accounting tables
CREATE POLICY "Admins delete acct expenses"
ON public.acct_expenses FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.is_company_member(company_id));

CREATE POLICY "Admins delete acct receipts"
ON public.acct_receipts FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.is_company_member(company_id));