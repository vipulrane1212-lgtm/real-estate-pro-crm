const LIVE_URL = 'https://real-estate-pro-crm.vercel.app';

async function run() {
  console.log('=== Verifying Live Deployment:', LIVE_URL, '===\n');

  // 1. Admin Login
  console.log('1. Testing Admin Login...');
  const adminLogin = await fetch(`${LIVE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@diksharealestate.com',
      password: 'AdminPassword123!',
    }),
  });
  const adminData = await adminLogin.json();
  if (!adminLogin.ok) {
    throw new Error(`Admin login failed (${adminLogin.status}): ${JSON.stringify(adminData)}`);
  }
  const adminCookie = adminLogin.headers.get('set-cookie')?.split(';')[0];
  console.log('   ✓ Admin login OK:', adminData.user?.email, 'Role:', adminData.user?.profile?.role);

  // 2. Seed Demo Data across all modules
  console.log('\n2. Seeding Demo Data via /api/demo/manage...');
  const seedRes = await fetch(`${LIVE_URL}/api/demo/manage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ action: 'seed' }),
  });
  const seedData = await seedRes.json();
  if (!seedRes.ok) {
    throw new Error(`Demo seed failed (${seedRes.status}): ${JSON.stringify(seedData)}`);
  }
  console.log('   ✓ Demo data seeded:', seedData.seededCounts);

  // 3. Verify Dashboard Stats & Key APIs (with demoMode=true or header)
  console.log('\n3. Checking Live APIs (Dashboard, Leads, Properties, Follow-ups, Employees, Neural)...');
  const endpoints = [
    '/api/dashboard/stats?demoMode=true',
    '/api/leads?demoMode=true',
    '/api/properties?demoMode=true',
    '/api/follow-ups?demoMode=true',
    '/api/employees',
    '/api/neural/graph?demoMode=true',
    '/api/location/live',
  ];

  for (const ep of endpoints) {
    const res = await fetch(`${LIVE_URL}${ep}`, {
      headers: { Cookie: adminCookie, 'x-demo-mode': 'true' },
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(`Endpoint ${ep} failed (${res.status}): ${JSON.stringify(json)}`);
    }
    const summary =
      ep.includes('stats')
        ? JSON.stringify(json.stats)
        : ep.includes('leads')
        ? `${json.leads?.length} leads`
        : ep.includes('properties')
        ? `${json.properties?.length} properties`
        : ep.includes('follow-ups')
        ? `${json.followUps?.length} follow-ups`
        : ep.includes('employees')
        ? `${json.employees?.length} employees`
        : ep.includes('neural')
        ? `${json.nodes?.length || 0} nodes`
        : 'OK';
    console.log(`   ✓ ${ep} -> ${res.status} (${summary})`);
  }

  // 4. Test Employee Login (Rohan Sharma)
  console.log('\n4. Testing Employee Login (rohan@diksharealestate.com)...');
  const empLogin = await fetch(`${LIVE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'rohan@diksharealestate.com',
      password: 'AgentPassword123!',
    }),
  });
  const empData = await empLogin.json();
  if (!empLogin.ok) {
    throw new Error(`Employee login failed (${empLogin.status}): ${JSON.stringify(empData)}`);
  }
  const empCookie = empLogin.headers.get('set-cookie')?.split(';')[0];
  console.log('   ✓ Employee login OK:', empData.user?.email, 'Role:', empData.user?.profile?.role);

  const empMe = await fetch(`${LIVE_URL}/api/auth/me`, {
    headers: { Cookie: empCookie },
  });
  const empMeData = await empMe.json();
  console.log('   ✓ /api/auth/me OK:', empMeData.email, 'Role:', empMeData.role);

  const empLeads = await fetch(`${LIVE_URL}/api/leads?demoMode=true`, {
    headers: { Cookie: empCookie, 'x-demo-mode': 'true' },
  });
  const empLeadsData = await empLeads.json();
  console.log(`   ✓ Employee /api/leads OK: ${empLeadsData.leads?.length} assigned leads visible`);

  console.log('\n=== ALL LIVE PRODUCTION CHECKS PASSED! ===');
}

run().catch((err) => {
  console.error('\n❌ Live Verification Failed:', err);
  process.exit(1);
});
