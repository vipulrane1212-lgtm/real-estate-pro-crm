-- ==============================================================================
-- Migration: 004_storage_buckets.sql
-- Diksha Real Estate CRM - Private Storage Buckets & Storage RLS
-- Project ID: 012e3965-018a-44e8-9ccf-38c973e5eb89
-- ==============================================================================

-- 1. Create Private Storage Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('property-photos', 'property-photos', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
    ('documents', 'documents', false, 26214400, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
    ('call-recordings', 'call-recordings', false, 52428800, ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm']),
    ('company-assets', 'company-assets', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage Objects RLS Policies

-- PROPERTY PHOTOS (Private)
DROP POLICY IF EXISTS "Authenticated users can read property photos" ON storage.objects;
CREATE POLICY "Authenticated users can read property photos"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'property-photos');

DROP POLICY IF EXISTS "Staff can upload property photos" ON storage.objects;
CREATE POLICY "Staff can upload property photos"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'property-photos'
        AND (public.is_admin() OR auth.uid() IS NOT NULL)
    );

DROP POLICY IF EXISTS "Admins can delete property photos" ON storage.objects;
CREATE POLICY "Admins can delete property photos"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'property-photos' AND public.is_admin());

-- DOCUMENTS (Private)
DROP POLICY IF EXISTS "Authenticated users can read authorized documents" ON storage.objects;
CREATE POLICY "Authenticated users can read authorized documents"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'documents'
        AND (public.is_admin() OR (storage.foldername(name))[1] = auth.uid()::text)
    );

DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload documents"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'documents'
        AND (public.is_admin() OR (storage.foldername(name))[1] = auth.uid()::text)
    );

DROP POLICY IF EXISTS "Admins can delete documents" ON storage.objects;
CREATE POLICY "Admins can delete documents"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'documents' AND public.is_admin());

-- CALL RECORDINGS (Private)
DROP POLICY IF EXISTS "Authorized users can read call recordings" ON storage.objects;
CREATE POLICY "Authorized users can read call recordings"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'call-recordings'
        AND (public.is_admin() OR (storage.foldername(name))[1] = auth.uid()::text)
    );

DROP POLICY IF EXISTS "Staff can upload call recordings" ON storage.objects;
CREATE POLICY "Staff can upload call recordings"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'call-recordings'
        AND (public.is_admin() OR (storage.foldername(name))[1] = auth.uid()::text)
    );

-- COMPANY ASSETS (Publicly readable / Admin writable)
DROP POLICY IF EXISTS "Anyone can view company assets" ON storage.objects;
CREATE POLICY "Anyone can view company assets"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'company-assets');

DROP POLICY IF EXISTS "Admins can manage company assets" ON storage.objects;
CREATE POLICY "Admins can manage company assets"
    ON storage.objects FOR ALL
    TO authenticated
    USING (bucket_id = 'company-assets' AND public.is_admin())
    WITH CHECK (bucket_id = 'company-assets' AND public.is_admin());
