const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@172.31.128.153:5432/diksha_crm',
});

async function run() {
  const r = await pool.query(`
    SELECT event_object_table, trigger_name, event_manipulation 
    FROM information_schema.triggers 
    WHERE event_object_table IN ('documents', 'attendance', 'expenses');
  `);
  console.log('Triggers:', r.rows);
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
