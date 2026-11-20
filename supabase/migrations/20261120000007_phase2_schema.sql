-- ==============================================================================
-- Migration: 007_phase2_schema.sql
-- Diksha Real Estate CRM - Phase 2: Leads, Properties, Follow-ups & History
-- Project ID: 012e3965-018a-44e8-9ccf-38c973e5eb89
-- ==============================================================================

-- 1. Extend Leads Table
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS lead_type TEXT DEFAULT 'buy',
  ADD COLUMN IF NOT EXISTS remarks TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT;

-- Update existing preferred_location into location if location is null
UPDATE public.leads
SET location = preferred_location
WHERE location IS NULL AND preferred_location IS NOT NULL;

-- 2. Extend Properties Table
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS bhk TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS owner_name TEXT,
  ADD COLUMN IF NOT EXISTS owner_phone TEXT,
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS document_url TEXT,
  ADD COLUMN IF NOT EXISTS view_360_url TEXT;

-- Update location from city/address if location is null
UPDATE public.properties
SET location = city
WHERE location IS NULL AND city IS NOT NULL;

-- 3. Extend Follow-ups Table (including alarm scheduling fields)
ALTER TABLE public.follow_ups
  ADD COLUMN IF NOT EXISTS follow_up_type TEXT DEFAULT 'call',
  ADD COLUMN IF NOT EXISTS reminder_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS repeat_count INT DEFAULT 0;

-- 4. Create Lead History Table for rich timeline tracking
CREATE TABLE IF NOT EXISTS public.lead_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_name TEXT,
    action_type TEXT NOT NULL, -- 'created', 'status_change', 'note', 'call', 'visit', 'follow_up', 'assignment', 'updated'
    title TEXT NOT NULL,
    description TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create Performance Indexes for Search & Auto-Matching
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_location ON public.leads(location);
CREATE INDEX IF NOT EXISTS idx_leads_pref_location ON public.leads(preferred_location);
CREATE INDEX IF NOT EXISTS idx_leads_budget_min ON public.leads(budget_min);
CREATE INDEX IF NOT EXISTS idx_leads_budget_max ON public.leads(budget_max);
CREATE INDEX IF NOT EXISTS idx_leads_lead_type ON public.leads(lead_type);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);

CREATE INDEX IF NOT EXISTS idx_properties_location ON public.properties(location);
CREATE INDEX IF NOT EXISTS idx_properties_price ON public.properties(price);
CREATE INDEX IF NOT EXISTS idx_properties_bhk ON public.properties(bhk);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_type ON public.properties(property_type);

CREATE INDEX IF NOT EXISTS idx_follow_ups_lead ON public.follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_assigned_to ON public.follow_ups(assigned_to);
CREATE INDEX IF NOT EXISTS idx_follow_ups_scheduled_at ON public.follow_ups(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON public.follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_reminder ON public.follow_ups(reminder_at);
CREATE INDEX IF NOT EXISTS idx_follow_ups_type ON public.follow_ups(follow_up_type);

CREATE INDEX IF NOT EXISTS idx_lead_history_lead ON public.lead_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_history_created_at ON public.lead_history(created_at DESC);

-- 6. Enable RLS on lead_history
ALTER TABLE public.lead_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lead history select policy" ON public.lead_history;
CREATE POLICY "Lead history select policy" ON public.lead_history FOR SELECT TO authenticated
    USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.leads l
            WHERE l.id = lead_history.lead_id
            AND public.is_assigned_or_team(l.assigned_to)
        )
    );

DROP POLICY IF EXISTS "Lead history insert policy" ON public.lead_history;
CREATE POLICY "Lead history insert policy" ON public.lead_history FOR INSERT TO authenticated
    WITH CHECK (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.leads l
            WHERE l.id = lead_history.lead_id
            AND public.is_assigned_or_team(l.assigned_to)
        )
    );

-- Audit log trigger for lead_history
DROP TRIGGER IF EXISTS tr_audit_lead_history ON public.lead_history;
CREATE TRIGGER tr_audit_lead_history
    AFTER INSERT OR UPDATE OR DELETE ON public.lead_history
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger_fn();
