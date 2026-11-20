const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@172.31.128.153:5432/diksha_crm'
});

async function main() {
  const sqlFile = path.join(__dirname, '../supabase/migrations/20261120000011_phase6_schema.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');
  console.log('Applying Migration 011...');
  await pool.query(sql);
  console.log('Migration 011 applied successfully!');
  await pool.end();
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
