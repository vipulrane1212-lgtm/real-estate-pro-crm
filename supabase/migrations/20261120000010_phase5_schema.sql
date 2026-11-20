-- ==============================================================================
-- Migration: 010_phase5_schema.sql
-- Diksha Real Estate CRM - Phase 5: Free-form Expenses, Loud Alarms, Renewal Alerts & Deals End Date
-- Project ID: 012e3965-018a-44e8-9ccf-38c973e5eb89
-- ==============================================================================

-- 1. Free-form Expenses Schema Evolution
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS headline TEXT;

-- Migrate existing expenses: set headline to category or title (zero data loss)
UPDATE public.expenses 
SET headline = COALESCE(category, title, 'Expense') 
WHERE headline IS NULL;

-- Allow category and title to be optional now that headline is primary
ALTER TABLE public.expenses 
  ALTER COLUMN category DROP NOT NULL,
  ALTER COLUMN category SET DEFAULT 'general',
  ALTER COLUMN title DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_headline ON public.expenses(headline);

-- 2. Extend Deals for Agreement / Renewal End Dates
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS agreement_end_date DATE;

CREATE INDEX IF NOT EXISTS idx_deals_agreement_end ON public.deals(agreement_end_date);

-- 3. Ensure Follow-ups Reminder Fields and Indexes
ALTER TABLE public.follow_ups
  ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS repeat_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_follow_ups_snoozed ON public.follow_ups(snoozed_until);
CREATE INDEX IF NOT EXISTS idx_follow_ups_ack ON public.follow_ups(acknowledged_at);
