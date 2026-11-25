import { query } from '@/lib/db';
import { generate100DemoLeads } from '@/lib/leads/demo-dataset';

export interface DemoStatusReport {
  isDemoLoaded: boolean;
  counts: {
    leads: number;
    properties: number;
    rentals: number;
    deals: number;
    brokerage: number;
    siteVisits: number;
    calls: number;
    whatsapp: number;
    attendance: number;
    expenses: number;
    documents: number;
    projectSubmissions: number;
    followUps: number;
  };
}

export async function getCrmDemoStatus(): Promise<DemoStatusReport> {
  const [
    leadsCount,
    propertiesCount,
    rentalsCount,
    dealsCount,
    brokerageCount,
    siteVisitsCount,
    callsCount,
    whatsappCount,
    attendanceCount,
    expensesCount,
    documentsCount,
    projectSubmissionsCount,
    followUpsCount,
  ] = await Promise.all([
    query<{ count: string }>('SELECT COUNT(*)::text as count FROM public.leads WHERE is_demo = true'),
    query<{ count: string }>('SELECT COUNT(*)::text as count FROM public.properties WHERE is_demo = true'),
    query<{ count: string }>('SELECT COUNT(*)::text as count FROM public.rentals WHERE is_demo = true'),
    query<{ count: string }>('SELECT COUNT(*)::text as count FROM public.deals WHERE is_demo = true'),
    query<{ count: string }>('SELECT COUNT(*)::text as count FROM public.brokerage WHERE is_demo = true'),
    query<{ count: string }>('SELECT COUNT(*)::text as count FROM public.site_visits WHERE is_demo = true'),
    query<{ count: string }>('SELECT COUNT(*)::text as count FROM public.calls WHERE is_demo = true'),
    query<{ count: string }>('SELECT COUNT(*)::text as count FROM public.whatsapp_messages WHERE is_demo = true'),
    query<{ count: string }>('SELECT COUNT(*)::text as count FROM public.attendance WHERE is_demo = true'),
    query<{ count: string }>('SELECT COUNT(*)::text as count FROM public.expenses WHERE is_demo = true'),
    query<{ count: string }>('SELECT COUNT(*)::text as count FROM public.documents WHERE is_demo = true'),
    query<{ count: string }>('SELECT COUNT(*)::text as count FROM public.project_submissions WHERE is_demo = true'),
    query<{ count: string }>('SELECT COUNT(*)::text as count FROM public.follow_ups WHERE is_demo = true'),
  ]);

  const counts = {
    leads: parseInt(leadsCount[0]?.count || '0', 10),
    properties: parseInt(propertiesCount[0]?.count || '0', 10),
    rentals: parseInt(rentalsCount[0]?.count || '0', 10),
    deals: parseInt(dealsCount[0]?.count || '0', 10),
    brokerage: parseInt(brokerageCount[0]?.count || '0', 10),
    siteVisits: parseInt(siteVisitsCount[0]?.count || '0', 10),
    calls: parseInt(callsCount[0]?.count || '0', 10),
    whatsapp: parseInt(whatsappCount[0]?.count || '0', 10),
    attendance: parseInt(attendanceCount[0]?.count || '0', 10),
    expenses: parseInt(expensesCount[0]?.count || '0', 10),
    documents: parseInt(documentsCount[0]?.count || '0', 10),
    projectSubmissions: parseInt(projectSubmissionsCount[0]?.count || '0', 10),
    followUps: parseInt(followUpsCount[0]?.count || '0', 10),
  };

  const isDemoLoaded = counts.leads > 0 && counts.attendance > 0 && counts.calls > 0;

  return { isDemoLoaded, counts };
}

export async function resetAllCrmDemoData(): Promise<{ success: boolean; deletedCounts: Record<string, number> }> {
  const deletedCounts: Record<string, number> = {};

  const tables = [
    'rent_payments',
    'brokerage',
    'deals',
    'rentals',
    'site_visits',
    'calls',
    'whatsapp_messages',
    'attendance',
    'expenses',
    'documents',
    'project_submissions',
    'follow_ups',
    'lead_history',
    'leads',
    'properties',
  ];

  for (const t of tables) {
    try {
      const res = await query<{ id: string }>(`DELETE FROM public.${t} WHERE is_demo = true RETURNING id`);
      deletedCounts[t] = res.length;
    } catch (err) {
      console.warn(`Error resetting demo for ${t}:`, err);
      deletedCounts[t] = 0;
    }
  }

  return { success: true, deletedCounts };
}

export async function seedAllCrmDemoData(): Promise<{ success: boolean; seededCounts: Record<string, number> }> {
  // 1. Fetch available employees
  const employees = await query<{ id: string; user_id: string; role: string; full_name: string }>(`
    SELECT e.id, e.user_id, p.role, p.full_name
    FROM public.employees e
    JOIN public.profiles p ON e.user_id = p.id
    ORDER BY p.full_name ASC
  `);

  const rohanEmp = employees.find((e) => e.full_name.includes('Rohan')) || employees[0];
  const adminEmp = employees.find((e) => e.role === 'super_admin') || employees[0];
  const primaryEmpId = rohanEmp?.id || adminEmp?.id;
  const adminUserId = adminEmp?.user_id || '00000000-0000-0000-0000-000000000001';

  // 2. Ensure Properties exist and are marked is_demo = true
  await query(`UPDATE public.properties SET is_demo = true`);
  const properties = await query<{ id: string; title: string; price: number; property_type: string }>(
    `SELECT id, title, price, property_type FROM public.properties WHERE is_demo = true ORDER BY title ASC`
  );

  // If properties empty, seed 12 Lucknow properties
  if (properties.length === 0) {
    const initialProps = [
      { code: 'PROP-LK-001', title: 'Omaxe Waterscapes 3 BHK Luxury Flat', type: 'resale', listing: 'sell', price: 9500000, size: 1750, bhk: '3 BHK', loc: 'Gomti Nagar Extension', addr: 'Sector 7, Gomti Nagar Extension, Lucknow' },
      { code: 'PROP-LK-002', title: 'Rishita Manhattan 2 BHK Smart Apartment', type: 'new_project', listing: 'sell', price: 6200000, size: 1250, bhk: '2 BHK', loc: 'Amar Shaheed Path', addr: 'Shaheed Path, Lucknow' },
      { code: 'PROP-LK-003', title: 'Eldeco Greens 4 BHK Ultra-Luxury Penthouse', type: 'resale', listing: 'sell', price: 24000000, size: 3400, bhk: '4 BHK', loc: 'Gomti Nagar', addr: 'Eldeco Greens, Gomti Nagar, Lucknow' },
      { code: 'PROP-LK-004', title: 'Ansal Sushant Golf City Independent Villa', type: 'resale', listing: 'sell', price: 18500000, size: 2800, bhk: '4 BHK', loc: 'Sushant Golf City', addr: 'Sector B, Sushant Golf City, Lucknow' },
      { code: 'PROP-LK-005', title: 'Shalimar Titanium Prime Commercial Office', type: 'commercial', listing: 'sell', price: 17500000, size: 2100, bhk: 'Commercial', loc: 'Vibhuti Khand', addr: 'Vibhuti Khand, Gomti Nagar, Lucknow' },
      { code: 'PROP-LK-006', title: 'Cyber Heights Furnished IT Office Suite', type: 'rental', listing: 'rent', price: 85000, size: 1600, bhk: 'Commercial', loc: 'Vibhuti Khand', addr: 'Cyber Heights, Gomti Nagar, Lucknow' },
      { code: 'PROP-LK-007', title: 'Sushant Golf City East-Facing Residential Plot', type: 'plot_land', listing: 'sell', price: 7200000, size: 2150, bhk: 'Plot', loc: 'Sushant Golf City', addr: 'Pocket 3, Sushant Golf City, Lucknow' },
      { code: 'PROP-LK-008', title: 'Rohtas Presidential 3 BHK Garden Flat', type: 'resale', listing: 'sell', price: 8800000, size: 1650, bhk: '3 BHK', loc: 'Vibhuti Khand', addr: 'Rohtas Presidential Towers, Lucknow' },
      { code: 'PROP-LK-009', title: 'Paarth Republic 2 BHK Affordable Flat', type: 'new_project', listing: 'sell', price: 4500000, size: 1050, bhk: '2 BHK', loc: 'Kanpur Road', addr: 'Sarojini Nagar, Kanpur Road, Lucknow' },
      { code: 'PROP-LK-010', title: 'Hazratganj Prime Retail Showroom', type: 'commercial', listing: 'sell', price: 32000000, size: 1800, bhk: 'Retail', loc: 'Hazratganj', addr: 'M.G. Marg, Hazratganj, Lucknow' },
      { code: 'PROP-LK-011', title: 'Gomti Nagar Sector 4 Independent Duplex', type: 'resale', listing: 'sell', price: 16500000, size: 2400, bhk: '3 BHK', loc: 'Gomti Nagar', addr: 'Vipul Khand 4, Gomti Nagar, Lucknow' },
      { code: 'PROP-LK-012', title: 'MI Rustle Court 3 BHK Lake-Facing Flat', type: 'rental', listing: 'rent', price: 38000, size: 1550, bhk: '3 BHK', loc: 'Amar Shaheed Path', addr: 'MI Rustle Court, Shaheed Path, Lucknow' },
    ];

    for (const p of initialProps) {
      await query(`
        INSERT INTO public.properties (
          property_code, title, description, property_type, listing_type, price, size_sqft, 
          bedrooms, bathrooms, address, city, state, pincode, status, assigned_agent_id, 
          photos, amenities, is_demo, bhk, location
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, 3, 2, $8, 'Lucknow', 'Uttar Pradesh', '226010', 'available', $9,
          '[]'::jsonb, '["Power Backup", "Security", "Clubhouse", "Car Parking"]'::jsonb, true, $10, $11
        )
      `, [p.code, p.title, `${p.title} situated in prime location of ${p.loc}, Lucknow.`, p.type, p.listing, p.price, p.size, p.addr, primaryEmpId, p.bhk, p.loc]);
    }
  }

  // 3. Ensure 100 Demo Leads exist
  const existingLeads = await query<{ id: string; full_name: string; phone: string; status: string }>(
    `SELECT id, full_name, phone, status FROM public.leads WHERE is_demo = true ORDER BY created_at DESC LIMIT 100`
  );

  let leadList = existingLeads;
  if (leadList.length < 50) {
    const generated = generate100DemoLeads();
    for (const item of generated) {
      await query(`
        INSERT INTO public.leads (
          full_name, email, phone, source, source_detail, is_demo, 
          lead_type, status, budget_min, budget_max, property_type, 
          location, preferred_location, requirement, remarks, assigned_to, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, true, $6, $7, $8, $9, $10, $11, $11, $12, $13, $14, $15
        )
      `, [
        item.fullName,
        item.email,
        item.phone,
        item.source,
        item.sourceDetail,
        item.leadType,
        item.status,
        item.budgetMin,
        item.budgetMax,
        item.propertyType,
        item.location,
        item.requirement,
        item.remarks,
        primaryEmpId,
        adminUserId,
      ]);
    }
    leadList = await query<{ id: string; full_name: string; phone: string; status: string }>(
      `SELECT id, full_name, phone, status FROM public.leads WHERE is_demo = true ORDER BY created_at DESC LIMIT 100`
    );
  }

  const propRows = await query<{ id: string; title: string; price: number }>(
    `SELECT id, title, price FROM public.properties WHERE is_demo = true LIMIT 12`
  );

  // 4. Seed Attendance (Today and past 6 days for employees)
  await query(`DELETE FROM public.attendance WHERE is_demo = true`);
  const attendanceDates = [0, 1, 2, 3, 4, 5, 6].map((offset) => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    return d.toISOString().split('T')[0];
  });

  let attCount = 0;
  for (const emp of employees) {
    for (let i = 0; i < attendanceDates.length; i++) {
      const dateStr = attendanceDates[i];
      const isToday = i === 0;
      const status = isToday && emp.full_name.includes('Rohan') ? 'checked_in' : 'present';
      const checkInTime = new Date(`${dateStr}T09:15:00+05:30`);
      const checkOutTime = isToday ? null : new Date(`${dateStr}T18:30:00+05:30`);

      await query(`
        INSERT INTO public.attendance (
          employee_id, date, check_in, check_out, status, notes, 
          check_in_selfie_url, check_in_latitude, check_in_longitude, check_in_address, 
          is_late, is_demo, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, true, NOW()
        )
      `, [
        emp.id,
        dateStr,
        checkInTime.toISOString(),
        checkOutTime ? checkOutTime.toISOString() : null,
        status,
        isToday ? 'Live GPS verified check-in via mobile portal' : 'Regular workday attendance verified',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces',
        26.8500,
        80.9499,
        'Gomti Nagar Regional Office, Lucknow, Uttar Pradesh',
      ]);
      attCount++;
    }
  }

  // 5. Seed Calls (15 realistic Lucknow call logs)
  await query(`DELETE FROM public.calls WHERE is_demo = true`);
  const callOutcomes = [
    { out: 'Follow-up Scheduled', dur: 195, notes: 'Client enquired about 3 BHK flat near Ekana Stadium. Scheduled visit for Saturday.' },
    { out: 'Site Visit Confirmed', dur: 260, notes: 'Confirmed site inspection for Sushant Golf City plot at 11:30 AM.' },
    { out: 'Token Advance Agreed', dur: 420, notes: 'Client agreed to ₹2.35 Cr deal. Token advance cheque scheduled for tomorrow.' },
    { out: 'Brochure Sent', dur: 140, notes: 'Shared master plan layout and payment plan PDF on WhatsApp.' },
    { out: 'Negotiation', dur: 380, notes: 'Discussed builder discount of 3% for immediate 10-day down payment.' },
    { out: 'Callback Requested', dur: 85, notes: 'Client was in office meeting, requested call at 6:30 PM.' },
  ];

  let callCount = 0;
  for (let i = 0; i < Math.min(15, leadList.length); i++) {
    const lead = leadList[i];
    const outcomeObj = callOutcomes[i % callOutcomes.length];
    const callTime = new Date();
    callTime.setHours(10 + (i % 8), 15 + (i * 3) % 45, 0);

    await query(`
      INSERT INTO public.calls (
        lead_id, employee_id, call_type, duration_seconds, recording_url, 
        notes, call_time, outcome, client_phone, is_demo, created_at
      ) VALUES (
        $1, $2, 'outbound', $3, $4, $5, $6, $7, $8, true, NOW()
      )
    `, [
      lead.id,
      primaryEmpId,
      outcomeObj.dur,
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      outcomeObj.notes,
      callTime.toISOString(),
      outcomeObj.out,
      lead.phone,
    ]);
    callCount++;
  }

  // 6. Seed Site Visits (8 realistic property visits)
  await query(`DELETE FROM public.site_visits WHERE is_demo = true`);
  let visitCount = 0;
  const visitStatuses = ['Completed', 'Confirmed', 'Completed', 'In Progress', 'Scheduled', 'Confirmed', 'Scheduled', 'Completed'];

  for (let i = 0; i < Math.min(8, leadList.length); i++) {
    const lead = leadList[i];
    const prop = propRows[i % propRows.length];
    const status = visitStatuses[i % visitStatuses.length];
    const vDate = new Date();
    vDate.setHours(11 + (i % 6), (i * 20) % 60, 0);

    await query(`
      INSERT INTO public.site_visits (
        lead_id, property_id, assigned_to, visit_date, status, feedback, 
        client_interest_level, outcome_note, completed_at, is_demo, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW(), NOW()
      )
    `, [
      lead.id,
      prop.id,
      primaryEmpId,
      vDate.toISOString(),
      status.toLowerCase().replace(' ', '_'),
      status === 'Completed' ? 'Client loved the road frontage and orientation. Ready for negotiation.' : 'Client confirmed arrival via car with family.',
      'high',
      `Inspection for ${prop.title} with client ${lead.full_name}.`,
      status === 'Completed' ? vDate.toISOString() : null,
    ]);
    visitCount++;
  }

  // 7. Seed Deals & Brokerage (4 closed/active high value transactions)
  await query(`DELETE FROM public.brokerage WHERE is_demo = true`);
  await query(`DELETE FROM public.deals WHERE is_demo = true`);

  const demoDeals = [
    { title: 'Eldeco Greens 4 BHK Ultra-Luxury Penthouse', val: 24000000, comm: 480000, perc: 2.0, status: 'closed_won' },
    { title: 'Shalimar Titanium Prime Commercial Office', val: 17500000, comm: 350000, perc: 2.0, status: 'closed_won' },
    { title: 'Sushant Golf City East-Facing Residential Plot', val: 7200000, comm: 144000, perc: 2.0, status: 'in_progress' },
    { title: 'Rishita Manhattan 2 BHK Smart Apartment', val: 6200000, comm: 124000, perc: 2.0, status: 'closed_won' },
  ];

  let dealCount = 0;
  for (let i = 0; i < demoDeals.length; i++) {
    const dd = demoDeals[i];
    const lead = leadList[i] || leadList[0];
    const prop = propRows[i] || propRows[0];
    const dealDate = new Date();
    dealDate.setDate(dealDate.getDate() - (i * 5));

    const dealRes = await query<{ id: string }>(`
      INSERT INTO public.deals (
        lead_id, property_id, employee_id, deal_value, commission_amount, 
        deal_date, status, notes, brokerage_percentage, deal_number, closed_date, is_demo, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, NOW(), NOW()
      ) RETURNING id
    `, [
      lead.id,
      prop.id,
      primaryEmpId,
      dd.val,
      dd.comm,
      dealDate.toISOString().split('T')[0],
      dd.status,
      `Transaction finalized for ${dd.title}. Client satisfied with registry documentation.`,
      dd.perc,
      1000 + i,
      dd.status === 'closed_won' ? dealDate.toISOString().split('T')[0] : null,
    ]);

    const dealId = dealRes[0].id;
    await query(`
      INSERT INTO public.brokerage (
        deal_id, agent_id, total_brokerage, paid_brokerage, 
        payment_status, payment_date, brokerage_percentage, notes, is_demo, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW()
      )
    `, [
      dealId,
      primaryEmpId,
      dd.comm,
      dd.status === 'closed_won' ? dd.comm : 0,
      dd.status === 'closed_won' ? 'paid' : 'pending',
      dd.status === 'closed_won' ? dealDate.toISOString().split('T')[0] : null,
      dd.perc,
      `Commission ledger entry for Deal #${1000 + i}`,
    ]);
    dealCount++;
  }

  // 8. Seed Rentals & Rent Payments (4 active leases)
  await query(`DELETE FROM public.rent_payments WHERE is_demo = true`);
  await query(`DELETE FROM public.rentals WHERE is_demo = true`);

  const demoRentals = [
    { num: 501, propIdx: 5, tenant: 'M/s TechPulse Solutions Pvt Ltd', phone: '+91 98390 55101', email: 'admin@techpulse.in', owner: 'Rameshwar Dayal', rent: 85000, dep: 255000, start: '2026-01-01', end: '2026-12-31' },
    { num: 502, propIdx: 11, tenant: 'Vikramaditya Saxena', phone: '+91 98390 55102', email: 'vikram.saxena@gmail.com', owner: 'Smt. Kamla Devi', rent: 38000, dep: 76000, start: '2026-02-01', end: '2027-01-31' },
    { num: 503, propIdx: 7, tenant: 'Dr. Neeraj Mehrotra', phone: '+91 98390 55103', email: 'dr.neeraj@apollo.com', owner: 'Pradeep Goel', rent: 32000, dep: 64000, start: '2025-11-01', end: '2026-10-31' },
    { num: 504, propIdx: 4, tenant: 'Zenith Finserve Advisory', phone: '+91 98390 55104', email: 'contact@zenithfin.com', owner: 'Alok Singhal', rent: 120000, dep: 360000, start: '2026-03-01', end: '2027-02-28' },
  ];

  let rentalCount = 0;
  for (const dr of demoRentals) {
    const prop = propRows[dr.propIdx % propRows.length];
    const rentalRes = await query<{ id: string }>(`
      INSERT INTO public.rentals (
        rental_number, property_id, tenant_name, tenant_phone, tenant_email, 
        owner_name, owner_phone, agent_id, monthly_rent, deposit_amount, 
        rent_due_day, agreement_start_date, agreement_end_date, status, 
        brokerage_percentage, brokerage_amount, notes, is_demo, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, '+91 98390 99000', $7, $8, $9, 5, $10, $11, 'active', 
        100, $8, 'Registered 11-month lease agreement. Notarized copy filed.', true, NOW(), NOW()
      ) RETURNING id
    `, [
      dr.num,
      prop.id,
      dr.tenant,
      dr.phone,
      dr.email,
      dr.owner,
      primaryEmpId,
      dr.rent,
      dr.dep,
      dr.start,
      dr.end,
    ]);

    const rentalId = rentalRes[0].id;
    await query(`
      INSERT INTO public.rent_payments (
        rental_id, month_year, due_date, amount, status, paid_date, payment_mode, 
        transaction_reference, notes, collected_by, is_demo, created_at, updated_at
      ) VALUES (
        $1, 'November 2026', '2026-11-05', $2, 'paid', '2026-11-04', 'neft', 
        'UTR-HDFC-991823901', 'Monthly rent received on time via bank transfer', $3, true, NOW(), NOW()
      )
    `, [rentalId, dr.rent, adminUserId]);
    rentalCount++;
  }

  // 9. Seed Office Expenses (10 Lucknow office operations expenses totaling ₹2.39L)
  await query(`DELETE FROM public.expenses WHERE is_demo = true`);
  const demoExpenses = [
    { title: 'Gomti Nagar Regional Office Monthly Lease', cat: 'Office Rent', amt: 120000, to: 'Shalimar Builders Ltd' },
    { title: 'MVVNL Electricity Commercial Bill (October-November)', cat: 'Utilities', amt: 18450, to: 'Madhyanchal Vidyut Vitran Nigam' },
    { title: 'Meta Ads & Housing.com Lead Generation Campaign', cat: 'Marketing', amt: 45000, to: 'Meta Platforms & Housing Tech' },
    { title: 'Field Staff Petrol & Cab Conveyance Allowance', cat: 'Travel', amt: 12800, to: 'Staff Expense Claims' },
    { title: 'Client Conference Refreshments, Tea & Coffee Pantry', cat: 'Pantry', amt: 6500, to: 'Gourmet Pantry Supplies' },
    { title: 'Commercial Fiber Leased Line Internet (300 Mbps)', cat: 'Utilities', amt: 3200, to: 'Airtel Broadband Ltd' },
    { title: 'Stamp Papers, Legal Agreements & Document Printing', cat: 'Legal & Printing', amt: 4800, to: 'Lucknow Registry Court Typists' },
    { title: 'Professional Villa Photography & Drone Videography', cat: 'Marketing', amt: 15000, to: 'ShutterMedia Productions' },
    { title: 'Office Housekeeping & Cleaning Staff Monthly Contract', cat: 'Maintenance', amt: 8000, to: 'CleanPro Services' },
    { title: 'Conference Room AC Servicing & Duct Cleaning', cat: 'Maintenance', amt: 5500, to: 'Voltas Authorised Service' },
  ];

  let expCount = 0;
  for (let i = 0; i < demoExpenses.length; i++) {
    const de = demoExpenses[i];
    const expDate = new Date();
    expDate.setDate(expDate.getDate() - (i * 2));

    await query(`
      INSERT INTO public.expenses (
        title, headline, category, amount, expense_date, paid_to, 
        approved_by, employee_id, notes, is_demo, created_at, updated_at
      ) VALUES (
        $1, $1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW()
      )
    `, [
      de.title,
      de.cat,
      de.amt,
      expDate.toISOString().split('T')[0],
      de.to,
      adminUserId,
      primaryEmpId,
      `Voucher verified and approved by Director. Paid via corporate account.`,
    ]);
    expCount++;
  }

  // 10. Seed Documents & Client KYC (6 verified documents)
  await query(`DELETE FROM public.documents WHERE is_demo = true`);
  const demoDocs = [
    { title: 'Ashok Maurya - Aadhaar & PAN Card KYC', type: 'application/pdf', size: 1420000, docType: 'kyc' },
    { title: 'Sunita Jain - HDFC Bank Loan Pre-Approval Letter', type: 'application/pdf', size: 2100000, docType: 'financial' },
    { title: 'Eldeco Greens Villa #74 - LDA Approved Layout Plan', type: 'image/jpeg', size: 4500000, docType: 'property_plan' },
    { title: 'Cyber Heights Unit #402 - Notarized Commercial Lease', type: 'application/pdf', size: 3100000, docType: 'agreement' },
    { title: 'Sushant Golf City Plot #B-14 - Registered Sale Deed', type: 'application/pdf', size: 5200000, docType: 'title_deed' },
    { title: 'Rishita Manhattan 2 BHK - Possession Allotment Letter', type: 'application/pdf', size: 1800000, docType: 'possession' },
  ];

  let docCount = 0;
  for (let i = 0; i < demoDocs.length; i++) {
    const dd = demoDocs[i];
    const lead = leadList[i] || leadList[0];
    const prop = propRows[i] || propRows[0];

    await query(`
      INSERT INTO public.documents (
        title, file_url, file_type, file_size, bucket_name, lead_id, property_id, 
        uploaded_by, document_type, is_demo, created_at, updated_at
      ) VALUES (
        $1, 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 
        $2, $3, 'crm_documents', $4, $5, $6, $7, true, NOW(), NOW()
      )
    `, [
      dd.title,
      dd.type,
      dd.size,
      lead.id,
      prop.id,
      adminUserId,
      dd.docType,
    ]);
    docCount++;
  }

  // 11. Seed Client Projects (4 developer submissions)
  await query(`DELETE FROM public.project_submissions WHERE is_demo = true`);
  const demoProjects = [
    { name: 'Avadh Greens Smart Township', type: 'Township Plots', loc: 'Kisan Path, Lucknow', min: 4500000, max: 12000000, client: 'Avadh Infratech Developers', phone: '+91 98390 66101', status: 'under_review' },
    { name: 'Gomti Commercial Galleria', type: 'Commercial Complex', loc: 'Gomti Nagar Extension', min: 8000000, max: 25000000, client: 'Galleria Retail Corp', phone: '+91 98390 66102', status: 'approved' },
    { name: 'Eldeco Riverside Enclave', type: 'Luxury Apartments', loc: 'Amar Shaheed Path', min: 6000000, max: 11000000, client: 'Riverfront Realty LLP', phone: '+91 98390 66103', status: 'site_visit_scheduled' },
    { name: 'Royal Palm Residency Plots', type: 'Residential Gated Community', loc: 'Sultanpur Road, Lucknow', min: 3500000, max: 7000000, client: 'Royal Heritage Builders', phone: '+91 98390 66104', status: 'under_review' },
  ];

  let projCount = 0;
  for (const dp of demoProjects) {
    await query(`
      INSERT INTO public.project_submissions (
        project_name, project_type, location, price_range, price_min, price_max, 
        description, photos, client_name, client_phone, client_email, status, 
        admin_notes, reviewed_by, reviewed_at, is_demo, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, '{}', $8, $9, $10, $11, $12, $13, NOW(), true, NOW(), NOW()
      )
    `, [
      dp.name,
      dp.type,
      dp.loc,
      `₹${(dp.min / 100000).toFixed(0)}L - ₹${(dp.max / 10000000).toFixed(2)}Cr`,
      dp.min,
      dp.max,
      `Prime real estate project proposal in ${dp.loc}. Complete LDA clearances submitted.`,
      dp.client,
      dp.phone,
      'contact@avadhinfratech.in',
      dp.status,
      'Documents verified by legal desk. Ready for site evaluation.',
      adminUserId,
    ]);
    projCount++;
  }

  // 12. Seed WhatsApp Conversations (8 messages)
  await query(`DELETE FROM public.whatsapp_messages WHERE is_demo = true`);
  const demoWA = [
    { text: 'Namaste Ashok ji! Sharing the verified registry papers and site layout map for Sushant Golf City plot as requested.', status: 'read' },
    { text: 'Hello Sunita ma’am, your site visit for Shalimar Grand 3 BHK has been confirmed for 3:00 PM today. Our executive Deepak will receive you at Tower B lobby.', status: 'delivered' },
    { text: 'Dear Aarav ji, thank you for visiting our office today. We have held Plot #14 under token hold for 48 hours.', status: 'read' },
    { text: 'Greetings! Avadh Greens price quotation sheet and bank approval letter attached for your review.', status: 'sent' },
  ];

  let waCount = 0;
  for (let i = 0; i < Math.min(8, leadList.length); i++) {
    const lead = leadList[i];
    const wa = demoWA[i % demoWA.length];

    await query(`
      INSERT INTO public.whatsapp_messages (
        lead_id, employee_id, recipient_phone, template_name, message_text, 
        status, is_demo, created_at
      ) VALUES (
        $1, $2, $3, 'site_visit_reminder', $4, $5, true, NOW()
      )
    `, [
      lead.id,
      primaryEmpId,
      lead.phone,
      wa.text,
      wa.status,
    ]);
    waCount++;
  }

  // 13. Seed Follow-ups (12 scheduled follow-ups, including 2 overdue to test alarms!)
  await query(`DELETE FROM public.follow_ups WHERE is_demo = true`);
  let followUpCount = 0;
  for (let i = 0; i < Math.min(12, leadList.length); i++) {
    const lead = leadList[i];
    const isOverdue = i < 2; // First 2 are overdue for alarm test
    const isToday = i >= 2 && i < 6;

    const sched = new Date();
    if (isOverdue) {
      sched.setHours(sched.getHours() - 3); // 3 hours ago
    } else if (isToday) {
      sched.setHours(sched.getHours() + 2); // 2 hours from now
    } else {
      sched.setDate(sched.getDate() + (i - 5));
    }

    await query(`
      INSERT INTO public.follow_ups (
        lead_id, assigned_to, scheduled_at, status, remarks, follow_up_type, 
        is_demo, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, 'call', true, NOW(), NOW()
      )
    `, [
      lead.id,
      primaryEmpId,
      sched.toISOString(),
      'pending',
      isOverdue ? '⚠️ URGENT: Client requested bank quotation callback. Overdue alarm active.' : 'Follow-up on property site visit feedback and floor plan preference.',
    ]);
    followUpCount++;
  }

  return {
    success: true,
    seededCounts: {
      leads: leadList.length,
      properties: propRows.length,
      attendance: attCount,
      calls: callCount,
      siteVisits: visitCount,
      deals: dealCount,
      brokerage: dealCount,
      rentals: rentalCount,
      expenses: expCount,
      documents: docCount,
      projectSubmissions: projCount,
      whatsapp: waCount,
      followUps: followUpCount,
    },
  };
}
