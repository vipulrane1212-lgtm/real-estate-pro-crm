const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:postgres@172.31.128.153:5432/diksha_crm'
});

async function main() {
  await client.connect();
  const res = await client.query(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'calls' 
    ORDER BY ordinal_position
  `);
  console.log(res.rows);
  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
