const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@172.31.128.153:5432/diksha_crm'
});

async function run() {
  const sqlFile = path.join(__dirname, '..', 'supabase', 'migrations', '20261120000007_phase2_schema.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');
  console.log('Applying migration 20261120000007_phase2_schema.sql ...');
  await pool.query(sql);
  console.log('Migration successfully applied!');
  await pool.end();
}

run().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
