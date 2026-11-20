import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import { ExpenseRecord } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can edit an expense
    if (!auth.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can edit office expenses' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existing = await query<ExpenseRecord>('SELECT * FROM public.expenses WHERE id = $1', [id]);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Expense record not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      title,
      category,
      amount,
      expense_date,
      paid_to,
      notes,
      receipt_url,
    } = body;

    const updates: string[] = [];
    const values: unknown[] = [];

    if (title !== undefined) {
      values.push(title.trim());
      updates.push(`title = $${values.length}`);
    }
    if (category !== undefined) {
      values.push(category);
      updates.push(`category = $${values.length}`);
    }
    if (amount !== undefined) {
      const numAmt = Number(amount);
      if (isNaN(numAmt) || numAmt <= 0) {
        return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
      }
      values.push(numAmt);
      updates.push(`amount = $${values.length}`);
    }
    if (expense_date !== undefined) {
      values.push(expense_date);
      updates.push(`expense_date = $${values.length}`);
    }
    if (paid_to !== undefined) {
      values.push(paid_to ? paid_to.trim() : null);
      updates.push(`paid_to = $${values.length}`);
    }
    if (notes !== undefined) {
      values.push(notes ? notes.trim() : null);
      updates.push(`notes = $${values.length}`);
    }
    if (receipt_url !== undefined) {
      values.push(receipt_url || null);
      updates.push(`receipt_url = $${values.length}`);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(id);
    const sql = `
      UPDATE public.expenses
      SET ${updates.join(', ')}, updated_at = now()
      WHERE id = $${values.length}
      RETURNING *
    `;

    const rows = await query<ExpenseRecord>(sql, values);

    return NextResponse.json({ success: true, expense: rows[0] });
  } catch (err: unknown) {
    console.error('Error updating expense:', err);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
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

    // Only admins can delete an expense
    if (!auth.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can delete office expenses' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existing = await query<ExpenseRecord>('SELECT * FROM public.expenses WHERE id = $1', [id]);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Expense record not found' }, { status: 404 });
    }

    await query('DELETE FROM public.expenses WHERE id = $1', [id]);

    return NextResponse.json({ success: true, message: 'Expense deleted successfully' });
  } catch (err: unknown) {
    console.error('Error deleting expense:', err);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
