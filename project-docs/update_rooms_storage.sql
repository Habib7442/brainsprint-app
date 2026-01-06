-- Add cover_image_url to rooms table
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS cover_image_url text;

-- Create Storage Bucket for 'room_assets' (Images, PDFs if needed)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('room_assets', 'room_assets', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for Storage
-- Allow public read access
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'room_assets' );

-- Allow authenticated users to upload
CREATE POLICY "Auth Users Upload" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'room_assets' AND auth.role() = 'authenticated' );

-- Allow creators to update/delete their own files (optional, but good practice)
-- We track ownership via path convention or metadata normally, but for now simple insert is enough.
