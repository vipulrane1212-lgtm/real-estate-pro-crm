import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import { BrokerageRecord } from '@/lib/supabase/types';
import { shouldIncludeDemo, getDemoCondition } from '@/lib/db/demo-filter';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agent_id');
    const paymentStatus = searchParams.get('payment_status');

    const conditions: string[] = [];
    const params: unknown[] = [];

    const includeDemo = shouldIncludeDemo(request);
    const demoCond = getDemoCondition('b', includeDemo);
    if (demoCond) {
      conditions.push(demoCond);
    }

    // Role-based access control
    if (!auth.isAdmin) {
      if (!auth.employeeId) {
        return NextResponse.json({
          brokerage: [],
          totals: {
            allTime: 0,
            thisMonth: 0,
            paid: 0,
            pending: 0,
          },
        });
      }
      params.push(auth.employeeId);
      conditions.push(`b.agent_id = $${params.length}`);
    } else if (agentId && agentId !== 'all') {
      params.push(agentId);
      conditions.push(`b.agent_id = $${params.length}`);
    }

    if (paymentStatus && paymentStatus !== 'all') {
      params.push(paymentStatus);
      conditions.push(`b.payment_status = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        b.id,
        b.deal_id,
        b.agent_id,
        b.total_brokerage,
        b.paid_brokerage,
        b.pending_brokerage,
        b.brokerage_percentage,
        b.payment_status,
        b.payment_date,
        b.notes,
        b.created_at,
        b.updated_at,
        json_build_object(
          'id', d.id,
          'deal_number', d.deal_number,
          'deal_value', d.deal_value,
          'deal_date', d.deal_date,
          'status', d.status,
          'lead', json_build_object('id', l.id, 'full_name', l.full_name, 'phone', l.phone),
          'property', json_build_object('id', p.id, 'title', p.title, 'location', COALESCE(p.location, p.city))
        ) as deal,
        json_build_object(
          'id', e.id,
          'designation', e.designation,
          'profile', json_build_object('full_name', prof.full_name, 'phone', prof.phone)
        ) as agent
      FROM public.brokerage b
      LEFT JOIN public.deals d ON b.deal_id = d.id
      LEFT JOIN public.leads l ON d.lead_id = l.id
      LEFT JOIN public.properties p ON d.property_id = p.id
      LEFT JOIN public.employees e ON b.agent_id = e.id
      LEFT JOIN public.profiles prof ON e.user_id = prof.id
      ${whereClause}
      ORDER BY b.created_at DESC
    `;

    const rows = await query<BrokerageRecord>(sql, params);

    // Compute Totals
    let totalAllTime = 0;
    let totalThisMonth = 0;
    let totalPaid = 0;
    let totalPending = 0;

    const currentYearMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

    const records = rows.map((r) => {
      const tot = Number(r.total_brokerage) || 0;
      const pd = Number(r.paid_brokerage) || 0;
      const pend = Number(r.pending_brokerage) || (tot - pd);

      totalAllTime += tot;
      totalPaid += pd;
      totalPending += pend;

      const recordMonth = r.created_at
        ? new Date(r.created_at).toISOString().slice(0, 7)
        : '';
      if (recordMonth === currentYearMonth) {
        totalThisMonth += tot;
      }

      return {
        ...r,
        total_brokerage: tot,
        paid_brokerage: pd,
        pending_brokerage: pend,
        brokerage_percentage: Number(r.brokerage_percentage || 2.0),
      };
    });

    return NextResponse.json({
      brokerage: records,
      totals: {
        allTime: totalAllTime,
        thisMonth: totalThisMonth,
        paid: totalPaid,
        pending: totalPending,
      },
    });
  } catch (err: unknown) {
    console.error('Error fetching brokerage:', err);
    return NextResponse.json({ error: 'Failed to fetch brokerage records' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth || !auth.isAdmin) {
      return NextResponse.json({ error: 'Admin permission required to update payments' }, { status: 403 });
    }

    const body = await request.json();
    const { id, paid_brokerage, paid_amount, payment_status, status, payment_date, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Brokerage record ID is required' }, { status: 400 });
    }

    const existing = await query<BrokerageRecord>('SELECT * FROM public.brokerage WHERE id = $1', [id]);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    const current = existing[0];
    const rawPaid = paid_brokerage !== undefined ? paid_brokerage : paid_amount;
    const newPaid = rawPaid !== undefined ? Number(rawPaid) : Number(current.paid_brokerage);
    const total = Number(current.total_brokerage);

    let newStatus = payment_status || status;
    if (!newStatus) {
      if (newPaid >= total) newStatus = 'fully_paid';
      else if (newPaid > 0) newStatus = 'partially_paid';
      else newStatus = 'unpaid';
    }

    const sql = `
      UPDATE public.brokerage
      SET paid_brokerage = $1,
          payment_status = $2,
          payment_date = $3,
          notes = COALESCE($4, notes),
          updated_at = now()
      WHERE id = $5
      RETURNING *
    `;

    const updated = await query<BrokerageRecord>(sql, [
      newPaid,
      newStatus,
      payment_date || new Date().toISOString().split('T')[0],
      notes || null,
      id,
    ]);

    return NextResponse.json({ success: true, brokerage: updated[0] });
  } catch (err: unknown) {
    console.error('Error updating brokerage record:', err);
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }
}
