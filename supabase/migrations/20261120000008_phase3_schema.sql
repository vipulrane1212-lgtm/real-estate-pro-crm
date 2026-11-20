-- ==============================================================================
-- Migration: 008_phase3_schema.sql
-- Diksha Real Estate CRM - Phase 3: Telephony, WhatsApp, Site Visits, Deals & Brokerage
-- Project ID: 012e3965-018a-44e8-9ccf-38c973e5eb89
-- ==============================================================================

-- 1. Extend Calls Table
ALTER TABLE public.calls
  ADD COLUMN IF NOT EXISTS outcome TEXT DEFAULT 'connected', -- 'connected', 'not_answered', 'busy', 'wrong_number'
  ADD COLUMN IF NOT EXISTS client_phone TEXT,
  ADD COLUMN IF NOT EXISTS provider_call_id TEXT;

CREATE INDEX IF NOT EXISTS idx_calls_outcome ON public.calls(outcome);
CREATE INDEX IF NOT EXISTS idx_calls_lead ON public.calls(lead_id);
CREATE INDEX IF NOT EXISTS idx_calls_employee ON public.calls(employee_id);

-- 2. Create WhatsApp Messages Table
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    recipient_phone TEXT NOT NULL,
    template_name TEXT DEFAULT 'custom', -- 'intro', 'property_share', 'site_visit_reminder', 'follow_up', 'custom'
    message_text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent_via_wa_me', -- 'sent_via_wa_me', 'queued', 'sent', 'delivered', 'read', 'failed'
    provider_message_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_lead ON public.whatsapp_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_employee ON public.whatsapp_messages(employee_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_created_at ON public.whatsapp_messages(created_at DESC);

-- Enable RLS on whatsapp_messages
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "WhatsApp select policy" ON public.whatsapp_messages;
CREATE POLICY "WhatsApp select policy" ON public.whatsapp_messages FOR SELECT TO authenticated
    USING (
        public.is_admin() 
        OR public.is_assigned_or_team(employee_id)
        OR EXISTS (
            SELECT 1 FROM public.leads l 
            WHERE l.id = whatsapp_messages.lead_id 
            AND public.is_assigned_or_team(l.assigned_to)
        )
    );

DROP POLICY IF EXISTS "WhatsApp insert policy" ON public.whatsapp_messages;
CREATE POLICY "WhatsApp insert policy" ON public.whatsapp_messages FOR INSERT TO authenticated
    WITH CHECK (public.is_admin() OR public.is_assigned_or_team(employee_id));

-- Audit trigger for whatsapp_messages
DROP TRIGGER IF EXISTS tr_audit_whatsapp_messages ON public.whatsapp_messages;
CREATE TRIGGER tr_audit_whatsapp_messages
    AFTER INSERT OR UPDATE OR DELETE ON public.whatsapp_messages
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger_fn();

-- 3. Extend Site Visits Table
ALTER TABLE public.site_visits
  ADD COLUMN IF NOT EXISTS outcome_note TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 4. Extend Deals Table
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS brokerage_percentage NUMERIC(5, 2) DEFAULT 2.0,
  ADD COLUMN IF NOT EXISTS deal_number BIGSERIAL,
  ADD COLUMN IF NOT EXISTS closed_date DATE DEFAULT CURRENT_DATE;

CREATE INDEX IF NOT EXISTS idx_deals_closed_date ON public.deals(closed_date DESC);

-- 5. Extend Brokerage Table
ALTER TABLE public.brokerage
  ADD COLUMN IF NOT EXISTS brokerage_percentage NUMERIC(5, 2) DEFAULT 2.0,
  ADD COLUMN IF NOT EXISTS notes TEXT;
