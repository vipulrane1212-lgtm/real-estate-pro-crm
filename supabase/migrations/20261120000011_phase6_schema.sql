-- ==============================================================================
-- Migration: 011_phase6_schema.sql
-- Diksha Real Estate CRM - Phase 6: Rentals, Employee Daily Reports, Client-Added Projects
-- Project ID: 012e3965-018a-44e8-9ccf-38c973e5eb89
-- ==============================================================================

-- 1. Rentals Table
CREATE TABLE IF NOT EXISTS public.rentals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_number BIGSERIAL,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    tenant_name TEXT NOT NULL,
    tenant_phone TEXT NOT NULL,
    tenant_email TEXT,
    tenant_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    tenant_id_number TEXT,
    owner_name TEXT,
    owner_phone TEXT,
    agent_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    monthly_rent NUMERIC(15, 2) NOT NULL,
    deposit_amount NUMERIC(15, 2) DEFAULT 0,
    rent_due_day INTEGER DEFAULT 5,
    agreement_start_date DATE NOT NULL,
    agreement_end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'pending_booking', 'notice_period', 'completed', 'terminated'
    brokerage_percentage NUMERIC(5, 2) DEFAULT 2.0,
    brokerage_amount NUMERIC(15, 2) DEFAULT 0,
    booking_amount NUMERIC(15, 2) DEFAULT 0,
    booking_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rentals_property ON public.rentals(property_id);
CREATE INDEX IF NOT EXISTS idx_rentals_agent ON public.rentals(agent_id);
CREATE INDEX IF NOT EXISTS idx_rentals_status ON public.rentals(status);
CREATE INDEX IF NOT EXISTS idx_rentals_agreement_end ON public.rentals(agreement_end_date);

CREATE TRIGGER tr_rentals_updated_at
    BEFORE UPDATE ON public.rentals
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER tr_audit_rentals
    AFTER INSERT OR UPDATE OR DELETE ON public.rentals
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger_fn();

-- 2. Rent Payments / Collections Table
CREATE TABLE IF NOT EXISTS public.rent_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_id UUID NOT NULL REFERENCES public.rentals(id) ON DELETE CASCADE,
    month_year TEXT NOT NULL, -- e.g. '2026-11'
    due_date DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'overdue'
    paid_date DATE,
    payment_mode TEXT, -- 'upi', 'bank_transfer', 'cash', 'cheque'
    transaction_reference TEXT,
    notes TEXT,
    collected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_rental_month UNIQUE (rental_id, month_year)
);

CREATE INDEX IF NOT EXISTS idx_rent_payments_rental ON public.rent_payments(rental_id);
CREATE INDEX IF NOT EXISTS idx_rent_payments_month ON public.rent_payments(month_year);
CREATE INDEX IF NOT EXISTS idx_rent_payments_status ON public.rent_payments(status);

CREATE TRIGGER tr_rent_payments_updated_at
    BEFORE UPDATE ON public.rent_payments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER tr_audit_rent_payments
    AFTER INSERT OR UPDATE OR DELETE ON public.rent_payments
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger_fn();

-- 3. Connect Brokerage Table with Rentals
ALTER TABLE public.brokerage ALTER COLUMN deal_id DROP NOT NULL;
ALTER TABLE public.brokerage ADD COLUMN IF NOT EXISTS rental_id UUID REFERENCES public.rentals(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_brokerage_rental ON public.brokerage(rental_id);

-- 4. Client-Added Project Submissions Table
CREATE TABLE IF NOT EXISTS public.project_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_name TEXT NOT NULL,
    project_type TEXT NOT NULL DEFAULT 'flat', -- 'flat', 'land', 'commercial', 'other'
    location TEXT NOT NULL,
    price_range TEXT,
    price_min NUMERIC(15, 2),
    price_max NUMERIC(15, 2),
    description TEXT,
    photos TEXT[] DEFAULT '{}',
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    client_email TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    admin_notes TEXT,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_submissions_status ON public.project_submissions(status);
CREATE INDEX IF NOT EXISTS idx_project_submissions_created_at ON public.project_submissions(created_at DESC);

CREATE TRIGGER tr_project_submissions_updated_at
    BEFORE UPDATE ON public.project_submissions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER tr_audit_project_submissions
    AFTER INSERT OR UPDATE OR DELETE ON public.project_submissions
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger_fn();

-- 5. Row Level Security Policies
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_submissions ENABLE ROW LEVEL SECURITY;

-- Rentals RLS
CREATE POLICY "Rentals select policy" ON public.rentals
    FOR SELECT TO authenticated
    USING (
        is_admin() OR
        agent_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    );

CREATE POLICY "Rentals insert policy" ON public.rentals
    FOR INSERT TO authenticated
    WITH CHECK (
        is_admin() OR
        agent_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    );

CREATE POLICY "Rentals update policy" ON public.rentals
    FOR UPDATE TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "Rentals delete policy" ON public.rentals
    FOR DELETE TO authenticated
    USING (is_admin());

-- Rent Payments RLS
CREATE POLICY "Rent payments select policy" ON public.rent_payments
    FOR SELECT TO authenticated
    USING (
        is_admin() OR
        rental_id IN (
            SELECT id FROM public.rentals 
            WHERE agent_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
        )
    );

CREATE POLICY "Rent payments write policy" ON public.rent_payments
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- Project Submissions RLS (Staff and admins can create/view submissions, admins can review)
CREATE POLICY "Project submissions select policy" ON public.project_submissions
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Project submissions insert policy" ON public.project_submissions
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Project submissions update policy" ON public.project_submissions
    FOR UPDATE TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "Project submissions delete policy" ON public.project_submissions
    FOR DELETE TO authenticated
    USING (is_admin());
