-- ==============================================================================
-- Migration: 005_seed_and_security.sql
-- Diksha Real Estate CRM - Default Role Permissions & Initial Company Seed
-- Project ID: 012e3965-018a-44e8-9ccf-38c973e5eb89
-- ==============================================================================

-- 1. Insert Initial Company Profile Record if empty
INSERT INTO public.company_settings (
    company_name,
    logo_url,
    phone,
    whatsapp_number,
    address,
    email,
    website
)
SELECT 
    'Diksha Real Estate',
    NULL,
    '+91 98765 43210',
    '+91 98765 43210',
    'Level 8, Supreme Chambers, Andheri West, Mumbai, Maharashtra 400053',
    'info@diksharealestate.com',
    'https://diksharealestate.com'
WHERE NOT EXISTS (SELECT 1 FROM public.company_settings);

-- 2. Seed Default Role Permissions Matrix
-- Modules: leads, properties, follow_ups, site_visits, documents, calls, accounts, reports, employees, settings
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete)
VALUES
    -- Super Admin (Full access to all modules)
    ('super_admin', 'leads', true, true, true, true),
    ('super_admin', 'properties', true, true, true, true),
    ('super_admin', 'follow_ups', true, true, true, true),
    ('super_admin', 'site_visits', true, true, true, true),
    ('super_admin', 'documents', true, true, true, true),
    ('super_admin', 'calls', true, true, true, true),
    ('super_admin', 'accounts', true, true, true, true),
    ('super_admin', 'reports', true, true, true, true),
    ('super_admin', 'employees', true, true, true, true),
    ('super_admin', 'settings', true, true, true, true),

    -- Admin (Full access except deleting company settings)
    ('admin', 'leads', true, true, true, true),
    ('admin', 'properties', true, true, true, true),
    ('admin', 'follow_ups', true, true, true, true),
    ('admin', 'site_visits', true, true, true, true),
    ('admin', 'documents', true, true, true, true),
    ('admin', 'calls', true, true, true, true),
    ('admin', 'accounts', true, true, true, true),
    ('admin', 'reports', true, true, true, true),
    ('admin', 'employees', true, true, true, true),
    ('admin', 'settings', true, false, true, false),

    -- Employee (Assigned data only, limited modules)
    ('employee', 'leads', true, true, true, false),
    ('employee', 'properties', true, false, false, false),
    ('employee', 'follow_ups', true, true, true, false),
    ('employee', 'site_visits', true, true, true, false),
    ('employee', 'documents', true, true, false, false),
    ('employee', 'calls', true, true, false, false),
    ('employee', 'accounts', false, false, false, false),
    ('employee', 'reports', false, false, false, false),
    ('employee', 'employees', false, false, false, false),
    ('employee', 'settings', false, false, false, false)
ON CONFLICT (role, module) DO UPDATE SET
    can_view = EXCLUDED.can_view,
    can_create = EXCLUDED.can_create,
    can_edit = EXCLUDED.can_edit,
    can_delete = EXCLUDED.can_delete;

-- 3. Stored procedure for easy Super Admin promotion in production setup
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(p_email TEXT, p_role user_role DEFAULT 'admin')
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found in auth.users', p_email;
    END IF;

    UPDATE public.profiles
    SET role = p_role, updated_at = now()
    WHERE id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
