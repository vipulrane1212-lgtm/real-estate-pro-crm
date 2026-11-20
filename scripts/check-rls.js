const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@172.31.128.153:5432/diksha_crm',
});

async function run() {
  const r = await pool.query(`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename IN ('documents', 'attendance', 'expenses');
  `);
  console.log('RLS status:', r.rows);

  const pol = await pool.query(`
    SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename IN ('documents', 'attendance', 'expenses');
  `);
  console.log('Policies:', pol.rows);

  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
