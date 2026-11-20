-- ==============================================================================
-- Migration: 006_local_admin_seed.sql
-- Seed Initial Super Admin Account for Local Environment
-- ==============================================================================

DO $$
DECLARE
    v_user_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
    INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data)
    VALUES (
        v_user_id,
        'admin@diksharealestate.com',
        crypt('AdminPassword123!', gen_salt('bf')),
        '{"full_name": "Diksha Super Admin", "role": "super_admin"}'::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
        encrypted_password = crypt('AdminPassword123!', gen_salt('bf')),
        email = 'admin@diksharealestate.com';

    INSERT INTO public.profiles (id, full_name, phone, role, is_active)
    VALUES (
        v_user_id,
        'Diksha Super Admin',
        '+91 98765 43210',
        'super_admin',
        true
    )
    ON CONFLICT (id) DO UPDATE SET
        role = 'super_admin',
        is_active = true,
        full_name = 'Diksha Super Admin';
END$$;
