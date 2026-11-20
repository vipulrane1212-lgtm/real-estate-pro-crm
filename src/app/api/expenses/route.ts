import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import { ExpenseRecord, ExpenseCategory } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    const employeeId = searchParams.get('employee_id');
    const search = searchParams.get('search');

    const conditions: string[] = [];
    const params: unknown[] = [];

    // Role-based visibility: Employees only see their own expenses
    if (!auth.isAdmin) {
      if (!auth.employeeId) {
        return NextResponse.json({
          expenses: [],
          totals: { thisMonthTotal: 0, categoryBreakdown: {} },
        });
      }
      params.push(auth.employeeId);
      conditions.push(`ex.employee_id = $${params.length}`);
    } else if (employeeId && employeeId !== 'all') {
      params.push(employeeId);
      conditions.push(`ex.employee_id = $${params.length}`);
    }

    if (category && category !== 'all') {
      params.push(category);
      conditions.push(`ex.category = $${params.length}`);
    }

    if (month && month !== 'all') {
      params.push(`${month}-01`);
      conditions.push(`ex.expense_date >= $${params.length}::date AND ex.expense_date < ($${params.length}::date + INTERVAL '1 month')`);
    }

    if (search) {
      params.push(`%${search}%`);
      const sIdx = params.length;
      conditions.push(`(ex.title ILIKE $${sIdx} OR ex.paid_to ILIKE $${sIdx} OR ex.notes ILIKE $${sIdx})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        ex.id,
        ex.title,
        ex.category,
        ex.amount,
        TO_CHAR(ex.expense_date, 'YYYY-MM-DD') as expense_date,
        ex.paid_to,
        ex.employee_id,
        ex.approved_by,
        ex.receipt_url,
        ex.notes,
        ex.created_at,
        ex.updated_at,
        json_build_object(
          'id', e.id,
          'designation', e.designation,
          'profile', json_build_object(
            'full_name', p.full_name
          )
        ) as employee
      FROM public.expenses ex
      LEFT JOIN public.employees e ON ex.employee_id = e.id
      LEFT JOIN public.profiles p ON e.user_id = p.id
      ${whereClause}
      ORDER BY ex.expense_date DESC, ex.created_at DESC
    `;

    const rows = await query<ExpenseRecord>(sql, params);

    // Compute this month total and category breakdown
    let thisMonthTotal = 0;
    const categoryBreakdown: Record<string, number> = {};

    const formatted = rows.map((r) => {
      const amt = Number(r.amount) || 0;
      thisMonthTotal += amt;
      const cat = r.category || 'other';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + amt;

      return {
        ...r,
        amount: amt,
      };
    });

    return NextResponse.json({
      expenses: formatted,
      totals: {
        thisMonthTotal,
        categoryBreakdown,
        recordCount: formatted.length,
      },
    });
  } catch (err: unknown) {
    console.error('Error fetching expenses:', err);
    return NextResponse.json({ error: 'Failed to fetch office expenses' }, { status: 500 });
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
      title,
      category = 'other',
      amount,
      expense_date,
      paid_to,
      notes,
      receipt_url,
      employee_id,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Expense title is required' }, { status: 400 });
    }
    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Valid positive amount in INR is required' }, { status: 400 });
    }

    let targetEmployeeId = auth.employeeId;
    if (auth.isAdmin && employee_id) {
      targetEmployeeId = employee_id;
    }
    if (!targetEmployeeId && auth.isAdmin) {
      const fallbackEmp = await query<{ id: string }>(
        'SELECT id FROM public.employees WHERE is_active = true ORDER BY created_at ASC LIMIT 1'
      );
      targetEmployeeId = fallbackEmp[0]?.id || null;
    }

    const finalDate = expense_date || new Date().toISOString().split('T')[0];
    const approvedBy = auth.isAdmin ? auth.userId : null;

    const sql = `
      INSERT INTO public.expenses (
        title,
        category,
        amount,
        expense_date,
        paid_to,
        employee_id,
        approved_by,
        receipt_url,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const rows = await query<ExpenseRecord>(sql, [
      title.trim(),
      category,
      numAmount,
      finalDate,
      paid_to ? paid_to.trim() : null,
      targetEmployeeId,
      approvedBy,
      receipt_url || null,
      notes ? notes.trim() : null,
    ]);

    return NextResponse.json({ success: true, expense: rows[0] }, { status: 201 });
  } catch (err: unknown) {
    console.error('Error recording expense:', err);
    return NextResponse.json({ error: 'Failed to record office expense' }, { status: 500 });
  }
}
