
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Profile photos are publicly viewable" ON storage.objects;
CREATE POLICY "Profile photos are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos');

DROP POLICY IF EXISTS "Users upload own profile photo" ON storage.objects;
CREATE POLICY "Users upload own profile photo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users update own profile photo" ON storage.objects;
CREATE POLICY "Users update own profile photo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users delete own profile photo" ON storage.objects;
CREATE POLICY "Users delete own profile photo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
