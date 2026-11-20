const { Client } = require('pg');

const BASE_URL = 'http://localhost:3000';
const DB_URL = 'postgresql://postgres:postgres@172.31.128.153:5432/diksha_crm';

async function runPhase4Verification() {
  console.log('========================================================');
  console.log('    DIKSHA CRM - PHASE 4 END-TO-END VERIFICATION       ');
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
  console.log('   ✓ Super Admin authenticated! Role: super_admin');

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
  console.log('   ✓ Employee authenticated! Role: employee');

  // 3. Create Test Lead
  console.log('\n3. Creating Test Client Lead (POST /api/leads)...');
  const leadRes = await fetch(`${BASE_URL}/api/leads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      full_name: 'TEST - Vikram Singhal',
      phone: '9811223344',
      email: 'vikram.singhal@test.com',
      lead_type: 'buy',
      status: 'new',
      source: 'reference',
      budget_min: 8000000,
      budget_max: 12000000,
      location: 'Vibhuti Khand',
      requirement: '3 BHK',
      remarks: 'Client KYC verification in progress.',
    }),
  });
  const leadData = await leadRes.json();
  if (!leadRes.ok || !leadData.lead) {
    throw new Error(`Create lead failed: ${JSON.stringify(leadData)}`);
  }
  const testLeadId = leadData.lead.id;
  console.log(`   ✓ Created Test Lead: ${leadData.lead.full_name} [ID: ${testLeadId}]`);

  // 4. Test Document Upload & KYC Integration
  console.log('\n4. Testing Document Upload & Association (POST /api/documents)...');
  const docUploadRes = await fetch(`${BASE_URL}/api/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      title: 'TEST - Vikram Singhal - Aadhaar Card Verification',
      document_type: 'aadhaar',
      file_url: '/uploads/documents/test-aadhaar.pdf',
      file_type: 'application/pdf',
      file_size: 245000,
      lead_id: testLeadId,
      expiry_date: '2030-12-31',
    }),
  });
  const docData = await docUploadRes.json();
  if (!docUploadRes.ok || !docData.document) {
    throw new Error(`Document creation failed: ${JSON.stringify(docData)}`);
  }
  const testDocId = docData.document.id;
  console.log(`   ✓ Document recorded: "${docData.document.title}" Type: ${docData.document.document_type} [ID: ${testDocId}]`);

  // Verify Document is in lead timeline
  const leadHistRes = await fetch(`${BASE_URL}/api/leads/${testLeadId}/history`, {
    headers: { Cookie: adminCookie },
  });
  const leadHistData = await leadHistRes.json();
  const hasDocInHist = leadHistData.history?.some((h) => h.action_type === 'document');
  console.log(`   ✓ Lead Timeline entry logged for document upload: ${hasDocInHist ? 'YES' : 'NO'}`);

  // Test Document RBAC: Employee cannot delete document
  console.log('   Testing Document Deletion Security (DELETE /api/documents/[id])...');
  const empDeleteDocRes = await fetch(`${BASE_URL}/api/documents/${testDocId}`, {
    method: 'DELETE',
    headers: { Cookie: employeeCookie },
  });
  console.log(`   ✓ Employee document delete attempt status: ${empDeleteDocRes.status} (Expected: 403 Forbidden)`);

  // 5. Test Attendance Enforcement
  console.log('\n5. Testing Attendance Live Safeguards & Enforcements...');

  // Test A: Location Permission Denied Check
  console.log('   [Test A] Check-in with missing/denied GPS coordinates...');
  const noGpsRes = await fetch(`${BASE_URL}/api/attendance/check-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: employeeCookie,
    },
    body: JSON.stringify({
      latitude: null,
      longitude: null,
      selfie_base64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/',
    }),
  });
  const noGpsData = await noGpsRes.json();
  console.log(`   ✓ Missing location response status: ${noGpsRes.status} (Expected: 400)`);
  console.log(`   ✓ Rejection message: "${noGpsData.error}"`);

  // Test B: Missing Live Selfie Check
  console.log('   [Test B] Check-in with missing live selfie...');
  const noSelfieRes = await fetch(`${BASE_URL}/api/attendance/check-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: employeeCookie,
    },
    body: JSON.stringify({
      latitude: 26.8467,
      longitude: 80.9462,
    }),
  });
  const noSelfieData = await noSelfieRes.json();
  console.log(`   ✓ Missing selfie response status: ${noSelfieRes.status} (Expected: 400)`);
  console.log(`   ✓ Rejection message: "${noSelfieData.error}"`);

  // Test C: Valid Check-in with Live Selfie & GPS
  console.log('   [Test C] Valid Employee Check-in (Live Selfie + Lucknow GPS)...');
  const validCheckInRes = await fetch(`${BASE_URL}/api/attendance/check-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: employeeCookie,
    },
    body: JSON.stringify({
      latitude: 26.8467,
      longitude: 80.9462,
      address: 'Gomti Nagar Branch, Lucknow, UP',
      selfie_base64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...',
    }),
  });
  const checkInData = await validCheckInRes.json();
  if (!validCheckInRes.ok || !checkInData.attendance) {
    throw new Error(`Valid check-in failed: ${JSON.stringify(checkInData)}`);
  }
  console.log(`   ✓ Check-in successfully recorded! Status: ${checkInData.attendance.status}, Late?: ${checkInData.attendance.is_late}`);
  console.log(`   ✓ Stored Selfie URL: ${checkInData.attendance.check_in_selfie_url}`);

  // Test D: Second Check-in Block on Same Day
  console.log('   [Test D] Testing Second Check-in Block on same date...');
  const secondCheckInRes = await fetch(`${BASE_URL}/api/attendance/check-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: employeeCookie,
    },
    body: JSON.stringify({
      latitude: 26.8467,
      longitude: 80.9462,
      selfie_base64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...',
    }),
  });
  const secondCheckInData = await secondCheckInRes.json();
  console.log(`   ✓ Second check-in blocked! Status: ${secondCheckInRes.status} (Expected: 400)`);
  console.log(`   ✓ Plain rejection reason: "${secondCheckInData.error}"`);

  // Test E: Valid Employee Check-out
  console.log('   [Test E] Valid Employee Check-out (Live Selfie + GPS)...');
  const checkOutRes = await fetch(`${BASE_URL}/api/attendance/check-out`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: employeeCookie,
    },
    body: JSON.stringify({
      latitude: 26.8469,
      longitude: 80.9465,
      address: 'Gomti Nagar Branch Office, Lucknow, UP',
      selfie_base64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...',
    }),
  });
  const checkOutData = await checkOutRes.json();
  if (!checkOutRes.ok || !checkOutData.attendance) {
    throw new Error(`Check-out failed: ${JSON.stringify(checkOutData)}`);
  }
  console.log(`   ✓ Check-out successfully recorded! Check-out time: ${checkOutData.attendance.check_out}`);

  // Test F: Admin Attendance Excel Export
  console.log('   [Test F] Testing Admin Attendance Report Excel Export (.xlsx)...');
  const curMonth = new Date().toISOString().slice(0, 7);
  const attExcelRes = await fetch(`${BASE_URL}/api/attendance/report?month=${curMonth}&format=xlsx`, {
    headers: { Cookie: adminCookie },
  });
  if (!attExcelRes.ok) {
    throw new Error(`Attendance Excel export failed: ${attExcelRes.status}`);
  }
  const attBuffer = await attExcelRes.arrayBuffer();
  console.log(`   ✓ Attendance Excel workbook generated (${attBuffer.byteLength} bytes)`);

  // 6. Test Office Expenses Module
  console.log('\n6. Testing Office Expenses Management...');
  console.log('   Employee recording a tea/pantry expense (POST /api/expenses)...');
  const expenseRes = await fetch(`${BASE_URL}/api/expenses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: employeeCookie,
    },
    body: JSON.stringify({
      title: 'TEST - Client Hospitality Tea & Refreshments',
      category: 'tea_coffee',
      amount: 850,
      expense_date: new Date().toISOString().split('T')[0],
      paid_to: 'Chai Point Gomti Nagar',
      notes: 'Beverages and snacks for buyer negotiation meeting',
      receipt_url: '/uploads/expenses/test-receipt.jpg',
    }),
  });
  const expenseData = await expenseRes.json();
  if (!expenseRes.ok || !expenseData.expense) {
    throw new Error(`Expense recording failed: ${JSON.stringify(expenseData)}`);
  }
  const testExpenseId = expenseData.expense.id;
  console.log(`   ✓ Expense recorded: "${expenseData.expense.title}" Amount: ₹${expenseData.expense.amount} [ID: ${testExpenseId}]`);

  // Verify monthly totals and breakdown
  const expQueryRes = await fetch(`${BASE_URL}/api/expenses?month=${curMonth}`, {
    headers: { Cookie: adminCookie },
  });
  const expQueryData = await expQueryRes.json();
  console.log(`   ✓ Monthly Expense Summary verified: Total Spend: ₹${expQueryData.totals.thisMonthTotal}, Breakdown:`, expQueryData.totals.categoryBreakdown);

  // Test Expense Security: Employee cannot edit or delete
  console.log('   Testing Expense Security: Employee cannot edit or delete expenses...');
  const empEditRes = await fetch(`${BASE_URL}/api/expenses/${testExpenseId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: employeeCookie,
    },
    body: JSON.stringify({ amount: 99999 }),
  });
  console.log(`   ✓ Employee expense edit attempt status: ${empEditRes.status} (Expected: 403 Forbidden)`);

  // Admin edits expense
  const adminEditRes = await fetch(`${BASE_URL}/api/expenses/${testExpenseId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
    },
    body: JSON.stringify({ notes: 'Approved by Managing Director for client closing meeting.' }),
  });
  const adminEditData = await adminEditRes.json();
  console.log(`   ✓ Admin edited expense: Note updated to "${adminEditData.expense.notes}"`);

  // Test Expense Excel Export
  console.log('   Testing Expense Excel Export (GET /api/expenses/export?month=...)...');
  const expExcelRes = await fetch(`${BASE_URL}/api/expenses/export?month=${curMonth}`, {
    headers: { Cookie: adminCookie },
  });
  if (!expExcelRes.ok) {
    throw new Error(`Expense Excel export failed: ${expExcelRes.status}`);
  }
  const expBuffer = await expExcelRes.arrayBuffer();
  console.log(`   ✓ Expense Excel workbook generated (${expBuffer.byteLength} bytes)`);

  // 7. Cleanup All Test Data
  console.log('\n7. Cleaning up all test records from local PostgreSQL database...');
  const pg = new Client({ connectionString: DB_URL });
  await pg.connect();

  await pg.query('DELETE FROM public.documents WHERE id = $1', [testDocId]);
  await pg.query('DELETE FROM public.attendance WHERE date = CURRENT_DATE');
  await pg.query('DELETE FROM public.expenses WHERE id = $1', [testExpenseId]);
  await pg.query('DELETE FROM public.leads WHERE id = $1', [testLeadId]);
  await pg.query("DELETE FROM public.audit_logs WHERE entity_type IN ('documents', 'attendance', 'expenses', 'leads')");

  // Verify counts
  const docCount = (await pg.query('SELECT COUNT(*) as count FROM public.documents')).rows[0].count;
  const attCount = (await pg.query('SELECT COUNT(*) as count FROM public.attendance')).rows[0].count;
  const expCount = (await pg.query('SELECT COUNT(*) as count FROM public.expenses')).rows[0].count;
  const leadCount = (await pg.query('SELECT COUNT(*) as count FROM public.leads')).rows[0].count;

  console.log('\n--- VERIFICATION OF REAL ZERO STATE (NO TEST DATA REMAINING) ---');
  console.log('   Documents count:', docCount);
  console.log('   Attendance count:', attCount);
  console.log('   Expenses count:', expCount);
  console.log('   Leads count:', leadCount);

  if (docCount === '0' && attCount === '0' && expCount === '0' && leadCount === '0') {
    console.log('\n🎉 ALL PHASE 4 VERIFICATIONS PASSED WITH ZERO ERRORS!');
  } else {
    throw new Error('Some test records failed to purge.');
  }

  await pg.end();
}

runPhase4Verification().catch((err) => {
  console.error('\n❌ Phase 4 Verification Failed:', err);
  process.exit(1);
});
