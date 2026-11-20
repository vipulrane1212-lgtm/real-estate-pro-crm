const http = require('http');

const BASE_URL = 'http://localhost:3000';

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: json,
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=====================================================');
  console.log('DIKSHA CRM - PHASE 7 END-TO-END VERIFICATION SUITE');
  console.log('=====================================================\n');

  // Step 0: Login as Admin
  console.log('[Step 0] Logging in as Admin (admin@diksharealestate.com)...');
  const loginRes = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      email: 'admin@diksharealestate.com',
      password: 'AdminPassword123!',
    }
  );

  if (loginRes.statusCode !== 200 || !loginRes.data?.user) {
    throw new Error(`Login failed: ${JSON.stringify(loginRes.data)}`);
  }

  const setCookie = loginRes.headers['set-cookie'];
  const cookieHeader = Array.isArray(setCookie)
    ? setCookie.map((c) => c.split(';')[0]).join('; ')
    : (setCookie || '').split(';')[0];

  console.log('✓ Admin authenticated successfully.');

  const authHeaders = {
    Cookie: cookieHeader,
    'Content-Type': 'application/json',
  };

  // Step 1: Seed 100 Demo Leads
  console.log('\n[Step 1] Seeding 100 demo leads via /api/leads/demo (seed)...');
  const seedRes = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/leads/demo',
      method: 'POST',
      headers: authHeaders,
    },
    { action: 'reseed' }
  );

  console.log('Seed response status:', seedRes.statusCode);
  if (seedRes.statusCode !== 200) {
    throw new Error(`Failed to seed demo leads: ${JSON.stringify(seedRes.data)}`);
  }
  console.log(`✓ Seeded ${seedRes.data.insertedCount} demo leads.`);

  // Verify breakdown counts
  const sourceBreakdown = seedRes.data.sourceCounts;
  console.log('Source breakdown received:', sourceBreakdown);

  const expectedSources = {
    meta_ads: 30,
    housing: 25,
    whatsapp: 15,
    google: 12,
    instagram: 10,
    website: 5,
    manual: 3,
  };

  for (const [src, expectedCount] of Object.entries(expectedSources)) {
    const actual = sourceBreakdown[src] || 0;
    if (actual !== expectedCount) {
      throw new Error(`Mismatch for source "${src}": expected ${expectedCount}, got ${actual}`);
    }
    console.log(`  ✓ ${src}: ${actual} / ${expectedCount}`);
  }

  // Step 2: Verify Dashboard KPI isolation
  console.log('\n[Step 2] Verifying Dashboard KPI isolation for demo data...');
  const statsRealRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/dashboard/stats?include_demo=false',
    method: 'GET',
    headers: authHeaders,
  });

  console.log('Real Stats (include_demo=false):', statsRealRes.data.stats);
  if (statsRealRes.data.stats.totalLeads !== 0) {
    throw new Error(`Expected real totalLeads to be 0, got ${statsRealRes.data.stats.totalLeads}`);
  }
  console.log('✓ Real totalLeads is strictly 0 when demo data excluded.');

  const statsDemoRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/dashboard/stats?include_demo=true',
    method: 'GET',
    headers: authHeaders,
  });

  console.log('With Demo Stats (include_demo=true):', statsDemoRes.data.stats);
  if (statsDemoRes.data.stats.totalLeads !== 100) {
    throw new Error(`Expected demo totalLeads to be 100, got ${statsDemoRes.data.stats.totalLeads}`);
  }
  console.log('✓ Total leads is 100 when demo data is included.');

  // Step 3: Test Duplicate Phone Detection
  console.log('\n[Step 3] Testing Duplicate Phone Check (/api/leads/check-duplicate)...');
  const dupCheckRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/leads/check-duplicate?phone=%2B919000000001',
    method: 'GET',
    headers: authHeaders,
  });

  console.log('Duplicate check output:', dupCheckRes.data);
  if (!dupCheckRes.data.isDuplicate) {
    throw new Error('Expected +919000000001 to be detected as duplicate');
  }
  console.log(`✓ Duplicate phone detected: "${dupCheckRes.data.duplicateLead.full_name}"`);

  // Step 4: Bulk Assign 20 Demo Leads to Rohan
  console.log('\n[Step 4] Testing Bulk Selection & Assignment (20 leads to Rohan)...');
  // First, find Rohan's employee ID
  const empRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/employees',
    method: 'GET',
    headers: authHeaders,
  });

  const rohan = empRes.data.employees?.find((e) =>
    e.profile?.email?.includes('rohan') || e.profile?.full_name?.toLowerCase().includes('rohan')
  );

  if (!rohan) {
    throw new Error('Employee Rohan not found in employees list');
  }
  console.log(`Found Rohan (ID: ${rohan.id}, Name: ${rohan.profile?.full_name})`);

  // Get 20 unassigned demo leads
  const unassignedRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/leads?assigned_to=unassigned&demo=only',
    method: 'GET',
    headers: authHeaders,
  });

  const leadsToAssign = unassignedRes.data.leads.slice(0, 20);
  if (leadsToAssign.length < 20) {
    throw new Error(`Expected at least 20 unassigned demo leads, found ${leadsToAssign.length}`);
  }

  const leadIds = leadsToAssign.map((l) => l.id);
  console.log(`Bulk assigning ${leadIds.length} leads to Rohan...`);

  const bulkRes = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/leads/bulk',
      method: 'POST',
      headers: authHeaders,
    },
    {
      action: 'assign',
      lead_ids: leadIds,
      assigned_to: rohan.id,
    }
  );

  const count = bulkRes.data.affectedCount || bulkRes.data.updatedCount;
  if (bulkRes.statusCode !== 200 || count !== 20) {
    throw new Error(`Bulk assign failed: ${JSON.stringify(bulkRes.data)}`);
  }
  console.log(`✓ Successfully bulk assigned ${count} leads to Rohan.`);

  // Verify lead history exists
  const sampleLeadHistoryRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/leads/${leadIds[0]}/history`,
    method: 'GET',
    headers: authHeaders,
  });

  const historyItems = sampleLeadHistoryRes.data.history || [];
  const assignmentEntry = historyItems.find((h) => h.action_type === 'assignment' || h.action_type === 'assigned');
  if (!assignmentEntry) {
    throw new Error('Expected lead_history row for bulk assignment not found');
  }
  console.log(`✓ Verified lead_history audit entry: "${assignmentEntry.description}"`);

  // Step 5: Test Reset Demo Data Safety (Creates real lead, resets demo, verifies real lead is preserved)
  console.log('\n[Step 5] Testing Reset Demo Data Safety...');
  console.log('Creating ONE real lead (is_demo = false)...');

  const realLeadRes = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/leads',
      method: 'POST',
      headers: authHeaders,
    },
    {
      full_name: '[REAL-TEST] Priya Singhania',
      phone: '+919876599999',
      lead_type: 'buy',
      status: 'new',
      source: 'walk_in',
      location: 'Gomti Nagar Extension',
      requirement: '3 BHK Luxury Apartment',
      budget_min: 7500000,
      budget_max: 9500000,
    }
  );

  if (realLeadRes.statusCode !== 201 && realLeadRes.statusCode !== 200) {
    throw new Error(`Failed to create real test lead: ${JSON.stringify(realLeadRes.data)}`);
  }
  const realLeadId = realLeadRes.data.lead.id;
  console.log(`✓ Real lead created (ID: ${realLeadId}, Name: ${realLeadRes.data.lead.full_name}, is_demo: ${realLeadRes.data.lead.is_demo})`);

  console.log('Triggering Reset Demo Data via /api/leads/demo (reset)...');
  const resetRes = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/leads/demo',
      method: 'POST',
      headers: authHeaders,
    },
    { action: 'reset' }
  );

  console.log(`✓ Reset executed. Deleted ${resetRes.data.deletedCount} demo leads.`);

  // Verify ALL demo leads are deleted
  const demoCheckRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/leads?demo=only',
    method: 'GET',
    headers: authHeaders,
  });

  if (demoCheckRes.data.leads.length !== 0) {
    throw new Error(`Expected 0 demo leads after reset, found ${demoCheckRes.data.leads.length}`);
  }
  console.log('✓ All 100 demo leads are gone.');

  // Verify the REAL lead is STILL THERE
  const realCheckRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/leads/${realLeadId}`,
    method: 'GET',
    headers: authHeaders,
  });

  if (realCheckRes.statusCode !== 200 || !realCheckRes.data.lead) {
    throw new Error('CRITICAL: Real lead was deleted during demo reset!');
  }
  console.log('✓ Real lead was SAFELY PRESERVED!');

  // Clean up the temporary real test lead
  console.log('Cleaning up temporary real test lead...');
  await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/leads/${realLeadId}`,
    method: 'DELETE',
    headers: authHeaders,
  });
  console.log('✓ Temporary real test lead deleted. Database back to 0 real records.');

  // Step 6: Final Re-seed Demo Data (MUST LEAVE 100 DEMO LEADS IN PLACE)
  console.log('\n[Step 6] Final Re-seed of 100 demo leads (PER USER INSTRUCTION TO KEEP DEMO DATA)...');
  const finalSeedRes = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/leads/demo',
      method: 'POST',
      headers: authHeaders,
    },
    { action: 'reseed' }
  );

  console.log(`✓ Final seed complete: ${finalSeedRes.data.insertedCount} demo leads in place.`);

  // Step 7: Integrations Status Endpoint Verification
  console.log('\n[Step 7] Checking Integrations Status endpoint (/api/integrations/status)...');
  const intRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/integrations/status',
    method: 'GET',
    headers: authHeaders,
  });

  console.log('Integrations list returned:', intRes.data.integrations?.map((i) => ({
    name: i.name,
    connected: i.connected,
    webhookUrl: i.webhookUrl,
  })));

  if (!intRes.data.integrations || intRes.data.integrations.length !== 5) {
    throw new Error(`Expected 5 integrations, got ${intRes.data.integrations?.length}`);
  }
  console.log('✓ All 5 channel integrations reported accurately.');

  console.log('\n=====================================================');
  console.log('ALL PHASE 7 VERIFICATION TESTS PASSED SUCCESSFULLY! ✓');
  console.log('100 Demo leads remain in database as requested.');
  console.log('=====================================================');
}

runTests().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
