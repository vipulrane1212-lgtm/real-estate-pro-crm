const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@172.31.128.153:5432/diksha_crm'
});

async function run() {
  await client.connect();
  console.log('Applying Migration 008 (Phase 3)...');
  const sql = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261120000008_phase3_schema.sql'), 'utf-8');
  await client.query(sql);
  console.log('Migration 008 applied successfully!');
  await client.end();
}

run().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
