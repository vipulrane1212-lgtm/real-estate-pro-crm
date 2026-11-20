const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@172.31.128.153:5432/diksha_crm' });

async function check() {
  for (const table of ['expenses', 'follow_ups', 'documents', 'deals']) {
    const res = await pool.query(
      `SELECT column_name, data_type, is_nullable, column_default 
       FROM information_schema.columns 
       WHERE table_name = $1 
       ORDER BY ordinal_position`,
      [table]
    );
    console.log('TABLE:', table);
    console.table(res.rows);
  }
  await pool.end();
}

check().catch(console.error);
