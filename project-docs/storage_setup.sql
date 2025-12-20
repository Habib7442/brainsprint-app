-- Create Storage Bucket for Avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true);

-- Policy: Anyone can view avatars
create policy "Avatar images are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'avatars' );

-- Policy: Users can upload their own avatar
create policy "Users can upload their own avatar."
  on storage.objects for insert
  with check ( bucket_id = 'avatars' and auth.uid() = (storage.foldername(name))[1]::uuid );

-- Policy: Users can update their own avatar
create policy "Users can update their own avatar."
  on storage.objects for update
  using ( bucket_id = 'avatars' and auth.uid() = (storage.foldername(name))[1]::uuid );
