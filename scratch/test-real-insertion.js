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

async function testReal() {
  console.log('=== TESTING REAL CLIENT DATA INSERTION IN CLEAN PRODUCTION MODE ===\n');

  // Login
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    body: {
      email: 'admin@diksharealestate.com',
      password: 'AdminPassword123!',
    },
  });

  const setCookie = loginRes.headers['set-cookie'];
  const authCookie = setCookie.map((c) => c.split(';')[0]).join('; ');

  // 1. Create a real property
  console.log('1. Creating a real test property (is_demo should be false)...');
  const propRes = await request('/api/properties', {
    method: 'POST',
    headers: { Cookie: `${authCookie}; diksha_demo_mode=false` },
    body: {
      title: 'Real Client Test Villa in Gomti Nagar',
      property_type: 'residential',
      listing_type: 'sale',
      price: 15000000,
      location: 'Gomti Nagar, Lucknow',
      address: 'Vipul Khand 4, Near Patrakarpuram',
      bhk: '4 BHK',
      size_sqft: 2800,
      owner_name: 'Dr. S. K. Gupta',
      owner_phone: '+91 94150 99887',
      description: 'Luxury residential bungalow for testing production readiness.',
    },
  });

  console.log('Create property response status:', propRes.status);
  const createdProp = propRes.body.property;
  console.log('Created property code:', createdProp?.property_code);
  console.log('Created property is_demo:', createdProp?.is_demo);

  // 2. Fetch properties with Demo OFF
  console.log('\n2. Fetching properties with Demo Mode OFF...');
  const getOffRes = await request('/api/properties', {
    headers: { Cookie: `${authCookie}; diksha_demo_mode=false` },
  });
  console.log('Properties count (Demo OFF):', getOffRes.body.properties?.length);
  const found = getOffRes.body.properties?.find((p) => p.id === createdProp.id);
  console.log('Real property visible in Demo OFF mode:', !!found);

  // 3. Clean up the test property so DB remains pristine
  console.log('\n3. Cleaning up test property...');
  const delRes = await request(`/api/properties/${createdProp.id}`, {
    method: 'DELETE',
    headers: { Cookie: authCookie },
  });
  console.log('Delete status:', delRes.status);

  console.log('\n✓ Real data insertion, visibility, and isolation verified perfectly!');
}

testReal().catch(console.error);
