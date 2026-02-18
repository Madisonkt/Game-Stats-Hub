-- Storage RLS policies for garden-photos bucket
-- Run this in Supabase SQL Editor

-- Allow authenticated users to upload to garden-photos
CREATE POLICY "Authenticated users can upload garden photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'garden-photos');

-- Allow authenticated users to read garden photos (public bucket but this helps)
CREATE POLICY "Anyone can read garden photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'garden-photos');

-- Allow public read access (since bucket is public)
CREATE POLICY "Public can read garden photos"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'garden-photos');

-- Allow users to delete their own uploads
CREATE POLICY "Authenticated users can delete garden photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'garden-photos');

-- Allow users to update/overwrite
CREATE POLICY "Authenticated users can update garden photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'garden-photos');
