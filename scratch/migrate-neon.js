const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const NEON_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || '';
if (!NEON_URL) {
  console.error('Set NEON_DATABASE_URL or DATABASE_URL environment variable before running.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: NEON_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration files.`);

  // Pre-create Supabase compatibility roles/schemas if missing on plain Neon Postgres
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE TABLE IF NOT EXISTS auth.users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE,
      encrypted_password TEXT,
      email_confirmed_at TIMESTAMPTZ,
      raw_app_meta_data JSONB DEFAULT '{}'::jsonb,
      raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
      SELECT NULL::uuid;
    $$ LANGUAGE sql STABLE;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
      END IF;
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
      END IF;
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOLOGIN;
      END IF;
    END $$;
  `);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`\n--- Applying ${file} ---`);
    try {
      await pool.query(sql);
      console.log(`✓ ${file} applied successfully.`);
    } catch (err) {
      console.warn(`⚠ ${file} had error: ${err.message}`);
      if (file.includes('storage_buckets')) {
        console.log('  (Skipping storage_buckets Supabase-only SQL on Neon; local/URL media works without Supabase storage schema)');
      } else {
        throw err;
      }
    }
  }

  // Also ensure employee_location_logs table exists (from scratch/migrate-location-logs.js if not in migrations)
  const locFile = path.join(__dirname, 'migrate-location-logs.js');
  if (fs.existsSync(locFile)) {
    console.log('\n--- Checking employee_location_logs ---');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.employee_location_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        accuracy DOUBLE PRECISION,
        battery_level INT,
        is_moving BOOLEAN DEFAULT false,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_emp_loc_emp_time ON public.employee_location_logs(employee_id, recorded_at DESC);
    `);
    console.log('✓ employee_location_logs verified.');
  }

  // Seed Test Employee Rohan Sharma if not exists
  console.log('\n--- Seeding Employee Rohan Sharma ---');
  const empUserId = '0c30f1e8-f77a-437b-9bea-5d75abde418e';
  const empId = '02460fa8-e0d7-46c6-a8c0-baa830679596';

  await pool.query(
    `INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
     VALUES ($1, 'rohan@diksharealestate.com', crypt('AgentPassword123!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Rohan Sharma"}'::jsonb)
     ON CONFLICT (id) DO NOTHING`,
    [empUserId]
  );

  await pool.query(
    `INSERT INTO public.profiles (id, full_name, phone, role, is_active)
     VALUES ($1, 'Rohan Sharma', '+91 98201 11223', 'employee', true)
     ON CONFLICT (id) DO NOTHING`,
    [empUserId]
  );

  await pool.query(
    `INSERT INTO public.employees (id, user_id, designation, joining_date, is_active)
     VALUES ($1, $2, 'Senior Sales Executive', CURRENT_DATE, true)
     ON CONFLICT (id) DO NOTHING`,
    [empId, empUserId]
  );

  console.log('✓ Employee Rohan Sharma verified/seeded.');

  const check = await pool.query(`
    SELECT p.email, pr.role, pr.full_name
    FROM auth.users p
    JOIN public.profiles pr ON p.id = pr.id
    ORDER BY pr.role
  `);
  console.log('\n=== Cloud DB Users ===');
  console.table(check.rows);

  await pool.end();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
