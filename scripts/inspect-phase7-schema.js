const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@172.31.128.153:5432/diksha_crm'
});

async function main() {
  const emps = await pool.query(`
    SELECT e.id, e.user_id, p.full_name, p.role, u.email
    FROM public.employees e
    JOIN public.profiles p ON e.user_id = p.id
    JOIN auth.users u ON e.user_id = u.id
    ORDER BY p.role ASC, p.full_name ASC
  `);
  console.log('CURRENT EMPLOYEES:');
  console.table(emps.rows);
  await pool.end();
}

main().catch(console.error);
