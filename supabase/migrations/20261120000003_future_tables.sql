-- ==============================================================================
-- Migration: 003_future_tables.sql
-- Diksha Real Estate CRM - Business Schema (Future Tables)
-- Project ID: 012e3965-018a-44e8-9ccf-38c973e5eb89
-- ==============================================================================

-- 1. Helper function to check if an employee belongs to current user's team or self
CREATE OR REPLACE FUNCTION public.is_assigned_or_team(p_employee_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_curr_emp_id UUID;
BEGIN
    IF public.is_admin() THEN
        RETURN true;
    END IF;

    v_curr_emp_id := public.get_current_employee_id();
    IF v_curr_emp_id IS NULL THEN
        RETURN false;
    END IF;

    -- Return true if assigned to employee themselves OR if current employee is manager of assigned employee
    RETURN (
        p_employee_id = v_curr_emp_id
        OR EXISTS (
            SELECT 1 FROM public.employees
            WHERE id = p_employee_id AND manager_id = v_curr_emp_id
        )
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Leads Table
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_number BIGSERIAL,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    alternate_phone TEXT,
    status TEXT NOT NULL DEFAULT 'new', -- 'new', 'contacted', 'interested', 'site_visit_scheduled', 'negotiation', 'closed_won', 'closed_lost'
    source TEXT NOT NULL DEFAULT 'website', -- 'website', 'referral', 'whatsapp', 'direct_call', 'portal', 'walk_in'
    budget_min NUMERIC(15, 2),
    budget_max NUMERIC(15, 2),
    property_type TEXT, -- 'apartment', 'villa', 'plot', 'commercial', 'penthouse'
    preferred_location TEXT,
    requirement TEXT,
    assigned_to UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);

CREATE TRIGGER tr_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER tr_audit_leads
    AFTER INSERT OR UPDATE OR DELETE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger_fn();

-- 3. Properties Table
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_code TEXT UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    property_type TEXT NOT NULL, -- 'apartment', 'villa', 'commercial', 'land', 'penthouse'
    listing_type TEXT NOT NULL DEFAULT 'sale', -- 'sale', 'rent', 'lease'
    price NUMERIC(15, 2) NOT NULL,
    size_sqft NUMERIC(10, 2),
    bedrooms INT,
    bathrooms INT,
    address TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Mumbai',
    state TEXT NOT NULL DEFAULT 'Maharashtra',
    pincode TEXT,
    status TEXT NOT NULL DEFAULT 'available', -- 'available', 'under_offer', 'sold', 'rented', 'off_market'
    assigned_agent_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    photos JSONB DEFAULT '[]'::jsonb,
    amenities JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_properties_assigned_agent ON public.properties(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_type ON public.properties(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_city ON public.properties(city);

CREATE TRIGGER tr_properties_updated_at
    BEFORE UPDATE ON public.properties
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER tr_audit_properties
    AFTER INSERT OR UPDATE OR DELETE ON public.properties
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger_fn();

-- 4. Follow-ups Table
CREATE TABLE IF NOT EXISTS public.follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    assigned_to UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'rescheduled', 'cancelled'
    remarks TEXT,
    outcome TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_follow_ups_lead ON public.follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_assigned_to ON public.follow_ups(assigned_to);
CREATE INDEX IF NOT EXISTS idx_follow_ups_scheduled_at ON public.follow_ups(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON public.follow_ups(status);

CREATE TRIGGER tr_follow_ups_updated_at
    BEFORE UPDATE ON public.follow_ups
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER tr_audit_follow_ups
    AFTER INSERT OR UPDATE OR DELETE ON public.follow_ups
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger_fn();

-- 5. Site Visits Table
CREATE TABLE IF NOT EXISTS public.site_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    assigned_to UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    visit_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled', 'no_show'
    feedback TEXT,
    client_interest_level TEXT, -- 'hot', 'warm', 'cold'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_visits_lead ON public.site_visits(lead_id);
CREATE INDEX IF NOT EXISTS idx_site_visits_property ON public.site_visits(property_id);
CREATE INDEX IF NOT EXISTS idx_site_visits_assigned_to ON public.site_visits(assigned_to);
CREATE INDEX IF NOT EXISTS idx_site_visits_visit_date ON public.site_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_site_visits_status ON public.site_visits(status);

CREATE TRIGGER tr_site_visits_updated_at
    BEFORE UPDATE ON public.site_visits
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER tr_audit_site_visits
    AFTER INSERT OR UPDATE OR DELETE ON public.site_visits
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger_fn();

-- 6. Documents Table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    bucket_name TEXT NOT NULL DEFAULT 'documents',
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_lead ON public.documents(lead_id);
CREATE INDEX IF NOT EXISTS idx_documents_property ON public.documents(property_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON public.documents(uploaded_by);

CREATE TRIGGER tr_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER tr_audit_documents
    AFTER INSERT OR UPDATE OR DELETE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger_fn();

-- 7. Calls Table
CREATE TABLE IF NOT EXISTS public.calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    call_type TEXT NOT NULL DEFAULT 'outgoing', -- 'incoming', 'outgoing', 'missed'
    duration_seconds INT NOT NULL DEFAULT 0,
    recording_url TEXT,
    notes TEXT,
    call_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calls_lead ON public.calls(lead_id);
CREATE INDEX IF NOT EXISTS idx_calls_employee ON public.calls(employee_id);
CREATE INDEX IF NOT EXISTS idx_calls_time ON public.calls(call_time DESC);

CREATE TRIGGER tr_audit_calls
    AFTER INSERT OR UPDATE OR DELETE ON public.calls
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger_fn();

-- 8. Deals Table
CREATE TABLE IF NOT EXISTS public.deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE RESTRICT,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
    deal_value NUMERIC(15, 2) NOT NULL,
    commission_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    deal_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'closed_won', 'cancelled'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deals_lead ON public.deals(lead_id);
CREATE INDEX IF NOT EXISTS idx_deals_property ON public.deals(property_id);
CREATE INDEX IF NOT EXISTS idx_deals_employee ON public.deals(employee_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON public.deals(status);

CREATE TRIGGER tr_deals_updated_at
    BEFORE UPDATE ON public.deals
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER tr_audit_deals
    AFTER INSERT OR UPDATE OR DELETE ON public.deals
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger_fn();

-- 9. Brokerage Table
CREATE TABLE IF NOT EXISTS public.brokerage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    total_brokerage NUMERIC(15, 2) NOT NULL,
    paid_brokerage NUMERIC(15, 2) NOT NULL DEFAULT 0,
    pending_brokerage NUMERIC(15, 2) GENERATED ALWAYS AS (total_brokerage - paid_brokerage) STORED,
    payment_status TEXT NOT NULL DEFAULT 'unpaid', -- 'unpaid', 'partially_paid', 'fully_paid'
    payment_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brokerage_deal ON public.brokerage(deal_id);
CREATE INDEX IF NOT EXISTS idx_brokerage_agent ON public.brokerage(agent_id);
CREATE INDEX IF NOT EXISTS idx_brokerage_status ON public.brokerage(payment_status);

CREATE TRIGGER tr_brokerage_updated_at
    BEFORE UPDATE ON public.brokerage
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER tr_audit_brokerage
    AFTER INSERT OR UPDATE OR DELETE ON public.brokerage
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger_fn();

-- 10. Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL, -- 'marketing', 'office', 'travel', 'legal', 'maintenance', 'other'
    amount NUMERIC(15, 2) NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    paid_to TEXT,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    receipt_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_approved_by ON public.expenses(approved_by);

CREATE TRIGGER tr_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER tr_audit_expenses
    AFTER INSERT OR UPDATE OR DELETE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger_fn();

-- 11. Attendance Table
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'present', -- 'present', 'absent', 'half_day', 'on_leave'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_employee_attendance_date UNIQUE (employee_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_employee ON public.attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);

CREATE TRIGGER tr_audit_attendance
    AFTER INSERT OR UPDATE OR DELETE ON public.attendance
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger_fn();

-- ==============================================================================
-- 12. Enable RLS on ALL Future Tables
-- ==============================================================================
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brokerage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 13. RLS Policies for Future Tables (Admin = all; Employee = assigned/team)
-- ==============================================================================

-- LEADS POLICIES
DROP POLICY IF EXISTS "Leads select policy" ON public.leads;
CREATE POLICY "Leads select policy" ON public.leads FOR SELECT TO authenticated
    USING (public.is_admin() OR public.is_assigned_or_team(assigned_to));

DROP POLICY IF EXISTS "Leads insert policy" ON public.leads;
CREATE POLICY "Leads insert policy" ON public.leads FOR INSERT TO authenticated
    WITH CHECK (public.is_admin() OR public.is_assigned_or_team(assigned_to));

DROP POLICY IF EXISTS "Leads update policy" ON public.leads;
CREATE POLICY "Leads update policy" ON public.leads FOR UPDATE TO authenticated
    USING (public.is_admin() OR public.is_assigned_or_team(assigned_to))
    WITH CHECK (public.is_admin() OR public.is_assigned_or_team(assigned_to));

DROP POLICY IF EXISTS "Leads delete policy" ON public.leads;
CREATE POLICY "Leads delete policy" ON public.leads FOR DELETE TO authenticated
    USING (public.is_admin());

-- PROPERTIES POLICIES (All active team members can view properties; only Admin/Assigned edit)
DROP POLICY IF EXISTS "Properties select policy" ON public.properties;
CREATE POLICY "Properties select policy" ON public.properties FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Properties insert policy" ON public.properties;
CREATE POLICY "Properties insert policy" ON public.properties FOR INSERT TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Properties update policy" ON public.properties;
CREATE POLICY "Properties update policy" ON public.properties FOR UPDATE TO authenticated
    USING (public.is_admin() OR public.is_assigned_or_team(assigned_agent_id))
    WITH CHECK (public.is_admin() OR public.is_assigned_or_team(assigned_agent_id));

DROP POLICY IF EXISTS "Properties delete policy" ON public.properties;
CREATE POLICY "Properties delete policy" ON public.properties FOR DELETE TO authenticated
    USING (public.is_admin());

-- FOLLOW-UPS POLICIES
DROP POLICY IF EXISTS "Follow ups select policy" ON public.follow_ups;
CREATE POLICY "Follow ups select policy" ON public.follow_ups FOR SELECT TO authenticated
    USING (public.is_admin() OR public.is_assigned_or_team(assigned_to));

DROP POLICY IF EXISTS "Follow ups insert policy" ON public.follow_ups;
CREATE POLICY "Follow ups insert policy" ON public.follow_ups FOR INSERT TO authenticated
    WITH CHECK (public.is_admin() OR public.is_assigned_or_team(assigned_to));

DROP POLICY IF EXISTS "Follow ups update policy" ON public.follow_ups;
CREATE POLICY "Follow ups update policy" ON public.follow_ups FOR UPDATE TO authenticated
    USING (public.is_admin() OR public.is_assigned_or_team(assigned_to))
    WITH CHECK (public.is_admin() OR public.is_assigned_or_team(assigned_to));

DROP POLICY IF EXISTS "Follow ups delete policy" ON public.follow_ups;
CREATE POLICY "Follow ups delete policy" ON public.follow_ups FOR DELETE TO authenticated
    USING (public.is_admin());

-- SITE VISITS POLICIES
DROP POLICY IF EXISTS "Site visits select policy" ON public.site_visits;
CREATE POLICY "Site visits select policy" ON public.site_visits FOR SELECT TO authenticated
    USING (public.is_admin() OR public.is_assigned_or_team(assigned_to));

DROP POLICY IF EXISTS "Site visits insert policy" ON public.site_visits;
CREATE POLICY "Site visits insert policy" ON public.site_visits FOR INSERT TO authenticated
    WITH CHECK (public.is_admin() OR public.is_assigned_or_team(assigned_to));

DROP POLICY IF EXISTS "Site visits update policy" ON public.site_visits;
CREATE POLICY "Site visits update policy" ON public.site_visits FOR UPDATE TO authenticated
    USING (public.is_admin() OR public.is_assigned_or_team(assigned_to))
    WITH CHECK (public.is_admin() OR public.is_assigned_or_team(assigned_to));

DROP POLICY IF EXISTS "Site visits delete policy" ON public.site_visits;
CREATE POLICY "Site visits delete policy" ON public.site_visits FOR DELETE TO authenticated
    USING (public.is_admin());

-- DOCUMENTS POLICIES
DROP POLICY IF EXISTS "Documents select policy" ON public.documents;
CREATE POLICY "Documents select policy" ON public.documents FOR SELECT TO authenticated
    USING (
        public.is_admin()
        OR uploaded_by = auth.uid()
        OR lead_id IN (SELECT id FROM public.leads WHERE public.is_assigned_or_team(assigned_to))
    );

DROP POLICY IF EXISTS "Documents insert policy" ON public.documents;
CREATE POLICY "Documents insert policy" ON public.documents FOR INSERT TO authenticated
    WITH CHECK (public.is_admin() OR uploaded_by = auth.uid());

DROP POLICY IF EXISTS "Documents delete policy" ON public.documents;
CREATE POLICY "Documents delete policy" ON public.documents FOR DELETE TO authenticated
    USING (public.is_admin());

-- CALLS POLICIES
DROP POLICY IF EXISTS "Calls select policy" ON public.calls;
CREATE POLICY "Calls select policy" ON public.calls FOR SELECT TO authenticated
    USING (public.is_admin() OR public.is_assigned_or_team(employee_id));

DROP POLICY IF EXISTS "Calls insert policy" ON public.calls;
CREATE POLICY "Calls insert policy" ON public.calls FOR INSERT TO authenticated
    WITH CHECK (public.is_admin() OR public.is_assigned_or_team(employee_id));

-- DEALS POLICIES
DROP POLICY IF EXISTS "Deals select policy" ON public.deals;
CREATE POLICY "Deals select policy" ON public.deals FOR SELECT TO authenticated
    USING (public.is_admin() OR public.is_assigned_or_team(employee_id));

DROP POLICY IF EXISTS "Deals insert policy" ON public.deals;
CREATE POLICY "Deals insert policy" ON public.deals FOR INSERT TO authenticated
    WITH CHECK (public.is_admin() OR public.is_assigned_or_team(employee_id));

DROP POLICY IF EXISTS "Deals update policy" ON public.deals;
CREATE POLICY "Deals update policy" ON public.deals FOR UPDATE TO authenticated
    USING (public.is_admin() OR public.is_assigned_or_team(employee_id))
    WITH CHECK (public.is_admin() OR public.is_assigned_or_team(employee_id));

DROP POLICY IF EXISTS "Deals delete policy" ON public.deals;
CREATE POLICY "Deals delete policy" ON public.deals FOR DELETE TO authenticated
    USING (public.is_admin());

-- BROKERAGE POLICIES
DROP POLICY IF EXISTS "Brokerage select policy" ON public.brokerage;
CREATE POLICY "Brokerage select policy" ON public.brokerage FOR SELECT TO authenticated
    USING (public.is_admin() OR public.is_assigned_or_team(agent_id));

DROP POLICY IF EXISTS "Brokerage write policy" ON public.brokerage;
CREATE POLICY "Brokerage write policy" ON public.brokerage FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- EXPENSES POLICIES
DROP POLICY IF EXISTS "Expenses select policy" ON public.expenses;
CREATE POLICY "Expenses select policy" ON public.expenses FOR SELECT TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Expenses write policy" ON public.expenses;
CREATE POLICY "Expenses write policy" ON public.expenses FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ATTENDANCE POLICIES
DROP POLICY IF EXISTS "Attendance select policy" ON public.attendance;
CREATE POLICY "Attendance select policy" ON public.attendance FOR SELECT TO authenticated
    USING (public.is_admin() OR public.is_assigned_or_team(employee_id));

DROP POLICY IF EXISTS "Attendance insert policy" ON public.attendance;
CREATE POLICY "Attendance insert policy" ON public.attendance FOR INSERT TO authenticated
    WITH CHECK (public.is_admin() OR public.is_assigned_or_team(employee_id));

DROP POLICY IF EXISTS "Attendance update policy" ON public.attendance;
CREATE POLICY "Attendance update policy" ON public.attendance FOR UPDATE TO authenticated
    USING (public.is_admin() OR public.is_assigned_or_team(employee_id))
    WITH CHECK (public.is_admin() OR public.is_assigned_or_team(employee_id));
