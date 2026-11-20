import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import { RentPaymentRecord } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function POST(
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
    const {
      month_year,
      amount,
      status = 'paid', // 'paid', 'pending', 'overdue'
      paid_date,
      payment_mode = 'upi', // 'upi', 'bank_transfer', 'cash', 'cheque'
      transaction_reference,
      notes,
    } = body;

    if (!month_year) {
      return NextResponse.json({ error: 'month_year (YYYY-MM) is required' }, { status: 400 });
    }

    // Verify rental exists
    const rentalCheck = await query<{ id: string; monthly_rent: string; rent_due_day: number }>(
      'SELECT id, monthly_rent, rent_due_day FROM public.rentals WHERE id = $1',
      [id]
    );

    if (rentalCheck.length === 0) {
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 });
    }

    const rental = rentalCheck[0];
    const rentAmount = Number(amount) || Number(rental.monthly_rent);
    const dueDay = Math.min(28, rental.rent_due_day || 5);
    const dueDate = `${month_year}-${String(dueDay).padStart(2, '0')}`;
    const effectivePaidDate = status === 'paid' ? (paid_date || new Date().toISOString().split('T')[0]) : null;

    const upsertSql = `
      INSERT INTO public.rent_payments (
        rental_id,
        month_year,
        due_date,
        amount,
        status,
        paid_date,
        payment_mode,
        transaction_reference,
        notes,
        collected_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (rental_id, month_year) DO UPDATE
      SET
        amount = EXCLUDED.amount,
        status = EXCLUDED.status,
        paid_date = EXCLUDED.paid_date,
        payment_mode = EXCLUDED.payment_mode,
        transaction_reference = EXCLUDED.transaction_reference,
        notes = EXCLUDED.notes,
        collected_by = EXCLUDED.collected_by,
        updated_at = now()
      RETURNING *
    `;

    const rows = await query<RentPaymentRecord>(upsertSql, [
      id,
      month_year,
      dueDate,
      rentAmount,
      status,
      effectivePaidDate,
      payment_mode,
      transaction_reference ? transaction_reference.trim() : null,
      notes ? notes.trim() : null,
      auth.userId,
    ]);

    // Audit log
    await query(
      `INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, new_data)
       VALUES ($1, 'update_rent_payment', 'rent_payment', $2, $3)`,
      [auth.userId, rows[0].id, JSON.stringify(rows[0])]
    );

    return NextResponse.json({ success: true, payment: rows[0] });
  } catch (err: unknown) {
    console.error('Error recording rent payment:', err);
    return NextResponse.json({ error: 'Failed to record rent payment' }, { status: 500 });
  }
}
