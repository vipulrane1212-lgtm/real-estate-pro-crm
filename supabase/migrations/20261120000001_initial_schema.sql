-- ==============================================================================
-- Migration: 001_initial_schema.sql
-- Diksha Real Estate CRM - Core Foundation & Auth Schema
-- Project ID: 012e3965-018a-44e8-9ccf-38c973e5eb89
-- ==============================================================================

-- 1. Custom Types & Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'employee');
    END IF;
END$$;

-- 2. Updated At Trigger Function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Profiles Table (FK to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'employee',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- Profiles Trigger
DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 4. Employees Table
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    designation TEXT NOT NULL,
    joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
    permissions JSONB NOT NULL DEFAULT '{
        "leads": {"view": true, "create": true, "edit": true, "delete": false},
        "properties": {"view": true, "create": false, "edit": false, "delete": false},
        "follow_ups": {"view": true, "create": true, "edit": true, "delete": false},
        "site_visits": {"view": true, "create": true, "edit": true, "delete": false},
        "documents": {"view": true, "create": true, "edit": false, "delete": false},
        "calls": {"view": true, "create": true, "edit": false, "delete": false},
        "accounts": {"view": false, "create": false, "edit": false, "delete": false},
        "reports": {"view": false, "create": false, "edit": false, "delete": false}
    }'::jsonb,
    manager_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Employees Indexes
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_manager_id ON public.employees(manager_id);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON public.employees(is_active);

-- Employees Trigger
DROP TRIGGER IF EXISTS tr_employees_updated_at ON public.employees;
CREATE TRIGGER tr_employees_updated_at
    BEFORE UPDATE ON public.employees
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 5. Role Permissions Matrix Table
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role user_role NOT NULL,
    module TEXT NOT NULL,
    can_view BOOLEAN NOT NULL DEFAULT false,
    can_create BOOLEAN NOT NULL DEFAULT false,
    can_edit BOOLEAN NOT NULL DEFAULT false,
    can_delete BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_role_permission UNIQUE (role, module)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_module ON public.role_permissions(module);

-- 6. Company Settings Table (Diksha Real Estate Profile)
CREATE TABLE IF NOT EXISTS public.company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL DEFAULT 'Diksha Real Estate',
    logo_url TEXT,
    phone TEXT DEFAULT '+91 98765 43210',
    whatsapp_number TEXT DEFAULT '+91 98765 43210',
    address TEXT DEFAULT 'Corporate Office, Mumbai, India',
    email TEXT DEFAULT 'contact@diksharealestate.com',
    website TEXT DEFAULT 'https://diksharealestate.com',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS tr_company_settings_updated_at ON public.company_settings;
CREATE TRIGGER tr_company_settings_updated_at
    BEFORE UPDATE ON public.company_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 7. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 8. Security Helper Functions
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid() AND is_active = true;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND is_active = true
          AND role IN ('super_admin', 'admin')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND is_active = true
          AND role = 'super_admin'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_current_employee_id()
RETURNS UUID AS $$
    SELECT id FROM public.employees
    WHERE user_id = auth.uid() AND is_active = true;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 9. Auto-create Profile on Auth Signup Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, phone, role, is_active)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'phone',
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'employee'),
        true
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. Enable Row Level Security (RLS) on Base Tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 11. Base RLS Policies
-- Profiles Policies
DROP POLICY IF EXISTS "Profiles readable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles readable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        public.is_admin() OR id = auth.uid()
    );

DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins or self can update profiles" ON public.profiles;
CREATE POLICY "Admins or self can update profiles"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (public.is_admin() OR id = auth.uid())
    WITH CHECK (
        public.is_admin() OR (id = auth.uid() AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()))
    );

-- Employees Policies
DROP POLICY IF EXISTS "Employees readable by authenticated team" ON public.employees;
CREATE POLICY "Employees readable by authenticated team"
    ON public.employees FOR SELECT
    TO authenticated
    USING (
        public.is_admin() OR user_id = auth.uid() OR manager_id = public.get_current_employee_id()
    );

DROP POLICY IF EXISTS "Only Admins can insert employees" ON public.employees;
CREATE POLICY "Only Admins can insert employees"
    ON public.employees FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Only Admins can update employees" ON public.employees;
CREATE POLICY "Only Admins can update employees"
    ON public.employees FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Role Permissions Policies
DROP POLICY IF EXISTS "Role permissions readable by authenticated users" ON public.role_permissions;
CREATE POLICY "Role permissions readable by authenticated users"
    ON public.role_permissions FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Only Super Admin and Admin can manage permissions" ON public.role_permissions;
CREATE POLICY "Only Super Admin and Admin can manage permissions"
    ON public.role_permissions FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Company Settings Policies
DROP POLICY IF EXISTS "Company settings readable by authenticated users" ON public.company_settings;
CREATE POLICY "Company settings readable by authenticated users"
    ON public.company_settings FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Only Admins can update company settings" ON public.company_settings;
CREATE POLICY "Only Admins can update company settings"
    ON public.company_settings FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Only Super Admin can delete company settings" ON public.company_settings;
CREATE POLICY "Only Super Admin can delete company settings"
    ON public.company_settings FOR DELETE
    TO authenticated
    USING (public.is_super_admin());

-- Audit Logs Policies (Admins view all, no direct mutation from client)
DROP POLICY IF EXISTS "Only Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Only Admins can view audit logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (public.is_admin());
