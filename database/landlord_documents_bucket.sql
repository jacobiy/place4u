-- ==============================================================================
-- Place4U: Landlord Documents & Proof of Ownership Storage Bucket
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rfajxzjrzmckroitcqxz/sql
-- ==============================================================================

-- 1. Create or Update the 'landlord-documents' Storage Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'landlord-documents',
  'landlord-documents',
  true,                -- Public read allows direct document previewing & downloads
  20971520,            -- 20 MB max file size limit
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

-- 2. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "landlord_documents_public_select" ON storage.objects;
DROP POLICY IF EXISTS "landlord_documents_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "landlord_documents_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "landlord_documents_auth_delete" ON storage.objects;

-- 3. SELECT Policy: Allow viewing and downloading documents
CREATE POLICY "landlord_documents_public_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'landlord-documents');

-- 4. INSERT Policy: Authenticated users can upload documents to their folder
CREATE POLICY "landlord_documents_auth_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'landlord-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR owner = auth.uid()
    OR auth.role() = 'authenticated'
  )
);

-- 5. UPDATE Policy: Users can update their own documents
CREATE POLICY "landlord_documents_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'landlord-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR owner = auth.uid()
    OR auth.role() = 'authenticated'
  )
);

-- 6. DELETE Policy: Users can delete their own documents
CREATE POLICY "landlord_documents_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'landlord-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR owner = auth.uid()
    OR auth.role() = 'authenticated'
  )
);
