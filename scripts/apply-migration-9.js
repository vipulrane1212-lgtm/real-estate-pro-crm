const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:postgres@172.31.128.153:5432/diksha_crm',
});

async function run() {
  await client.connect();
  console.log('Connected to local PostgreSQL database.');

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20261120000009_phase4_schema.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Applying Migration 009 (Phase 4 Schema)...');
  await client.query(sql);
  console.log('✓ Migration 009 applied successfully!');

  await client.end();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
