const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@172.31.128.153:5432/diksha_crm',
});

async function run() {
  const tables = ['documents', 'attendance', 'expenses'];
  for (const t of tables) {
    const res = await pool.query(
      `SELECT column_name, data_type, is_nullable, column_default 
       FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = $1 
       ORDER BY ordinal_position`,
      [t]
    );
    console.log(`\n=== TABLE: ${t} (${res.rows.length} columns) ===`);
    res.rows.forEach((r) => {
      console.log(`  ${r.column_name}: ${r.data_type} (null: ${r.is_nullable}) default: ${r.column_default}`);
    });
  }
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
