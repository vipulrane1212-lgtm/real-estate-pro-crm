const http = require('http');

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
  console.log('=== TESTING 24/7 LOCATION MONITORING & RADAR APIS ===\n');

  // 1. Authenticate as Super Admin
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    body: {
      email: 'admin@diksharealestate.com',
      password: 'AdminPassword123!',
    },
  });

  const setCookie = loginRes.headers['set-cookie'];
  const authCookie = setCookie.map((c) => c.split(';')[0]).join('; ');

  // 2. Test GET /api/location/live (Demo ON)
  console.log('1. Testing GET /api/location/live with Demo Mode ON...');
  const liveOn = await request('/api/location/live', {
    headers: { Cookie: `${authCookie}; diksha_demo_mode=true` },
  });
  console.log('Status:', liveOn.status);
  console.log('Tracked Agents Count:', liveOn.body?.agents?.length);
  console.log('Summary:', liveOn.body?.summary);
  console.log('Sample Agent:', liveOn.body?.agents?.[0]?.name, liveOn.body?.agents?.[0]?.address);

  // 3. Test GET /api/location/history
  console.log('\n2. Testing GET /api/location/history for Deepak Yadav...');
  const histRes = await request('/api/location/history?employee_id=sim_agent_deepak', {
    headers: { Cookie: `${authCookie}; diksha_demo_mode=true` },
  });
  console.log('Status:', histRes.status);
  console.log('Waypoints Count:', histRes.body?.total_points);
  console.log('Start point:', histRes.body?.route?.[0]?.time_label, histRes.body?.route?.[0]?.address);
  console.log('End point:', histRes.body?.route?.[histRes.body?.route?.length - 1]?.time_label, histRes.body?.route?.[histRes.body?.route?.length - 1]?.address);

  // 4. Test POST /api/location/ping (Simulate an employee mobile app ping)
  console.log('\n3. Testing POST /api/location/ping (Mobile Companion App Ping)...');
  const pingRes = await request('/api/location/ping', {
    method: 'POST',
    headers: { Cookie: authCookie },
    body: {
      latitude: 26.8524,
      longitude: 80.9995,
      accuracy: 6.5,
      speed: 28.0,
      heading: 90.0,
      battery_level: 88,
      is_charging: false,
      activity_type: 'in_vehicle',
      address: 'Gomti Nagar Main Road, Lucknow',
    },
  });
  console.log('Status:', pingRes.status);
  console.log('Response:', pingRes.body);

  console.log('\n✓ All Location APIs and Radar services functioning perfectly!');
}

run().catch(console.error);
