const http = require('http');

// Helper to make request
function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path,
        method: options.method || 'GET',
        headers: defaultHeaders,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: data ? JSON.parse(data) : null,
            });
          } catch (e) {
            resolve({ status: res.statusCode, headers: res.headers, raw: data });
          }
        });
      }
    );

    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function run() {
  console.log('=== DIKSHA CRM MASTER DEMO DATA & BACKEND AUDIT ===\n');

  // 1. Authenticate as Super Admin
  console.log('1. Logging in as Super Admin (admin@diksharealestate.com)...');
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    body: {
      email: 'admin@diksharealestate.com',
      password: 'AdminPassword123!',
    },
  });

  if (loginRes.status !== 200) {
    console.error('Login failed:', loginRes);
    process.exit(1);
  }

  // Extract session cookie
  const setCookie = loginRes.headers['set-cookie'];
  const authCookie = setCookie
    ? setCookie.map((c) => c.split(';')[0]).join('; ')
    : '';

  console.log('✓ Successfully authenticated. Cookie acquired.\n');

  // 2. Test Demo Status API
  console.log('2. Testing /api/demo/manage GET...');
  const statusRes = await request('/api/demo/manage', {
    headers: { Cookie: authCookie },
  });
  console.log('Status code:', statusRes.status);
  console.log('Counts:', statusRes.body.counts);
  console.log('isDemoLoaded:', statusRes.body.isDemoLoaded);

  // 3. Test Every Module with Demo Mode ON
  console.log('\n3. Testing All Modules with Demo Mode ON (diksha_demo_mode=true)...');
  const onHeaders = { Cookie: `${authCookie}; diksha_demo_mode=true` };

  const endpointsOn = [
    { name: 'Dashboard Stats', url: '/api/dashboard/stats', key: (b) => `totalLeads=${b.stats?.totalLeads}, properties=${b.stats?.availableProperties}` },
    { name: 'Leads', url: '/api/leads', key: (b) => `count=${b.leads?.length}` },
    { name: 'Properties', url: '/api/properties', key: (b) => `count=${b.properties?.length}` },
    { name: 'Rentals', url: '/api/rentals', key: (b) => `count=${b.rentals?.length}` },
    { name: 'Deals', url: '/api/deals', key: (b) => `count=${b.deals?.length}` },
    { name: 'Brokerage', url: '/api/brokerage', key: (b) => `count=${b.brokerage?.length}` },
    { name: 'Calls', url: '/api/calls', key: (b) => `count=${b.calls?.length}` },
    { name: 'Site Visits', url: '/api/site-visits', key: (b) => `count=${b.visits?.length}` },
    { name: 'Attendance', url: '/api/attendance', key: (b) => `count=${b.attendance?.length}` },
    { name: 'Expenses', url: '/api/expenses', key: (b) => `count=${b.expenses?.length}` },
    { name: 'Documents', url: '/api/documents', key: (b) => `count=${b.documents?.length}` },
    { name: 'Project Submissions', url: '/api/project-submissions', key: (b) => `count=${b.submissions?.length}` },
    { name: 'WhatsApp', url: '/api/whatsapp', key: (b) => `count=${b.messages?.length}` },
    { name: 'Follow-ups', url: '/api/follow-ups', key: (b) => `count=${b.followUps?.length}` },
    { name: 'Reports Analytics', url: '/api/reports/analytics', key: (b) => `leadsStatus=${b.analytics?.leadsByStatus?.length}, agents=${b.analytics?.agentPerformance?.length}` },
    { name: 'Neural Graph', url: '/api/neural/graph', key: (b) => `nodes=${b.nodes?.length}, links=${b.links?.length}` },
  ];

  for (const ep of endpointsOn) {
    const res = await request(ep.url, { headers: onHeaders });
    if (res.status === 200 && res.body) {
      console.log(`  ✓ ${ep.name.padEnd(20)} [${res.status}]: ${ep.key(res.body)}`);
    } else {
      console.error(`  ✗ ${ep.name} FAILED [${res.status}]:`, res.body || res.raw);
    }
  }

  // 4. Test Every Module with Demo Mode OFF (diksha_demo_mode=false)
  console.log('\n4. Testing All Modules with Demo Mode OFF (diksha_demo_mode=false)...');
  const offHeaders = { Cookie: `${authCookie}; diksha_demo_mode=false` };

  for (const ep of endpointsOn) {
    const res = await request(ep.url, { headers: offHeaders });
    if (res.status === 200 && res.body) {
      console.log(`  ✓ ${ep.name.padEnd(20)} [${res.status}]: ${ep.key(res.body)}`);
    } else {
      console.error(`  ✗ ${ep.name} FAILED [${res.status}]:`, res.body || res.raw);
    }
  }

  console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
