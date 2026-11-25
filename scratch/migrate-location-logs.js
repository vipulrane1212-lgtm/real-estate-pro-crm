const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@172.31.128.153:5432/diksha_crm',
});

async function migrate() {
  console.log('Running location tracking migration...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create employee_location_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.employee_location_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        accuracy DOUBLE PRECISION,
        speed DOUBLE PRECISION,
        heading DOUBLE PRECISION,
        battery_level INT,
        is_charging BOOLEAN DEFAULT false,
        activity_type TEXT DEFAULT 'stationary', -- 'stationary', 'walking', 'in_vehicle', 'unknown'
        address TEXT,
        is_mock BOOLEAN DEFAULT false,
        is_demo BOOLEAN NOT NULL DEFAULT false,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 2. Create indexes for fast lookup and route replay queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_location_logs_emp_rec 
        ON public.employee_location_logs(employee_id, recorded_at DESC);
      CREATE INDEX IF NOT EXISTS idx_location_logs_recorded 
        ON public.employee_location_logs(recorded_at DESC);
      CREATE INDEX IF NOT EXISTS idx_location_logs_demo 
        ON public.employee_location_logs(is_demo);
    `);

    // 3. Add latest location cache columns to public.employees for instant dashboard rendering
    await client.query(`
      ALTER TABLE public.employees
        ADD COLUMN IF NOT EXISTS last_latitude DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS last_longitude DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS last_location_address TEXT,
        ADD COLUMN IF NOT EXISTS last_location_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS last_battery_level INT,
        ADD COLUMN IF NOT EXISTS last_speed DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS last_activity_type TEXT DEFAULT 'stationary';
    `);

    await client.query('COMMIT');
    console.log('✓ Migration completed successfully: employee_location_logs table and indexes created!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
