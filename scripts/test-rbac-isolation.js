const BASE_URL = 'http://localhost:3000';

async function testRbac() {
  console.log('Testing Employee RBAC Isolation...');

  const empLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'rohan@diksharealestate.com',
      password: 'AgentPassword123!',
    }),
  });
  const empCookie = empLoginRes.headers.get('set-cookie').split(';')[0];

  // 1. Employee tries to fetch employees API
  const empRes = await fetch(`${BASE_URL}/api/employees`, {
    headers: { Cookie: empCookie },
  });
  console.log('   Employee access to /api/employees status:', empRes.status, '(Expected: 403 Forbidden)');

  // 2. Employee tries to update company settings (PUT)
  const settingsRes = await fetch(`${BASE_URL}/api/settings/company`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: empCookie,
    },
    body: JSON.stringify({ companyName: 'Hacked Real Estate' }),
  });
  console.log('   Employee PUT /api/settings/company status:', settingsRes.status, '(Expected: 403 Forbidden)');

  // 3. Employee accesses calls (authorized, empty)
  const callsRes = await fetch(`${BASE_URL}/api/calls`, {
    headers: { Cookie: empCookie },
  });
  const callsData = await callsRes.json();
  console.log('   Employee access to /api/calls status:', callsRes.status, 'Calls count:', callsData.calls?.length);

  // 4. Employee accesses site visits (authorized, empty)
  const visitsRes = await fetch(`${BASE_URL}/api/site-visits`, {
    headers: { Cookie: empCookie },
  });
  const visitsData = await visitsRes.json();
  console.log('   Employee access to /api/site-visits status:', visitsRes.status, 'Visits count:', visitsData.visits?.length);

  // 5. Employee accesses dashboard stats (authorized, returns personal counters)
  const statsRes = await fetch(`${BASE_URL}/api/dashboard/stats`, {
    headers: { Cookie: empCookie },
  });
  const statsData = await statsRes.json();
  console.log('   Employee access to /api/dashboard/stats status:', statsRes.status, 'Stats:', statsData.stats);

  if (empRes.status === 403 && settingsRes.status === 403 && statsRes.status === 200) {
    console.log('\n✓ RBAC ISOLATION CONFIRMED: Employee is strictly constrained by role permissions!');
  } else {
    throw new Error('RBAC check did not match expected isolation behavior.');
  }
}

testRbac().catch((err) => {
  console.error(err);
  process.exit(1);
});
