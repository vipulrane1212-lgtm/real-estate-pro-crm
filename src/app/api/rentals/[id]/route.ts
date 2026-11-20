import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import { RentalRecord } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const sql = `
      SELECT 
        r.id,
        r.rental_number,
        r.property_id,
        r.tenant_name,
        r.tenant_phone,
        r.tenant_email,
        r.tenant_id,
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
            ) ORDER BY rp.month_year DESC
          ) FILTER (WHERE rp.id IS NOT NULL),
          '[]'
        ) as payments
      FROM public.rentals r
      JOIN public.properties p ON r.property_id = p.id
      LEFT JOIN public.employees e ON r.agent_id = e.id
      LEFT JOIN public.profiles prof ON e.user_id = prof.id
      LEFT JOIN public.rent_payments rp ON rp.rental_id = r.id
      WHERE r.id = $1
      GROUP BY r.id, p.id, e.id, prof.full_name
    `;

    const rows = await query<RentalRecord>(sql, [id]);
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 });
    }

    return NextResponse.json({ rental: rows[0] });
  } catch (err: unknown) {
    console.error('Error fetching rental detail:', err);
    return NextResponse.json({ error: 'Failed to fetch rental' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, notes, monthly_rent, deposit_amount, agreement_end_date } = body;

    const updates: string[] = [];
    const values: unknown[] = [];

    if (status !== undefined) {
      values.push(status);
      updates.push(`status = $${values.length}`);
    }
    if (notes !== undefined) {
      values.push(notes ? notes.trim() : null);
      updates.push(`notes = $${values.length}`);
    }
    if (monthly_rent !== undefined) {
      values.push(Number(monthly_rent));
      updates.push(`monthly_rent = $${values.length}`);
    }
    if (deposit_amount !== undefined) {
      values.push(Number(deposit_amount));
      updates.push(`deposit_amount = $${values.length}`);
    }
    if (agreement_end_date !== undefined) {
      values.push(agreement_end_date);
      updates.push(`agreement_end_date = $${values.length}`);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields provided for update' }, { status: 400 });
    }

    values.push(id);
    const updateSql = `
      UPDATE public.rentals
      SET ${updates.join(', ')}, updated_at = now()
      WHERE id = $${values.length}
      RETURNING *
    `;

    const updated = await query<RentalRecord>(updateSql, values);
    if (updated.length === 0) {
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, rental: updated[0] });
  } catch (err: unknown) {
    console.error('Error updating rental:', err);
    return NextResponse.json({ error: 'Failed to update rental' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!auth.isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Only administrators can delete rentals' }, { status: 403 });
    }

    const { id } = await params;
    await query('DELETE FROM public.rentals WHERE id = $1', [id]);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Error deleting rental:', err);
    return NextResponse.json({ error: 'Failed to delete rental' }, { status: 500 });
  }
}
