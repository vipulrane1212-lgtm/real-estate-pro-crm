const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@172.31.128.153:5432/diksha_crm'
});

async function main() {
  const tablesRes = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);
  console.log('TABLES:', tablesRes.rows.map(r => r.table_name));

  // Check if rentals or projects exists
  for (const t of ['rentals', 'rent_payments', 'project_submissions', 'projects', 'deals', 'brokerage', 'employees', 'profiles']) {
    const exists = tablesRes.rows.some(r => r.table_name === t);
    console.log(`Table '${t}' exists:`, exists);
    if (exists) {
      const cols = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [t]);
      console.log(`--- Columns for ${t} ---`);
      console.table(cols.rows);
    }
  }

  await pool.end();
}

main().catch(console.error);
