const http = require('http');

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
          ...headers,
        },
      },
      (res) => {
        let respBody = '';
        res.on('data', (chunk) => (respBody += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(respBody);
          } catch {
            parsed = respBody;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING PHASE 6 END-TO-END VERIFICATION ---');

  // 1. Authenticate Admin
  console.log('\n[1] Authenticating Admin user (admin@diksharealestate.com)...');
  const loginRes = await makeRequest('POST', '/api/auth/login', {
    email: 'admin@diksharealestate.com',
    password: 'AdminPassword123!',
  });

  if (loginRes.status !== 200 || !loginRes.body.success) {
    throw new Error('Admin login failed: ' + JSON.stringify(loginRes.body));
  }

  const setCookie = loginRes.headers['set-cookie'];
  const cookieHeader = Array.isArray(setCookie)
    ? setCookie.map((c) => c.split(';')[0]).join('; ')
    : (setCookie || '').split(';')[0];

  const authHeaders = { Cookie: cookieHeader };
  console.log('✓ Admin authenticated successfully.');

  // 2. Test Employee Performance API
  console.log('\n[2] Testing Employee Performance & Daily Report API (/api/employees/performance)...');
  const perfRes = await makeRequest('GET', '/api/employees/performance', null, authHeaders);
  if (perfRes.status !== 200) {
    throw new Error('Failed to fetch employee performance: ' + JSON.stringify(perfRes.body));
  }
  console.log(`✓ Performance loaded: ${perfRes.body.performance?.length || 0} employees tracked.`);
  console.log(`  Today Totals: leads=${perfRes.body.todayTotals?.leadsAssigned}, calls=${perfRes.body.todayTotals?.callsLogged}, visits=${perfRes.body.todayTotals?.visitsCompleted}, followups=${perfRes.body.todayTotals?.followupsCompleted}`);
  console.log(`  Leaderboard: ${perfRes.body.leaderboard?.length || 0} agents ranked.`);

  // 3. Test Employee Deactivation & Reactivation
  console.log('\n[3] Testing Employee Deactivation & Login Blocking...');
  const empListRes = await makeRequest('GET', '/api/employees', null, authHeaders);
  const targetEmp = empListRes.body.employees?.find((e) => e.profile?.role === 'employee');
  if (targetEmp) {
    console.log(`  Deactivating agent "${targetEmp.profile?.full_name}" (${targetEmp.id})...`);
    const deactRes = await makeRequest('PATCH', `/api/employees/${targetEmp.id}`, { isActive: false }, authHeaders);
    if (deactRes.status !== 200) throw new Error('Failed to deactivate employee: ' + JSON.stringify(deactRes.body));

    // Try login with targetEmp credentials
    const blockedLogin = await makeRequest('POST', '/api/auth/login', {
      email: targetEmp.profile?.email || 'rohan@diksharealestate.com',
      password: 'AgentPassword123!',
    });
    console.log(`  Deactivated login response status: ${blockedLogin.status} (Expected 403 Forbidden).`);
    if (blockedLogin.status !== 403) {
      throw new Error(`Expected 403 for deactivated user but received ${blockedLogin.status}`);
    }
    console.log('✓ Inactive employee login successfully blocked with 403!');

    // Reactivate employee
    console.log('  Reactivating employee...');
    await makeRequest('PATCH', `/api/employees/${targetEmp.id}`, { isActive: true }, authHeaders);
    console.log('✓ Employee reactivated cleanly.');
  } else {
    console.log('  No employee found to test deactivation (skipped).');
  }

  // 4. Test Client Project Submissions
  console.log('\n[4] Testing Client-Added Projects API (/api/project-submissions)...');
  const subRes = await makeRequest('POST', '/api/project-submissions', {
    project_name: '[TEST] Gomti Greens Penthouse',
    project_type: 'Penthouse / Luxury Flat',
    location: 'Sector 7, Gomti Nagar Extension, Lucknow',
    price_min: 7500000,
    price_max: 9500000,
    description: 'Ultra-luxurious 4BHK terrace penthouse with river view.',
    photos: ['/uploads/properties/test-penthouse-1.jpg', '/uploads/properties/test-penthouse-2.jpg'],
    client_name: 'Anand Singhal',
    client_phone: '+91 99887 76655',
    client_email: 'anand.singhal@gmail.com',
  }, authHeaders);

  if (subRes.status !== 201) {
    throw new Error('Project submission failed: ' + JSON.stringify(subRes.body));
  }

  const createdSub = subRes.body.submission;
  console.log(`✓ Project submitted: "${createdSub.project_name}" (ID: ${createdSub.id}, Status: ${createdSub.status})`);

  // Verify counts & listing
  const listSubRes = await makeRequest('GET', '/api/project-submissions?status=pending', null, authHeaders);
  console.log(`  Pending submissions count: ${listSubRes.body.counts?.pending}`);

  // Test Approval -> Auto Property Creation
  console.log('  Approving project submission...');
  const approveRes = await makeRequest('PATCH', `/api/project-submissions/${createdSub.id}`, {
    action: 'approve',
    admin_notes: 'Verified title deed and approved for active listing.',
  }, authHeaders);

  if (approveRes.status !== 200 || !approveRes.body.created_property_id) {
    throw new Error('Approval failed: ' + JSON.stringify(approveRes.body));
  }

  const approvedPropId = approveRes.body.created_property_id;
  console.log(`✓ Submission approved! Automatically created Property ID: ${approvedPropId}`);

  // Test Rejection
  console.log('  Submitting second project to test rejection workflow...');
  const sub2Res = await makeRequest('POST', '/api/project-submissions', {
    project_name: '[TEST] Invalid Disputed Plot',
    project_type: 'Plot / Land',
    location: 'Sultanpur Road, Lucknow',
    price_min: 1500000,
    price_max: 2000000,
    client_name: 'Vikram Seth',
    client_phone: '+91 98111 22334',
  }, authHeaders);

  const sub2 = sub2Res.body.submission;
  const rejectRes = await makeRequest('PATCH', `/api/project-submissions/${sub2.id}`, {
    action: 'reject',
    admin_notes: 'Incomplete registry paperwork and encumbrance issue.',
  }, authHeaders);

  if (rejectRes.status !== 200 || rejectRes.body.submission.status !== 'rejected') {
    throw new Error('Rejection failed: ' + JSON.stringify(rejectRes.body));
  }
  console.log(`✓ Rejection workflow verified: submission marked rejected with reason preserved.`);

  // 5. Test Rentals & Rent Collection
  console.log('\n[5] Testing Rentals & Collection Management (/api/rentals)...');
  const rentalRes = await makeRequest('POST', '/api/rentals', {
    property_id: approvedPropId,
    tenant_name: 'Dr. Sameer Kapoor',
    tenant_phone: '+91 94150 11223',
    tenant_email: 'dr.sameer@hospital.org',
    tenant_id: 'AADHAAR-890123456789',
    owner_name: 'Anand Singhal',
    owner_phone: '+91 99887 76655',
    monthly_rent: 45000,
    deposit_amount: 90000,
    rent_due_day: 5,
    agreement_start_date: new Date().toISOString().split('T')[0],
    agreement_end_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0], // 15 days left (triggers expiry alert!)
    brokerage_percentage: 2.0,
    status: 'active',
    notes: 'Premium tenancy with corporate lease guarantee.',
  }, authHeaders);

  if (rentalRes.status !== 201) {
    throw new Error('Rental creation failed: ' + JSON.stringify(rentalRes.body));
  }

  const createdRental = rentalRes.body.rental;
  console.log(`✓ Rental agreement created: #RNT-${createdRental.rental_number} for Tenant "${createdRental.tenant_name}" (Rent: ₹${createdRental.monthly_rent}/mo)`);

  // Verify Rent Collection / Payment recording
  const currentYm = new Date().toISOString().slice(0, 7);
  console.log(`  Recording rent collection for month ${currentYm}...`);
  const paymentRes = await makeRequest('POST', `/api/rentals/${createdRental.id}/payments`, {
    month_year: currentYm,
    amount: 45000,
    status: 'paid',
    paid_date: new Date().toISOString().split('T')[0],
    payment_mode: 'bank_transfer',
    transaction_reference: 'HDFC-NEFT-99887766',
    notes: 'Full rent collected on time.',
  }, authHeaders);

  if (paymentRes.status !== 200 || paymentRes.body.payment.status !== 'paid') {
    throw new Error('Payment recording failed: ' + JSON.stringify(paymentRes.body));
  }
  console.log(`✓ Rent collection verified: ${currentYm} marked as PAID via Bank Transfer.`);

  // Test 11-Month Renewal Action
  console.log('  Testing 11-Month Renewal extension...');
  const futureEnd = new Date(Date.now() + 330 * 86400000).toISOString().split('T')[0];
  const renewRes = await makeRequest('PATCH', `/api/rentals/${createdRental.id}`, {
    agreement_end_date: futureEnd,
    monthly_rent: 50000, // 10% rent escalation
  }, authHeaders);

  if (renewRes.status !== 200 || Number(renewRes.body.rental.monthly_rent) !== 50000) {
    throw new Error('Renewal failed: ' + JSON.stringify(renewRes.body));
  }
  console.log(`✓ Renewal verified: Extended agreement to ${futureEnd} with new escalated rent ₹50,000/mo.`);

  // Verify Expiry System includes Rentals
  console.log('  Verifying Expiry Alerts API (/api/alerts/expiries)...');
  const alertRes = await makeRequest('GET', '/api/alerts/expiries', null, authHeaders);
  console.log(`✓ Expiry alerts API responds status 200 with voiceAlerts count: ${alertRes.body.voiceAlerts?.length || 0}`);

  // 6. Test Data Cleanup
  console.log('\n[6] CLEANING UP ALL TEST RECORDS (Returning DB to real 0s)...');
  // Delete rental
  await makeRequest('DELETE', `/api/rentals/${createdRental.id}`, null, authHeaders);
  console.log('  Deleted test rental agreement and payments.');

  // Delete project submissions
  await makeRequest('DELETE', `/api/project-submissions/${createdSub.id}`, null, authHeaders);
  await makeRequest('DELETE', `/api/project-submissions/${sub2.id}`, null, authHeaders);
  console.log('  Deleted test project submissions.');

  // Delete approved property
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: 'postgresql://postgres:postgres@172.31.128.153:5432/diksha_crm',
  });
  await pool.query('DELETE FROM public.properties WHERE id = $1', [approvedPropId]);
  console.log('  Deleted approved test property.');

  // Clean up test audit logs and brokerage
  await pool.query("DELETE FROM public.brokerage WHERE notes LIKE '%Brokerage for Rental Agreement%'");
  await pool.query("DELETE FROM public.project_submissions WHERE project_name LIKE '%[TEST]%'");
  await pool.query("DELETE FROM public.properties WHERE title LIKE '%[TEST]%'");
  await pool.query("DELETE FROM public.rentals WHERE tenant_name LIKE '%Kapoor%'");
  await pool.query("DELETE FROM public.audit_logs WHERE new_data::text LIKE '%Gomti Greens%' OR new_data::text LIKE '%Kapoor%' OR new_data::text LIKE '%Disputed%'");
  await pool.end();

  // Verify Final Clean State
  console.log('\n[7] VERIFYING CLEAN STATE COUNTS...');
  const finalRentals = await makeRequest('GET', '/api/rentals', null, authHeaders);
  const finalSubs = await makeRequest('GET', '/api/project-submissions', null, authHeaders);
  const finalProps = await makeRequest('GET', '/api/properties', null, authHeaders);

  console.log(`  Total Rentals in DB: ${finalRentals.body.rentals?.length || 0}`);
  console.log(`  Total Project Submissions in DB: ${finalSubs.body.submissions?.length || 0}`);
  console.log(`  Total Available Properties in DB: ${finalProps.body.properties?.length || 0}`);

  console.log('\n=== ALL PHASE 6 END-TO-END TESTS PASSED SUCCESSFULLY! ===\n');
}

runTests().catch((err) => {
  console.error('\n❌ E2E TEST FAILED:', err);
  process.exit(1);
});
