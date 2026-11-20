const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@172.31.128.153:5432/diksha_crm'
});

async function run() {
  console.log('--- 1. Checking Tables & Columns ---');
  const cols = await pool.query(`
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name IN ('leads', 'properties', 'follow_ups', 'lead_history')
      AND column_name IN (
        'lead_type', 'remarks', 'location', 
        'bhk', 'view_360_url', 'owner_name', 'owner_phone',
        'reminder_at', 'snoozed_until', 'acknowledged_at', 'repeat_count', 'follow_up_type',
        'actor_name', 'action_type'
      )
    ORDER BY table_name, column_name
  `);
  console.log('Columns verified:', cols.rows);

  console.log('\n--- 2. Checking RLS Policies ---');
  const policies = await pool.query(`
    SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename IN ('leads', 'properties', 'follow_ups', 'lead_history')
    ORDER BY tablename, policyname
  `);
  console.log('Active RLS Policies count:', policies.rows.length);
  policies.rows.forEach(p => console.log(`  [${p.tablename}] ${p.policyname} (${p.cmd})`));

  console.log('\n--- 3. Checking Profiles & Employees ---');
  const users = await pool.query(`
    SELECT p.id, p.full_name, p.role, e.id as employee_id, e.designation
    FROM public.profiles p
    LEFT JOIN public.employees e ON p.id = e.user_id
    ORDER BY p.role
  `);
  console.log('Existing users:', users.rows);

  await pool.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
