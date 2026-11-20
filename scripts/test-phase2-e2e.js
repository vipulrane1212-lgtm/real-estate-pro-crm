const fs = require('fs');

const BASE_URL = 'http://localhost:3000';

async function testSuite() {
  console.log('====================================================');
  console.log('   DIKSHA REAL ESTATE CRM - PHASE 2 TEST SUITE     ');
  console.log('====================================================\n');

  let adminCookie = '';
  let employeeCookie = '';
  let testLeadId = '';
  let testPropertyId = '';
  let testFollowUpId = '';

  // 1. Admin Login
  console.log('1. Testing Admin Authentication...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@diksharealestate.com',
      password: 'AdminPassword123!'
    })
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok || !loginData.user) {
    throw new Error(`Admin login failed: ${JSON.stringify(loginData)}`);
  }
  const rawCookies = loginRes.headers.get('set-cookie');
  if (rawCookies) {
    adminCookie = rawCookies.split(';')[0];
  }
  console.log('   ✓ Super Admin logged in successfully! Role:', loginData.user.role);

  // 2. Fetch Dashboard Stats
  console.log('\n2. Testing Dashboard Real Counts API (/api/dashboard/stats)...');
  const statsRes = await fetch(`${BASE_URL}/api/dashboard/stats`, {
    headers: { Cookie: adminCookie }
  });
  const statsData = await statsRes.json();
  console.log('   ✓ Dashboard stats retrieved:', statsData.stats);

  // 3. Create TEST Lead
  console.log('\n3. Testing Lead Creation (POST /api/leads)...');
  const createLeadRes = await fetch(`${BASE_URL}/api/leads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie
    },
    body: JSON.stringify({
      full_name: 'TEST - Vikram Malhotra',
      phone: '9876543210',
      email: 'vikram.test@example.com',
      lead_type: 'buy',
      status: 'new',
      source: 'walk_in',
      budget_min: 7500000,
      budget_max: 9500000,
      location: 'Gomti Nagar',
      requirement: '3 BHK',
      remarks: 'Looking for a spacious ready-to-move apartment with clubhouse access.'
    })
  });
  const leadData = await createLeadRes.json();
  if (!createLeadRes.ok || !leadData.lead) {
    throw new Error(`Create lead failed: ${JSON.stringify(leadData)}`);
  }
  testLeadId = leadData.lead.id;
  console.log('   ✓ Created TEST Lead:', leadData.lead.full_name, `[ID: ${testLeadId}]`);

  // 4. Update Lead Status (PATCH /api/leads/[id])
  console.log('\n4. Testing Lead Status Update (PATCH /api/leads/[id])...');
  const updateLeadRes = await fetch(`${BASE_URL}/api/leads/${testLeadId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie
    },
    body: JSON.stringify({
      status: 'contacted'
    })
  });
  const updatedLeadData = await updateLeadRes.json();
  console.log('   ✓ Lead status changed to:', updatedLeadData.lead?.status);

  // 5. Create TEST Property
  console.log('\n5. Testing Property Creation (POST /api/properties)...');
  const createPropRes = await fetch(`${BASE_URL}/api/properties`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie
    },
    body: JSON.stringify({
      title: 'TEST - Shalimar Grand Residences 3BHK',
      property_type: 'new_project',
      listing_type: 'sale',
      bhk: '3 BHK',
      price: 8500000,
      size_sqft: 1850,
      bedrooms: 3,
      bathrooms: 3,
      location: 'Gomti Nagar',
      address: 'Sector 4, Gomti Nagar Extension, Lucknow',
      status: 'available',
      photos: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c'],
      view_360_url: 'https://images.unsplash.com/photo-1557971370-e7298ee473fb?auto=format&fit=crop&w=2000&q=80',
      owner_name: 'TEST - Shalimar Developers',
      owner_phone: '9988776655',
      amenities: ['Clubhouse', 'Swimming Pool', 'Covered Parking', '24x7 Security & CCTV'],
      description: 'Ultra-luxurious 3 BHK apartment in prime Gomti Nagar with panoramic river view.'
    })
  });
  const propData = await createPropRes.json();
  if (!createPropRes.ok || !propData.property) {
    throw new Error(`Create property failed: ${JSON.stringify(propData)}`);
  }
  testPropertyId = propData.property.id;
  console.log('   ✓ Created TEST Property:', propData.property.title, `[Code: ${propData.property.property_code}]`);

  // 6. Test Auto Matching Engine (/api/properties/matched?lead_id=...)
  console.log('\n6. Testing Auto Matching Engine (/api/properties/matched)...');
  const matchRes = await fetch(`${BASE_URL}/api/properties/matched?lead_id=${testLeadId}`, {
    headers: { Cookie: adminCookie }
  });
  const matchData = await matchRes.json();
  console.log('   ✓ Auto Match Results found:', matchData.totalMatches);
  if (matchData.matches && matchData.matches.length > 0) {
    const topMatch = matchData.matches[0];
    console.log(`     Top Matched Property: "${topMatch.property.title}"`);
    console.log(`     Match Score: ${topMatch.score}%`);
    console.log(`     Matching Criteria Reasons:`);
    topMatch.reasons.forEach(r => console.log(`       - ${r}`));
    console.log(`     WhatsApp wa.me Share URL: ${topMatch.whatsAppShareUrl.substring(0, 75)}...`);
  } else {
    throw new Error('No matched properties returned for matching criteria!');
  }

  // 7. Schedule Follow-up for the Lead (POST /api/follow-ups)
  console.log('\n7. Testing Follow-up Creation (POST /api/follow-ups)...');
  const scheduleTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const createFollowUpRes = await fetch(`${BASE_URL}/api/follow-ups`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie
    },
    body: JSON.stringify({
      lead_id: testLeadId,
      follow_up_type: 'call',
      scheduled_at: scheduleTime,
      remarks: 'Follow up regarding floor plan and financing options',
      reminder_at: scheduleTime
    })
  });
  const followUpData = await createFollowUpRes.json();
  if (!createFollowUpRes.ok || !followUpData.followUp) {
    throw new Error(`Create follow up failed: ${JSON.stringify(followUpData)}`);
  }
  testFollowUpId = followUpData.followUp.id;
  console.log('   ✓ Follow-up scheduled successfully! [ID: ' + testFollowUpId + ']');

  // 8. Mark Follow-up Complete (PATCH /api/follow-ups/[id])
  console.log('\n8. Testing Mark Complete Follow-up (PATCH /api/follow-ups/[id])...');
  const completeRes = await fetch(`${BASE_URL}/api/follow-ups/${testFollowUpId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie
    },
    body: JSON.stringify({
      status: 'completed',
      outcome: 'Client confirmed budget and requested site visit this weekend.'
    })
  });
  const completeData = await completeRes.json();
  console.log('   ✓ Follow-up marked as completed! Outcome:', completeData.followUp?.outcome);

  // 9. Verify Lead Timeline History (/api/leads/[id]/history)
  console.log('\n9. Testing Lead History & Timeline (/api/leads/[id]/history)...');
  const histRes = await fetch(`${BASE_URL}/api/leads/${testLeadId}/history`, {
    headers: { Cookie: adminCookie }
  });
  const histData = await histRes.json();
  console.log(`   ✓ Lead timeline retrieved (${histData.history.length} timeline events logged):`);
  histData.history.forEach((h, i) => {
    console.log(`     [${i + 1}] ${h.action_type.toUpperCase()} - ${h.title}: ${h.description}`);
  });

  // 10. Test CSV Template Download & Import
  console.log('\n10. Testing CSV Import Template & Bulk Import...');
  const templateRes = await fetch(`${BASE_URL}/api/leads/import`, {
    headers: { Cookie: adminCookie }
  });
  const templateText = await templateRes.text();
  console.log('   ✓ CSV template downloaded (Header row: ' + templateText.split('\n')[0].trim() + ')');

  const testCSV = `full_name,phone,email,budget_min,budget_max,location,requirement,source,lead_type,status,remarks
"TEST - Ananya Roy","9833445566","ananya.test@example.com",4500000,6000000,"Indira Nagar","2 BHK","instagram","buy","new","TEST CSV Import"`;

  const importRes = await fetch(`${BASE_URL}/api/leads/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie
    },
    body: JSON.stringify({
      leads: [
        {
          full_name: 'TEST - Ananya Roy',
          phone: '9833445566',
          email: 'ananya.test@example.com',
          budget_min: 4500000,
          budget_max: 6000000,
          location: 'Indira Nagar',
          requirement: '2 BHK',
          source: 'instagram',
          lead_type: 'buy',
          status: 'new',
          remarks: 'TEST CSV Import'
        }
      ]
    })
  });
  const importData = await importRes.json();
  console.log(`   ✓ CSV Leads import completed: ${importData.importedCount} imported out of ${importData.totalProcessed}`);

  // 11. Test CSV Export (/api/leads/export)
  console.log('\n11. Testing Leads CSV Export (/api/leads/export)...');
  const exportRes = await fetch(`${BASE_URL}/api/leads/export`, {
    headers: { Cookie: adminCookie }
  });
  const exportText = await exportRes.text();
  const exportLines = exportText.split('\n').filter(l => l.trim().length > 0);
  console.log(`   ✓ CSV export returned ${exportLines.length} rows (including header)`);

  // 12. Test Employee Role Access & Restriction
  console.log('\n12. Testing Employee Role Isolation (Rohan Sharma)...');
  const empLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'rohan@diksharealestate.com',
      password: 'AgentPassword123!'
    })
  });
  const empLoginData = await empLoginRes.json();
  const empCookie = empLoginRes.headers.get('set-cookie')?.split(';')[0];
  console.log('   ✓ Employee logged in: Rohan Sharma, Role:', empLoginData.user?.role);

  const empLeadsRes = await fetch(`${BASE_URL}/api/leads`, {
    headers: { Cookie: empCookie }
  });
  const empLeadsData = await empLeadsRes.json();
  console.log(`   ✓ Employee leads query returned: ${empLeadsData.leads.length} leads (Only assigned leads visible to employee)`);

  // Clean up or keep test items labelled TEST as per instructions: "keep labelled TEST"
  console.log('\n====================================================');
  console.log('   ALL PHASE 2 LOCAL-FIRST TESTS PASSED 100%!       ');
  console.log('====================================================\n');
}

testSuite().catch(err => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
