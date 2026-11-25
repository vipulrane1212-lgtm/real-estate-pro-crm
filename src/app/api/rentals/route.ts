import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import { RentalRecord } from '@/lib/supabase/types';
import { shouldIncludeDemo, getDemoCondition } from '@/lib/db/demo-filter';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const propertyId = searchParams.get('property_id');
    const search = searchParams.get('search');

    const conditions: string[] = [];
    const params: unknown[] = [];

    const includeDemo = shouldIncludeDemo(request);
    const demoCond = getDemoCondition('r', includeDemo);
    if (demoCond) {
      conditions.push(demoCond);
    }

    // Role-based visibility
    if (!auth.isAdmin) {
      if (!auth.employeeId) {
        return NextResponse.json({ rentals: [] });
      }
      params.push(auth.employeeId);
      conditions.push(`r.agent_id = $${params.length}`);
    }

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`r.status = $${params.length}`);
    }

    if (propertyId) {
      params.push(propertyId);
      conditions.push(`r.property_id = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      const sIdx = params.length;
      conditions.push(
        `(r.tenant_name ILIKE $${sIdx} OR r.tenant_phone ILIKE $${sIdx} OR COALESCE(r.owner_name, '') ILIKE $${sIdx} OR p.title ILIKE $${sIdx})`
      );
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        r.id,
        r.rental_number,
        r.property_id,
        r.tenant_name,
        r.tenant_phone,
        r.tenant_email,
        r.tenant_id,
        r.tenant_id_number,
        r.owner_name,
        r.owner_phone,
        r.agent_id,
        r.monthly_rent,
        r.deposit_amount,
        r.rent_due_day,
        TO_CHAR(r.agreement_start_date, 'YYYY-MM-DD') as agreement_start_date,
        TO_CHAR(r.agreement_end_date, 'YYYY-MM-DD') as agreement_end_date,
        r.status,
        r.brokerage_percentage,
        r.brokerage_amount,
        r.booking_amount,
        TO_CHAR(r.booking_date, 'YYYY-MM-DD') as booking_date,
        r.notes,
        r.created_at,
        r.updated_at,
        json_build_object(
          'id', p.id,
          'title', p.title,
          'location', p.location,
          'price', p.price,
          'address', p.address
        ) as property,
        json_build_object(
          'id', e.id,
          'designation', e.designation,
          'profile', json_build_object('full_name', prof.full_name)
        ) as agent,
        COALESCE(
          json_agg(
            json_build_object(
              'id', rp.id,
              'rental_id', rp.rental_id,
              'month_year', rp.month_year,
              'due_date', TO_CHAR(rp.due_date, 'YYYY-MM-DD'),
              'amount', rp.amount,
              'status', rp.status,
              'paid_date', TO_CHAR(rp.paid_date, 'YYYY-MM-DD'),
              'payment_mode', rp.payment_mode,
              'transaction_reference', rp.transaction_reference,
              'notes', rp.notes
            )
          ) FILTER (WHERE rp.id IS NOT NULL),
          '[]'
        ) as payments
      FROM public.rentals r
      JOIN public.properties p ON r.property_id = p.id
      LEFT JOIN public.employees e ON r.agent_id = e.id
      LEFT JOIN public.profiles prof ON e.user_id = prof.id
      LEFT JOIN public.rent_payments rp ON rp.rental_id = r.id
      ${whereClause}
      GROUP BY r.id, p.id, e.id, prof.full_name
      ORDER BY r.agreement_start_date DESC, r.created_at DESC
    `;

    const rows = await query<RentalRecord>(sql, params);

    return NextResponse.json({
      rentals: rows.map((r) => ({
        ...r,
        monthly_rent: Number(r.monthly_rent),
        deposit_amount: Number(r.deposit_amount || 0),
        brokerage_amount: Number(r.brokerage_amount || 0),
        booking_amount: Number(r.booking_amount || 0),
      })),
      count: rows.length,
    });
  } catch (err: unknown) {
    console.error('Error fetching rentals:', err);
    return NextResponse.json({ error: 'Failed to fetch rentals' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      property_id,
      tenant_name,
      tenant_phone,
      tenant_email,
      tenant_id,
      tenant_id_number,
      owner_name,
      owner_phone,
      agent_id,
      monthly_rent,
      deposit_amount = 0,
      rent_due_day = 5,
      agreement_start_date,
      agreement_end_date,
      brokerage_percentage = 2.0,
      booking_amount = 0,
      booking_date,
      notes,
    } = body;

    if (!property_id) {
      return NextResponse.json({ error: 'Property is required for rental' }, { status: 400 });
    }
    if (!tenant_name || !tenant_name.trim()) {
      return NextResponse.json({ error: 'Tenant name is required' }, { status: 400 });
    }
    if (!tenant_phone || !tenant_phone.trim()) {
      return NextResponse.json({ error: 'Tenant phone is required' }, { status: 400 });
    }
    const rentNum = Number(monthly_rent);
    if (!monthly_rent || isNaN(rentNum) || rentNum <= 0) {
      return NextResponse.json({ error: 'Valid monthly rent is required' }, { status: 400 });
    }
    if (!agreement_start_date || !agreement_end_date) {
      return NextResponse.json({ error: 'Agreement start and end dates are required' }, { status: 400 });
    }

    // Determine agent
    let targetAgentId = agent_id;
    if (!targetAgentId && !auth.isAdmin) {
      targetAgentId = auth.employeeId;
    }
    if (!targetAgentId) {
      const fallbackEmp = await query<{ id: string }>(
        'SELECT id FROM public.employees WHERE is_active = true ORDER BY created_at ASC LIMIT 1'
      );
      targetAgentId = fallbackEmp[0]?.id || null;
    }

    const pct = Number(brokerage_percentage) || 2.0;
    const brokerageAmount = Math.round((rentNum * pct) / 100);

    const isUuid = (val: unknown) =>
      typeof val === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    const targetTenantLeadId = isUuid(tenant_id) ? tenant_id : null;
    const targetTenantIdNumber =
      tenant_id_number || (!isUuid(tenant_id) && tenant_id ? String(tenant_id).trim() : null);

    const insertSql = `
      INSERT INTO public.rentals (
        property_id,
        tenant_name,
        tenant_phone,
        tenant_email,
        tenant_id,
        tenant_id_number,
        owner_name,
        owner_phone,
        agent_id,
        monthly_rent,
        deposit_amount,
        rent_due_day,
        agreement_start_date,
        agreement_end_date,
        status,
        brokerage_percentage,
        brokerage_amount,
        booking_amount,
        booking_date,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'active', $15, $16, $17, $18, $19)
      RETURNING *
    `;

    const inserted = await query<RentalRecord>(insertSql, [
      property_id,
      tenant_name.trim(),
      tenant_phone.trim(),
      tenant_email ? tenant_email.trim() : null,
      targetTenantLeadId,
      targetTenantIdNumber,
      owner_name ? owner_name.trim() : null,
      owner_phone ? owner_phone.trim() : null,
      targetAgentId,
      rentNum,
      Number(deposit_amount) || 0,
      Number(rent_due_day) || 5,
      agreement_start_date,
      agreement_end_date,
      pct,
      brokerageAmount,
      Number(booking_amount) || 0,
      booking_date || agreement_start_date,
      notes ? notes.trim() : null,
    ]);

    const rental = inserted[0];

    // 1. Create Brokerage Record in public.brokerage
    if (targetAgentId) {
      await query(
        `INSERT INTO public.brokerage (
          rental_id,
          agent_id,
          total_brokerage,
          paid_brokerage,
          brokerage_percentage,
          payment_status,
          notes
        ) VALUES ($1, $2, $3, 0, $4, 'unpaid', $5)`,
        [
          rental.id,
          targetAgentId,
          brokerageAmount,
          pct,
          `Brokerage for Rental Agreement #${rental.rental_number} (${tenant_name.trim()})`,
        ]
      );
    }

    // 2. Generate Initial Monthly Rent Payment Record (for the current/start month)
    const startMonth = agreement_start_date.slice(0, 7); // 'YYYY-MM'
    const dueDay = Math.min(28, Number(rent_due_day) || 5);
    const dueDateStr = `${startMonth}-${String(dueDay).padStart(2, '0')}`;

    await query(
      `INSERT INTO public.rent_payments (
        rental_id,
        month_year,
        due_date,
        amount,
        status,
        notes
      ) VALUES ($1, $2, $3, $4, 'pending', 'Monthly rent due')
      ON CONFLICT (rental_id, month_year) DO NOTHING`,
      [rental.id, startMonth, dueDateStr, rentNum]
    );

    // 3. Mark Property as 'rented'
    await query("UPDATE public.properties SET status = 'rented', updated_at = now() WHERE id = $1", [
      property_id,
    ]);

    // 4. Audit Log
    try {
      await query(
        `INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, new_data)
         VALUES ($1, 'create', 'rental', $2, $3)`,
        [auth.userId, rental.id, JSON.stringify(rental)]
      );
    } catch (auditErr) {
      console.warn('Audit log error on rental create:', auditErr);
    }

    return NextResponse.json({ success: true, rental }, { status: 201 });
  } catch (err: unknown) {
    console.error('Error creating rental:', err);
    return NextResponse.json({ error: 'Failed to create rental record' }, { status: 500 });
  }
}
