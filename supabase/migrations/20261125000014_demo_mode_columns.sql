-- Add is_demo column across all CRM tables and location tracking columns
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'leads', 'properties', 'rentals', 'rent_payments', 'deals', 'brokerage',
    'site_visits', 'calls', 'whatsapp_messages', 'attendance', 'expenses',
    'documents', 'project_submissions', 'follow_ups', 'employee_location_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;', t);
    END IF;
  END LOOP;
END $$;

ALTER TABLE public.employee_location_logs
  ADD COLUMN IF NOT EXISTS speed DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS heading DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS is_charging BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS activity_type TEXT DEFAULT 'stationary',
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS is_mock BOOLEAN DEFAULT false;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS last_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS last_longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS last_location_address TEXT,
  ADD COLUMN IF NOT EXISTS last_location_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_battery_level INT,
  ADD COLUMN IF NOT EXISTS last_speed DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS last_activity_type TEXT DEFAULT 'stationary';
