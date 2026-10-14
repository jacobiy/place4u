-- ==============================================================================
-- Place4U: Profile Picture Storage Bucket
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rfajxzjrzmckroitcqxz/sql
--
-- Powers avatar uploads for tenants (and is shared with landlords/agents, who
-- use the same bucket under their own folder). Object paths follow:
--   tenant-profiles/<userId>/profile-<timestamp>.<ext>
--   landlord-profiles/<userId>/profile-<timestamp>.<ext>
-- ==============================================================================

-- 1. Create or Update the 'profiles' Storage Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profiles',
  'profiles',
  true,               -- Public read so avatars can render with a plain <img src>
  5242880,            -- 5 MB max file size limit
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif'
  ];

-- 2. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "profiles_public_select" ON storage.objects;
DROP POLICY IF EXISTS "profiles_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "profiles_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "profiles_auth_delete" ON storage.objects;

-- 3. SELECT Policy: avatars are publicly readable
CREATE POLICY "profiles_public_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'profiles');

-- 4. INSERT Policy: a user may only upload into their own folder
--    (either <userId>/... or <namespace>/<userId>/...)
CREATE POLICY "profiles_auth_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profiles'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR (storage.foldername(name))[2] = auth.uid()::text
    OR owner = auth.uid()
  )
);

-- 5. UPDATE Policy: a user may only replace their own avatar
CREATE POLICY "profiles_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profiles'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR (storage.foldername(name))[2] = auth.uid()::text
    OR owner = auth.uid()
  )
);

-- 6. DELETE Policy: a user may only delete their own avatar
CREATE POLICY "profiles_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profiles'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR (storage.foldername(name))[2] = auth.uid()::text
    OR owner = auth.uid()
  )
);
