const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@172.31.128.153:5432/diksha_crm',
});

async function run() {
  const sql = `
    INSERT INTO public.employees (user_id, designation, joining_date, is_active, permissions)
    VALUES ('00000000-0000-0000-0000-000000000001', 'Principal Broker & Director', CURRENT_DATE, true, '{}'::jsonb)
    ON CONFLICT (user_id) DO NOTHING
    RETURNING id;
  `;
  const res = await pool.query(sql);
  console.log('Seeded admin employee:', res.rows);
  const all = await pool.query(`
    SELECT e.id, p.full_name, e.designation, p.role 
    FROM public.employees e 
    JOIN public.profiles p ON e.user_id = p.id
  `);
  console.log('Current employees:', all.rows);
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
