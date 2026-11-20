const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@172.31.128.153:5432/diksha_crm',
});

async function run() {
  for (const t of ['documents', 'attendance', 'expenses']) {
    const r = await pool.query(`
      SELECT tc.constraint_name, tc.constraint_type, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = $1
    `, [t]);
    console.log(`=== Constraints on ${t} ===`);
    console.log(r.rows);
  }
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
