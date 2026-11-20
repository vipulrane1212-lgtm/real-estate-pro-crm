const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@172.31.128.153:5432/diksha_crm'
});

async function main() {
  const sqlFile = path.join(__dirname, '..', 'supabase', 'migrations', '20261120000012_phase7_schema.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');

  console.log('Applying Migration 012 (Phase 7 Schema)...');
  await pool.query(sql);
  console.log('✓ Migration 012 applied successfully!');

  // Verify columns on leads
  const cols = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads'
    ORDER BY ordinal_position
  `);
  console.log('\n--- VERIFIED COLUMNS ON LEADS ---');
  console.table(cols.rows.filter(c => ['source', 'source_detail', 'is_demo'].includes(c.column_name)));

  await pool.end();
}

main().catch((err) => {
  console.error('Migration 012 failed:', err);
  process.exit(1);
});
