import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import { Deal } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const employeeId = searchParams.get('employee_id') || '';
    const search = searchParams.get('search')?.trim() || '';

    const conditions: string[] = [];
    const params: unknown[] = [];

    // Role-based access control
    if (!auth.isAdmin) {
      if (!auth.employeeId) {
        return NextResponse.json({ deals: [] });
      }
      params.push(auth.employeeId);
      conditions.push(`d.employee_id = $${params.length}`);
    } else if (employeeId && employeeId !== 'all') {
      params.push(employeeId);
      conditions.push(`d.employee_id = $${params.length}`);
    }

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`d.status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      const sIdx = params.length;
      conditions.push(`(l.full_name ILIKE $${sIdx} OR p.title ILIKE $${sIdx} OR l.phone ILIKE $${sIdx})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        d.id,
        d.deal_number,
        d.lead_id,
        d.property_id,
        d.employee_id,
        d.deal_value,
        d.commission_amount,
        d.brokerage_percentage,
        d.deal_date,
        d.closed_date,
        TO_CHAR(d.agreement_end_date, 'YYYY-MM-DD') as agreement_end_date,
        d.status,
        d.notes,
        d.created_at,
        d.updated_at,
        json_build_object(
          'id', l.id,
          'full_name', l.full_name,
          'phone', l.phone
        ) as lead,
        json_build_object(
          'id', p.id,
          'title', p.title,
          'location', COALESCE(p.location, p.city),
          'price', p.price
        ) as property,
        json_build_object(
          'id', e.id,
          'designation', e.designation,
          'profile', json_build_object('full_name', prof.full_name)
        ) as employee
      FROM public.deals d
      LEFT JOIN public.leads l ON d.lead_id = l.id
      LEFT JOIN public.properties p ON d.property_id = p.id
      LEFT JOIN public.employees e ON d.employee_id = e.id
      LEFT JOIN public.profiles prof ON e.user_id = prof.id
      ${whereClause}
      ORDER BY d.deal_date DESC, d.created_at DESC
    `;

    const rows = await query<Deal>(sql, params);

    return NextResponse.json({
      deals: rows.map((r) => ({
        ...r,
        deal_value: Number(r.deal_value),
        commission_amount: Number(r.commission_amount),
        brokerage_percentage: Number(r.brokerage_percentage || 2.0),
      })),
    });
  } catch (err: unknown) {
    console.error('Error fetching deals:', err);
    return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 });
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
      lead_id,
      leadId,
      property_id,
      propertyId,
      deal_value,
      dealValue,
      brokerage_percentage = 2.0,
      brokeragePercentage,
      status = 'closed_won',
      deal_date,
      closed_date,
      agreement_end_date,
      agreementEndDate,
      notes,
      employee_id,
    } = body;

    const targetLeadId = lead_id || leadId;
    const targetPropertyId = property_id || propertyId;
    const targetDealVal = Number(deal_value ?? dealValue);
    const targetPct = Number(brokerage_percentage ?? brokeragePercentage ?? 2.0);
    const targetAgreementEnd = agreement_end_date || agreementEndDate || null;

    if (!targetLeadId) {
      return NextResponse.json({ error: 'lead_id is required' }, { status: 400 });
    }
    if (!targetPropertyId) {
      return NextResponse.json({ error: 'property_id is required' }, { status: 400 });
    }
    if (!targetDealVal || isNaN(targetDealVal) || targetDealVal <= 0) {
      return NextResponse.json({ error: 'Valid final deal value is required' }, { status: 400 });
    }

    // Determine closing agent
    let targetEmployeeId = employee_id;
    if (!targetEmployeeId) {
      const leadRow = await query<{ assigned_to: string }>('SELECT assigned_to FROM public.leads WHERE id = $1', [targetLeadId]);
      targetEmployeeId = leadRow[0]?.assigned_to || auth.employeeId;
    }
    if (!targetEmployeeId && auth.isAdmin) {
      const fallbackEmp = await query<{ id: string }>(
        'SELECT id FROM public.employees WHERE is_active = true ORDER BY created_at ASC LIMIT 1'
      );
      targetEmployeeId = fallbackEmp[0]?.id || null;
    }

    if (!targetEmployeeId) {
      return NextResponse.json({ error: 'Active employee assignment required for deal' }, { status: 400 });
    }

    const commissionAmount = Math.round((targetDealVal * targetPct) / 100);
    const finalDealDate = deal_date || closed_date || new Date().toISOString().split('T')[0];

    const insertSql = `
      INSERT INTO public.deals (
        lead_id,
        property_id,
        employee_id,
        deal_value,
        commission_amount,
        brokerage_percentage,
        deal_date,
        closed_date,
        agreement_end_date,
        status,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, $10)
      RETURNING *
    `;

    const insertedRows = await query<Deal>(insertSql, [
      targetLeadId,
      targetPropertyId,
      targetEmployeeId,
      targetDealVal,
      commissionAmount,
      targetPct,
      finalDealDate,
      targetAgreementEnd,
      status,
      notes || null,
    ]);

    const deal = insertedRows[0];

    // If deal is closed won:
    if (status === 'closed_won') {
      // 1. Update lead status to 'closed_won'
      await query("UPDATE public.leads SET status = 'closed_won', updated_at = now() WHERE id = $1", [targetLeadId]);

      // 2. Update property status to 'sold' (or 'rented' if listing_type is rent)
      const propCheck = await query<{ listing_type: string }>('SELECT listing_type FROM public.properties WHERE id = $1', [targetPropertyId]);
      const newPropStatus = propCheck[0]?.listing_type === 'rent' ? 'rented' : 'sold';
      await query('UPDATE public.properties SET status = $1, updated_at = now() WHERE id = $2', [newPropStatus, targetPropertyId]);

      // 3. Create Brokerage Record
      await query(
        `INSERT INTO public.brokerage (
          deal_id,
          agent_id,
          total_brokerage,
          paid_brokerage,
          brokerage_percentage,
          payment_status,
          notes
        ) VALUES ($1, $2, $3, 0, $4, 'unpaid', $5)`,
        [
          deal.id,
          targetEmployeeId,
          commissionAmount,
          targetPct,
          `Brokerage for Deal #${deal.deal_number || deal.id.slice(0, 8)}`,
        ]
      );
    }

    // Log to Lead History
    await query(
      `INSERT INTO public.lead_history (
        lead_id,
        actor_id,
        actor_name,
        action_type,
        title,
        description,
        details
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        targetLeadId,
        auth.userId,
        auth.employeeName,
        'status_change',
        `Deal Closed [₹${targetDealVal.toLocaleString('en-IN')}]`,
        `Deal registered successfully. Brokerage (${targetPct}%): ₹${commissionAmount.toLocaleString('en-IN')}.`,
        JSON.stringify({ deal_id: deal.id, deal_value: targetDealVal, commission_amount: commissionAmount }),
      ]
    );

    return NextResponse.json({
      success: true,
      deal: {
        ...deal,
        deal_value: Number(deal.deal_value),
        commission_amount: Number(deal.commission_amount),
      },
    });
  } catch (err: unknown) {
    console.error('Error creating deal:', err);
    return NextResponse.json({ error: 'Failed to record deal' }, { status: 500 });
  }
}
