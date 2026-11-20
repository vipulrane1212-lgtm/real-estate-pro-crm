const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@172.31.128.153:5432/diksha_crm',
});

const BASE_URL = 'http://localhost:3000';

async function login(email, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${email} with status ${res.status}`);
  }
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error(`No session cookie returned for ${email}`);
  }
  const match = setCookie.match(/(?:diksha_crm_session|diksha_session)=([^;]+)/);
  if (!match) {
    throw new Error(`Could not parse session cookie for ${email}`);
  }
  return `diksha_crm_session=${match[1]}`;
}

async function runE2ETests() {
  console.log('--- STARTING PHASE 5 E2E INTEGRATION TESTS ---');

  // 1. Authenticate Super Admin & Employee
  const adminCookie = await login('admin@diksharealestate.com', 'AdminPassword123!');
  console.log('✓ Super Admin authenticated successfully');

  const empCookie = await login('rohan@diksharealestate.com', 'AgentPassword123!');
  console.log('✓ Employee authenticated successfully');

  // 2. Test Free-Form Office Expense Creation
  console.log('\n--- Testing Free-Form Office Expense Creation ---');
  const expRes = await fetch(`${BASE_URL}/api/expenses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      headline: '[TEST] Chai Nashta & Kharcha Pani for Site Visit',
      notes: 'Morning tea and snacks at construction site',
      amount: 450,
      paid_to: 'Ramesh Chaiwala',
      expense_date: new Date().toISOString().split('T')[0],
    }),
  });

  const expJson = await expRes.json();
  if (!expRes.ok || !expJson.expense) {
    throw new Error(`Failed to create free-form expense: ${JSON.stringify(expJson)}`);
  }
  const testExpenseId = expJson.expense.id;
  console.log('✓ Free-form expense created with ID:', testExpenseId);
  console.log('  Headline stored:', expJson.expense.headline);
  console.log('  Amount stored: ₹', expJson.expense.amount);

  // 3. Test 30-Day Chart & Totals API
  console.log('\n--- Testing 30-Day Chart & Totals API ---');
  const getExpRes = await fetch(`${BASE_URL}/api/expenses`, {
    headers: { Cookie: adminCookie },
  });
  const getExpJson = await getExpRes.json();
  if (!getExpRes.ok) {
    throw new Error(`Failed to fetch expenses: ${JSON.stringify(getExpJson)}`);
  }
  console.log('✓ Expenses list returned', getExpJson.expenses.length, 'records');
  console.log('  Today total spend: ₹', getExpJson.totals.todayTotal);
  console.log('  30-day chart points returned:', getExpJson.last30Days.length);

  const todayPoint = getExpJson.last30Days[getExpJson.last30Days.length - 1];
  console.log('  Chart point for today:', todayPoint.date, 'Total: ₹', todayPoint.total);
  if (todayPoint.total < 450) {
    throw new Error(`Chart daily total expected at least 450, got ${todayPoint.total}`);
  }
  console.log('✓ 30-Day Chart data includes test expense accurately');

  // 4. Test Search & Date Filtering
  console.log('\n--- Testing Search & Filtering ---');
  const searchRes = await fetch(`${BASE_URL}/api/expenses?search=Chai`, {
    headers: { Cookie: adminCookie },
  });
  const searchJson = await searchRes.json();
  if (!searchRes.ok || searchJson.expenses.length === 0) {
    throw new Error(`Search for 'Chai' failed: ${JSON.stringify(searchJson)}`);
  }
  console.log('✓ Search by free-form headline matches:', searchJson.expenses[0].headline);

  // 5. Test Excel Export
  console.log('\n--- Testing Excel Export ---');
  const exportRes = await fetch(`${BASE_URL}/api/expenses/export`, {
    headers: { Cookie: adminCookie },
  });
  if (!exportRes.ok) {
    throw new Error(`Expenses export failed with status ${exportRes.status}`);
  }
  const exportBuf = await exportRes.arrayBuffer();
  console.log('✓ Excel export generated successfully (size:', exportBuf.byteLength, 'bytes)');

  // 6. Test Follow-up Loud Alarm & Snooze Cycle
  console.log('\n--- Testing Follow-up Overdue Reminder & Alarm ---');
  // Create a test lead
  const leadRes = await fetch(`${BASE_URL}/api/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      full_name: '[TEST] Vikram Oberoi',
      phone: '+919876543299',
      lead_type: 'buy',
      requirement: '3 BHK',
      location: 'Andheri West',
    }),
  });
  const leadJson = await leadRes.json();
  if (!leadRes.ok || !leadJson.lead) {
    throw new Error(`Failed to create test lead: ${JSON.stringify(leadJson)}`);
  }
  const testLeadId = leadJson.lead.id;
  console.log('✓ Test lead created:', leadJson.lead.full_name);

  // Create an overdue follow-up (scheduled 15 minutes ago)
  const pastTime = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const fuRes = await fetch(`${BASE_URL}/api/follow-ups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      leadId: testLeadId,
      scheduledAt: pastTime,
      followUpType: 'call',
      remarks: 'Urgent callback requested regarding site visit',
    }),
  });
  const fuJson = await fuRes.json();
  if (!fuRes.ok || !fuJson.followUp) {
    throw new Error(`Failed to create follow-up: ${JSON.stringify(fuJson)}`);
  }
  const testFollowUpId = fuJson.followUp.id;
  console.log('✓ Overdue follow-up created with ID:', testFollowUpId);

  // Check reminders endpoint
  const remRes = await fetch(`${BASE_URL}/api/follow-ups/reminders`, {
    headers: { Cookie: adminCookie },
  });
  const remJson = await remRes.json();
  if (!remRes.ok) {
    throw new Error(`Failed to fetch reminders: ${JSON.stringify(remJson)}`);
  }
  const foundReminder = remJson.reminders.find((r) => r.id === testFollowUpId);
  if (!foundReminder) {
    throw new Error(`Created overdue follow-up not found in /api/follow-ups/reminders!`);
  }
  console.log('✓ Overdue reminder detected!');
  console.log('  Client:', foundReminder.lead.full_name, 'Phone:', foundReminder.lead.phone);
  console.log('  Overdue minutes:', foundReminder.overdue_minutes);

  // Test Snooze endpoint
  console.log('\n--- Testing Alarm Snooze (5 minutes) ---');
  const snoozeRes = await fetch(`${BASE_URL}/api/follow-ups/${testFollowUpId}/snooze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ minutes: 5 }),
  });
  const snoozeJson = await snoozeRes.json();
  if (!snoozeRes.ok || !snoozeJson.success) {
    throw new Error(`Snooze failed: ${JSON.stringify(snoozeJson)}`);
  }
  console.log('✓ Snooze successful. Snoozed until:', snoozeJson.snoozed_until, 'Repeat count:', snoozeJson.repeat_count);

  // Verify it is no longer returned in active reminders while snoozed
  const remAfterSnooze = await (await fetch(`${BASE_URL}/api/follow-ups/reminders`, { headers: { Cookie: adminCookie } })).json();
  const snoozedFound = remAfterSnooze.reminders.some((r) => r.id === testFollowUpId);
  if (snoozedFound) {
    throw new Error(`Follow-up should NOT appear in reminders while actively snoozed!`);
  }
  console.log('✓ Snoozed reminder suppressed from ringing until snooze expires');

  // Test Acknowledge endpoint
  console.log('\n--- Testing Alarm Acknowledge ---');
  const ackRes = await fetch(`${BASE_URL}/api/follow-ups/${testFollowUpId}/acknowledge`, {
    method: 'POST',
    headers: { Cookie: adminCookie },
  });
  const ackJson = await ackRes.json();
  if (!ackRes.ok || !ackJson.success) {
    throw new Error(`Acknowledge failed: ${JSON.stringify(ackJson)}`);
  }
  console.log('✓ Alarm acknowledged at:', ackJson.acknowledged_at);

  // 7. Test Agreement Expiry Alert Endpoint
  console.log('\n--- Testing Agreement / Renewal Expiry Alerts ---');
  const expAlertRes = await fetch(`${BASE_URL}/api/alerts/expiries`, {
    headers: { Cookie: adminCookie },
  });
  const expAlertJson = await expAlertRes.json();
  if (!expAlertRes.ok) {
    throw new Error(`Expiry alerts failed: ${JSON.stringify(expAlertJson)}`);
  }
  console.log('✓ Expiry alerts API responsive. Total expiring items:', expAlertJson.count);
  console.log('  Voice alert triggerable items:', expAlertJson.voiceAlerts.length);

  // 8. Clean up all test data (zero-data guarantee)
  console.log('\n--- Cleaning up all test data ---');
  await pool.query('DELETE FROM public.expenses WHERE id = $1', [testExpenseId]);
  await pool.query('DELETE FROM public.follow_ups WHERE id = $1', [testFollowUpId]);
  await pool.query('DELETE FROM public.leads WHERE id = $1', [testLeadId]);

  const verifyDocs = (await pool.query('SELECT COUNT(*) FROM public.documents')).rows[0].count;
  const verifyExpenses = (await pool.query('SELECT COUNT(*) FROM public.expenses')).rows[0].count;
  const verifyFollowUps = (await pool.query('SELECT COUNT(*) FROM public.follow_ups')).rows[0].count;
  const verifyLeads = (await pool.query('SELECT COUNT(*) FROM public.leads')).rows[0].count;

  console.log('Database counts after test cleanup:');
  console.log({
    documents: verifyDocs,
    expenses: verifyExpenses,
    follow_ups: verifyFollowUps,
    leads: verifyLeads,
  });

  if (verifyExpenses !== '0' || verifyFollowUps !== '0' || verifyLeads !== '0') {
    throw new Error('Database not returned to 0 after test cleanup!');
  }

  console.log('\n✓ ALL PHASE 5 INTEGRATION TESTS PASSED WITH 0 ERRORS!');
  console.log('✓ DATABASE FULLY PURGED TO 0 TEST DATA.');
  await pool.end();
}

runE2ETests().catch((err) => {
  console.error('\n❌ E2E TEST FAILED:', err);
  process.exit(1);
});
