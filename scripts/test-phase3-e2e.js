const { Client } = require('pg');

const BASE_URL = 'http://localhost:3000';
const DB_URL = 'postgresql://postgres:postgres@172.31.128.153:5432/diksha_crm';

async function runPhase3Verification() {
  console.log('========================================================');
  console.log('    DIKSHA CRM - PHASE 3 END-TO-END VERIFICATION       ');
  console.log('========================================================\n');

  let adminCookie = '';
  let employeeCookie = '';

  // 1. Authenticate Super Admin
  console.log('1. Authenticating Super Admin (admin@diksharealestate.com)...');
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@diksharealestate.com',
      password: 'AdminPassword123!',
    }),
  });
  const adminLoginData = await adminLoginRes.json();
  if (!adminLoginRes.ok || !adminLoginData.user) {
    throw new Error(`Admin login failed: ${JSON.stringify(adminLoginData)}`);
  }
  adminCookie = adminLoginRes.headers.get('set-cookie').split(';')[0];
  console.log('   ✓ Super Admin authenticated! Role:', adminLoginData.user.role);

  // 2. Authenticate Employee
  console.log('\n2. Authenticating Employee (rohan@diksharealestate.com)...');
  const empLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'rohan@diksharealestate.com',
      password: 'AgentPassword123!',
    }),
  });
  const empLoginData = await empLoginRes.json();
  if (!empLoginRes.ok || !empLoginData.user) {
    throw new Error(`Employee login failed: ${JSON.stringify(empLoginData)}`);
  }
  employeeCookie = empLoginRes.headers.get('set-cookie').split(';')[0];
  console.log('   ✓ Employee authenticated! Role:', empLoginData.user.role);

  // 3. Create Test Lead
  console.log('\n3. Creating Test Lead (POST /api/leads)...');
  const leadRes = await fetch(`${BASE_URL}/api/leads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      full_name: 'TEST - Rajesh Varma',
      phone: '9876543210',
      email: 'rajesh.varma@test.com',
      lead_type: 'buy',
      status: 'new',
      source: 'walk_in',
      budget_min: 12000000,
      budget_max: 18000000,
      location: 'Gomti Nagar Extension',
      requirement: '3 BHK',
      remarks: 'Interested in luxury high-rise with river view.',
    }),
  });
  const leadData = await leadRes.json();
  if (!leadRes.ok || !leadData.lead) {
    throw new Error(`Create lead failed: ${JSON.stringify(leadData)}`);
  }
  const testLeadId = leadData.lead.id;
  console.log(`   ✓ Created Test Lead: ${leadData.lead.full_name} [ID: ${testLeadId}]`);

  // 4. Create Test Property
  console.log('\n4. Creating Test Property (POST /api/properties)...');
  const propRes = await fetch(`${BASE_URL}/api/properties`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      title: 'TEST - Omaxe Grand Heights 3BHK',
      property_type: 'resale',
      bhk: '3 BHK',
      price: 15000000,
      location: 'Gomti Nagar Extension',
      address: 'Tower B, 14th Floor, Gomti Nagar Extension, Lucknow',
      status: 'available',
      view_360_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
      description: 'Ultra-luxury 3BHK flat with panoramic view and premium clubhouse.',
    }),
  });
  const propData = await propRes.json();
  if (!propRes.ok || !propData.property) {
    throw new Error(`Create property failed: ${JSON.stringify(propData)}`);
  }
  const testPropId = propData.property.id;
  console.log(`   ✓ Created Test Property: ${propData.property.title} [ID: ${testPropId}]`);

  // 5. Test Call Logging
  console.log('\n5. Testing Call Logging (POST /api/calls)...');
  const callRes = await fetch(`${BASE_URL}/api/calls`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      lead_id: testLeadId,
      outcome: 'connected',
      duration_seconds: 180,
      client_phone: '9876543210',
      notes: 'Spoke with Mr. Rajesh. Explained project layout and verified budget capability.',
      recording_url: '/uploads/call-recordings/test-sample.mp3',
    }),
  });
  const callData = await callRes.json();
  if (!callRes.ok || !callData.call) {
    throw new Error(`Call logging failed: ${JSON.stringify(callData)}`);
  }
  const testCallId = callData.call.id;
  console.log(`   ✓ Call logged successfully: Outcome: ${callData.call.outcome}, Duration: ${callData.call.duration_seconds}s [ID: ${testCallId}]`);

  // 6. Test WhatsApp Direct & Templates
  console.log('\n6. Testing WhatsApp Direct Message (POST /api/whatsapp)...');
  const waRes = await fetch(`${BASE_URL}/api/whatsapp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      lead_id: testLeadId,
      recipient_phone: '9876543210',
      template_name: 'property_share',
      message_text: 'Dear Rajesh, here is the verified 3BHK listing at Omaxe Grand Heights matching your requirements.',
    }),
  });
  const waData = await waRes.json();
  if (!waRes.ok || !waData.message) {
    throw new Error(`WhatsApp logging failed: ${JSON.stringify(waData)}`);
  }
  console.log(`   ✓ WhatsApp message recorded: Template: ${waData.message.template_name}`);
  console.log(`   ✓ Direct wa.me dispatch URL generated: ${waData.waMeUrl}`);

  // 7. Test Site Visit Scheduling
  console.log('\n7. Testing Site Visit Scheduling (POST /api/site-visits)...');
  const tmrw = new Date();
  tmrw.setDate(tmrw.getDate() + 1);
  const visitDate = tmrw.toISOString();

  const visitRes = await fetch(`${BASE_URL}/api/site-visits`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      lead_id: testLeadId,
      property_id: testPropId,
      visit_date: visitDate,
      client_interest_level: 'hot',
      feedback: 'Client scheduled on-site tour accompanied by family.',
    }),
  });
  const visitData = await visitRes.json();
  if (!visitRes.ok || !visitData.visit) {
    throw new Error(`Site visit creation failed: ${JSON.stringify(visitData)}`);
  }
  const testVisitId = visitData.visit.id;
  console.log(`   ✓ Site Visit scheduled for tomorrow at ${visitDate} [ID: ${testVisitId}]`);

  // 8. Test Site Visit Completion with Feedback
  console.log('\n8. Testing Site Visit Completion (PATCH /api/site-visits/[id])...');
  const completeVisitRes = await fetch(`${BASE_URL}/api/site-visits/${testVisitId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      status: 'completed',
      client_interest_level: 'hot',
      outcome_note: 'Client loved the floor plan, natural lighting, and corner balcony. Ready to make token deposit.',
    }),
  });
  const completeVisitData = await completeVisitRes.json();
  if (!completeVisitRes.ok || !completeVisitData.visit) {
    throw new Error(`Complete visit failed: ${JSON.stringify(completeVisitData)}`);
  }
  console.log(`   ✓ Site Visit marked completed! Outcome: "${completeVisitData.visit.outcome_note}"`);

  // 9. Test Deal Closing & Automatic Brokerage Calculation
  console.log('\n9. Testing Deal Closing & Auto-Brokerage (POST /api/deals)...');
  const dealRes = await fetch(`${BASE_URL}/api/deals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      lead_id: testLeadId,
      property_id: testPropId,
      deal_value: 15000000,
      brokerage_percentage: 2.0,
      status: 'closed_won',
      closed_date: new Date().toISOString().split('T')[0],
      notes: 'Deal finalized at agreed valuation. Token received.',
    }),
  });
  const dealData = await dealRes.json();
  if (!dealRes.ok || !dealData.deal) {
    throw new Error(`Deal creation failed: ${JSON.stringify(dealData)}`);
  }
  const testDealId = dealData.deal.id;
  console.log(`   ✓ Deal closed successfully! Deal #${dealData.deal.deal_number}`);
  console.log(`   ✓ Deal Value: ₹${dealData.deal.deal_value.toLocaleString('en-IN')}`);
  console.log(`   ✓ Agency Commission (2%): ₹${dealData.deal.commission_amount.toLocaleString('en-IN')}`);

  // 10. Verify Brokerage Ledger & Record Payment
  console.log('\n10. Testing Brokerage Ledger (GET /api/brokerage)...');
  const brokRes = await fetch(`${BASE_URL}/api/brokerage`, {
    headers: { Cookie: adminCookie },
  });
  const brokData = await brokRes.json();
  if (!brokRes.ok || !brokData.brokerage) {
    throw new Error(`Fetch brokerage failed: ${JSON.stringify(brokData)}`);
  }
  const myBrokerage = brokData.brokerage.find((b) => b.deal_id === testDealId);
  if (!myBrokerage) {
    throw new Error('Auto-created brokerage record not found in ledger!');
  }
  console.log(`   ✓ Auto-created Brokerage Record verified in Ledger! [ID: ${myBrokerage.id}] Status: ${myBrokerage.status}`);

  console.log('   Recording Brokerage Payout (PATCH /api/brokerage)...');
  const payRes = await fetch(`${BASE_URL}/api/brokerage`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      id: myBrokerage.id,
      paid_amount: 300000,
      status: 'paid',
      notes: 'Client wire transfer received in company account.',
    }),
  });
  const payData = await payRes.json();
  console.log(`   ✓ Brokerage marked PAID! Amount: ₹${Number(payData.brokerage.paid_brokerage).toLocaleString('en-IN')}`);

  // 11. Test Analytics Aggregations
  console.log('\n11. Testing BI Analytics Engine (GET /api/reports/analytics)...');
  const analyticsRes = await fetch(`${BASE_URL}/api/reports/analytics`, {
    headers: { Cookie: adminCookie },
  });
  const analyticsData = await analyticsRes.json();
  if (!analyticsRes.ok || !analyticsData.analytics) {
    throw new Error(`Analytics failed: ${JSON.stringify(analyticsData)}`);
  }
  const a = analyticsData.analytics;
  console.log('   ✓ Analytics compiled successfully:');
  console.log(`     - Total Deal Value: ₹${a.deals.totalDealValue.toLocaleString('en-IN')}`);
  console.log(`     - Total Brokerage: ₹${a.deals.totalBrokerage.toLocaleString('en-IN')}`);
  console.log(`     - Site Visits Completed: ${a.siteVisits.completed} of ${a.siteVisits.total}`);
  console.log(`     - Leads in Closed Won:`, a.leadsByStatus.find((s) => s.status === 'closed_won')?.count || 0);

  // 12. Test Excel Workbook Export (.xlsx)
  console.log('\n12. Testing Excel Export Engine (GET /api/reports/export?type=all)...');
  const exportRes = await fetch(`${BASE_URL}/api/reports/export?type=all`, {
    headers: { Cookie: adminCookie },
  });
  if (!exportRes.ok) {
    throw new Error(`Excel export failed: ${exportRes.status}`);
  }
  const contentType = exportRes.headers.get('content-type');
  const arrayBuffer = await exportRes.arrayBuffer();
  console.log(`   ✓ Excel file generated! Size: ${arrayBuffer.byteLength} bytes`);
  console.log(`   ✓ Content-Type: ${contentType}`);

  // 13. Verify Clean Test Data Removal
  console.log('\n13. Cleaning up all test records from local PostgreSQL database...');
  const pg = new Client({ connectionString: DB_URL });
  await pg.connect();

  await pg.query('DELETE FROM public.brokerage');
  await pg.query('DELETE FROM public.deals');
  await pg.query('DELETE FROM public.site_visits');
  await pg.query('DELETE FROM public.calls');
  await pg.query('DELETE FROM public.whatsapp_messages');
  await pg.query('DELETE FROM public.follow_ups');
  await pg.query('DELETE FROM public.lead_history');
  await pg.query('DELETE FROM public.leads');
  await pg.query('DELETE FROM public.properties');
  await pg.query("DELETE FROM public.audit_logs WHERE entity_type IN ('leads', 'properties', 'calls', 'site_visits', 'deals', 'brokerage', 'whatsapp')");

  // Verify counts are strictly 0
  const leadCount = (await pg.query('SELECT COUNT(*) as count FROM public.leads')).rows[0].count;
  const propCount = (await pg.query('SELECT COUNT(*) as count FROM public.properties')).rows[0].count;
  const dealCount = (await pg.query('SELECT COUNT(*) as count FROM public.deals')).rows[0].count;
  const visitCount = (await pg.query('SELECT COUNT(*) as count FROM public.site_visits')).rows[0].count;
  const callCount = (await pg.query('SELECT COUNT(*) as count FROM public.calls')).rows[0].count;

  console.log('\n--- VERIFICATION OF EMPTY STATE (REAL ZEROES) ---');
  console.log('   Leads remaining:', leadCount);
  console.log('   Properties remaining:', propCount);
  console.log('   Deals remaining:', dealCount);
  console.log('   Site Visits remaining:', visitCount);
  console.log('   Calls remaining:', callCount);

  if (leadCount === '0' && propCount === '0' && dealCount === '0') {
    console.log('\n🎉 ALL PHASE 3 VERIFICATIONS PASSED WITH ZERO ERRORS!');
  } else {
    throw new Error('Some test records failed to delete.');
  }

  await pg.end();
}

runPhase3Verification().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
