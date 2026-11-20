const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@172.31.128.153:5432/diksha_crm'
});

async function main() {
  const sqlFile = path.join(__dirname, '..', 'supabase', 'migrations', '20261120000013_property_media_enhancements.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');

  console.log('Applying Migration 013 (Property Media Enhancements)...');
  await pool.query(sql);
  console.log('✓ Migration 013 applied successfully!');

  const cols = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'properties'
    ORDER BY ordinal_position
  `);
  console.log('\n--- VERIFIED COLUMNS ON PROPERTIES ---');
  console.table(cols.rows.filter(c => ['photos', 'videos', 'video_url', 'view_360_url', 'floor_plans'].includes(c.column_name)));

  await pool.end();
}

main().catch((err) => {
  console.error('Migration 013 failed:', err);
  process.exit(1);
});
