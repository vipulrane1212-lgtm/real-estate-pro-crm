-- ==============================================================================
-- Migration: 012_phase7_schema.sql
-- Diksha Real Estate CRM - Phase 7: Unified Lead Inbox, Source Tracking, Bulk Assign, Demo Data & Integrations
-- Project ID: 012e3965-018a-44e8-9ccf-38c973e5eb89
-- ==============================================================================

-- 1. Extend leads table with source_detail and is_demo
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS source_detail TEXT,
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

-- Backfill existing leads with source = 'manual' if null
UPDATE public.leads SET source = 'manual' WHERE source IS NULL;

-- 2. Extend follow_ups and lead_history with is_demo
ALTER TABLE public.follow_ups
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.lead_history
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

-- 3. Create indexes for high performance lead inbox, filtering, and demo toggling
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_is_demo ON public.leads(is_demo);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_created_at_desc ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follow_ups_is_demo ON public.follow_ups(is_demo);
CREATE INDEX IF NOT EXISTS idx_lead_history_is_demo ON public.lead_history(is_demo);

-- 4. Create integration_configs table for managing API connections & sync status
CREATE TABLE IF NOT EXISTS public.integration_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) UNIQUE NOT NULL, -- 'meta_lead_ads', 'housing', 'google_ads', 'whatsapp_business', 'instagram_dms'
    is_connected BOOLEAN NOT NULL DEFAULT false,
    settings JSONB DEFAULT '{}',
    last_sync_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default integration config records
INSERT INTO public.integration_configs (provider, is_connected, settings)
VALUES 
    ('meta_lead_ads', false, '{"webhook_path": "/api/webhooks/meta-leads"}'::jsonb),
    ('housing', false, '{"sync_path": "/api/integrations/housing/sync"}'::jsonb),
    ('google_ads', false, '{"webhook_path": "/api/webhooks/google-leads"}'::jsonb),
    ('whatsapp_business', false, '{"webhook_path": "/api/webhooks/whatsapp"}'::jsonb),
    ('instagram_dms', false, '{"webhook_path": "/api/webhooks/instagram"}'::jsonb)
ON CONFLICT (provider) DO NOTHING;

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.integration_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view integration configs" ON public.integration_configs;
CREATE POLICY "Admins can view integration configs"
    ON public.integration_configs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('super_admin', 'admin')
        )
    );

DROP POLICY IF EXISTS "Admins can update integration configs" ON public.integration_configs;
CREATE POLICY "Admins can update integration configs"
    ON public.integration_configs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('super_admin', 'admin')
        )
    );
