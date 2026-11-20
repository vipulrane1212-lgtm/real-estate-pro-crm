const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@172.31.128.153:5432/diksha_crm' });

async function check() {
  const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
  console.log('Tables:', tables.rows.map(t => t.table_name));

  const propCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'properties' ORDER BY ordinal_position");
  console.log('Properties columns:', propCols.rows);

  const existingProps = await pool.query("SELECT id, property_code, title, photos, video_url, view_360_url FROM public.properties LIMIT 5");
  console.log('Sample properties:', existingProps.rows);

  await pool.end();
}

check().catch(console.error);
