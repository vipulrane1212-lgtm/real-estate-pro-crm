-- ==============================================================================
-- Migration: 009_phase4_schema.sql
-- Diksha Real Estate CRM - Phase 4: Documents, Live Attendance & Office Expenses
-- Project ID: 012e3965-018a-44e8-9ccf-38c973e5eb89
-- ==============================================================================

-- 1. Extend Documents Table
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS expiry_date DATE;

CREATE INDEX IF NOT EXISTS idx_documents_deal_id ON public.documents(deal_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_expiry ON public.documents(expiry_date);

-- 2. Extend Attendance Table with Live Selfie & GPS fields
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS check_in_selfie_url TEXT,
  ADD COLUMN IF NOT EXISTS check_in_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS check_in_longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS check_in_address TEXT,
  ADD COLUMN IF NOT EXISTS check_out_selfie_url TEXT,
  ADD COLUMN IF NOT EXISTS check_out_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS check_out_longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS check_out_address TEXT,
  ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_employee_attendance_date'
  ) THEN
    ALTER TABLE public.attendance ADD CONSTRAINT uq_employee_attendance_date UNIQUE (employee_id, date);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON public.attendance(employee_id, date);

-- 3. Extend Expenses Table
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_employee_id ON public.expenses(employee_id);

-- 4. Update Expenses RLS Policies
DROP POLICY IF EXISTS "Expenses select policy" ON public.expenses;
DROP POLICY IF EXISTS "Expenses write policy" ON public.expenses;
DROP POLICY IF EXISTS "Expenses insert policy" ON public.expenses;
DROP POLICY IF EXISTS "Expenses update policy" ON public.expenses;
DROP POLICY IF EXISTS "Expenses delete policy" ON public.expenses;

CREATE POLICY "Expenses select policy" ON public.expenses
  FOR SELECT TO authenticated
  USING (
    is_admin() OR 
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Expenses insert policy" ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin() OR 
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Expenses update policy" ON public.expenses
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Expenses delete policy" ON public.expenses
  FOR DELETE TO authenticated
  USING (is_admin());

-- 5. Update Documents RLS Policy for Deals
DROP POLICY IF EXISTS "Documents select policy" ON public.documents;
CREATE POLICY "Documents select policy" ON public.documents
  FOR SELECT TO authenticated
  USING (
    is_admin() OR 
    (uploaded_by = auth.uid()) OR 
    (lead_id IN (SELECT id FROM public.leads WHERE is_assigned_or_team(leads.assigned_to))) OR
    (deal_id IN (SELECT id FROM public.deals WHERE is_assigned_or_team(deals.employee_id)))
  );
