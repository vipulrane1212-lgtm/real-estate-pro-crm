const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:postgres@172.31.128.153:5432/diksha_crm',
});

async function cleanup() {
  await client.connect();
  console.log('Cleaning up all test records from local PostgreSQL database...');

  const delFollowUps = await client.query('DELETE FROM public.follow_ups');
  console.log('Deleted follow-ups:', delFollowUps.rowCount);

  const delHistory = await client.query('DELETE FROM public.lead_history');
  console.log('Deleted lead history:', delHistory.rowCount);

  const delLeads = await client.query('DELETE FROM public.leads');
  console.log('Deleted leads:', delLeads.rowCount);

  const delProps = await client.query('DELETE FROM public.properties');
  console.log('Deleted properties:', delProps.rowCount);

  const delAudit = await client.query(
    "DELETE FROM public.audit_logs WHERE entity_type IN ('leads', 'properties', 'follow_ups')"
  );
  console.log('Deleted audit logs from tests:', delAudit.rowCount);

  const leadsRes = await client.query('SELECT COUNT(*) as count FROM public.leads');
  const propsRes = await client.query('SELECT COUNT(*) as count FROM public.properties');
  const followUpsRes = await client.query('SELECT COUNT(*) as count FROM public.follow_ups');

  console.log('\n--- VERIFICATION AFTER CLEANUP ---');
  console.log('Leads remaining:', leadsRes.rows[0].count);
  console.log('Properties remaining:', propsRes.rows[0].count);
  console.log('Follow-ups remaining:', followUpsRes.rows[0].count);

  await client.end();
}

cleanup().catch((err) => {
  console.error('Cleanup error:', err);
  process.exit(1);
});
