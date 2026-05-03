ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS hold_reason text,
  ADD COLUMN IF NOT EXISTS opened_for text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS contact_type text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS subcategory text;

ALTER TABLE public.support_tickets
  ALTER COLUMN status SET DEFAULT 'new'::public.support_ticket_status;

ALTER TABLE public.support_ticket_comments
  ADD COLUMN IF NOT EXISTS attachments text[] NOT NULL DEFAULT '{}';

INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can view ticket attachments" ON storage.objects;
CREATE POLICY "Public can view ticket attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'ticket-attachments');

DROP POLICY IF EXISTS "Authenticated can upload ticket attachments" ON storage.objects;
CREATE POLICY "Authenticated can upload ticket attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'ticket-attachments');

DROP POLICY IF EXISTS "Users can delete own ticket attachments" ON storage.objects;
CREATE POLICY "Users can delete own ticket attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'ticket-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);