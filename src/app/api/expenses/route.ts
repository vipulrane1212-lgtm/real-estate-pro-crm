import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import { ExpenseRecord } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // optional 'YYYY-MM'
    const fromDate = searchParams.get('from') || searchParams.get('startDate');
    const toDate = searchParams.get('to') || searchParams.get('endDate');
    const employeeId = searchParams.get('employee_id');
    const search = searchParams.get('search');

    const conditions: string[] = [];
    const params: unknown[] = [];

    // Role-based visibility: Employees only see their own expenses
    if (!auth.isAdmin) {
      if (!auth.employeeId) {
        return NextResponse.json({
          expenses: [],
          totals: { thisMonthTotal: 0, todayTotal: 0 },
          last30Days: [],
        });
      }
      params.push(auth.employeeId);
      conditions.push(`ex.employee_id = $${params.length}`);
    } else if (employeeId && employeeId !== 'all') {
      params.push(employeeId);
      conditions.push(`ex.employee_id = $${params.length}`);
    }

    // Date range filtering
    if (fromDate && toDate) {
      params.push(fromDate);
      const fIdx = params.length;
      params.push(toDate);
      const tIdx = params.length;
      conditions.push(`ex.expense_date >= $${fIdx}::date AND ex.expense_date <= $${tIdx}::date`);
    } else if (month && month !== 'all') {
      params.push(`${month}-01`);
      conditions.push(`ex.expense_date >= $${params.length}::date AND ex.expense_date < ($${params.length}::date + INTERVAL '1 month')`);
    }

    // Free text search by headline, notes, or paid_to
    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      const sIdx = params.length;
      conditions.push(`(COALESCE(ex.headline, ex.title, '') ILIKE $${sIdx} OR COALESCE(ex.notes, '') ILIKE $${sIdx} OR COALESCE(ex.paid_to, '') ILIKE $${sIdx})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        ex.id,
        COALESCE(ex.headline, ex.title, ex.category, 'Expense') as headline,
        COALESCE(ex.title, ex.headline) as title,
        COALESCE(ex.category, 'general') as category,
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

    // Compute Today's Total, Selected Month Total
    const todayStr = new Date().toISOString().split('T')[0];
    const targetMonthStr = month && month !== 'all' ? month : todayStr.slice(0, 7);

    let thisMonthTotal = 0;
    let todayTotal = 0;

    const formatted = rows.map((r) => {
      const amt = Number(r.amount) || 0;
      if (r.expense_date.startsWith(targetMonthStr)) {
        thisMonthTotal += amt;
      }
      if (r.expense_date === todayStr) {
        todayTotal += amt;
      }

      return {
        ...r,
        amount: amt,
      };
    });

    // Query 30-day series for the chart (real data from expenses table, role-scoped)
    const chartParams: unknown[] = [];
    let chartEmployeeFilter = '';
    if (!auth.isAdmin && auth.employeeId) {
      chartParams.push(auth.employeeId);
      chartEmployeeFilter = `AND employee_id = $${chartParams.length}`;
    } else if (auth.isAdmin && employeeId && employeeId !== 'all') {
      chartParams.push(employeeId);
      chartEmployeeFilter = `AND employee_id = $${chartParams.length}`;
    }

    const chartSql = `
      WITH date_series AS (
        SELECT (CURRENT_DATE - (n || ' days')::interval)::date as day_date
        FROM generate_series(29, 0, -1) as n
      )
      SELECT 
        TO_CHAR(ds.day_date, 'YYYY-MM-DD') as date_str,
        TO_CHAR(ds.day_date, 'DD Mon') as display_label,
        COALESCE(SUM(ex.amount), 0) as daily_total,
        COUNT(ex.id) as expense_count
      FROM date_series ds
      LEFT JOIN public.expenses ex 
        ON ex.expense_date = ds.day_date ${chartEmployeeFilter}
      GROUP BY ds.day_date
      ORDER BY ds.day_date ASC
    `;

    const chartRows = await query<{
      date_str: string;
      display_label: string;
      daily_total: string | number;
      expense_count: string | number;
    }>(chartSql, chartParams);

    const last30Days = chartRows.map((c) => ({
      date: c.date_str,
      label: c.display_label,
      total: Number(c.daily_total) || 0,
      count: Number(c.expense_count) || 0,
    }));

    return NextResponse.json({
      expenses: formatted,
      totals: {
        thisMonthTotal,
        todayTotal,
        recordCount: formatted.length,
      },
      last30Days,
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
      headline,
      title,
      amount,
      expense_date,
      paid_to,
      notes,
      receipt_url,
      employee_id,
    } = body;

    const rawHeadline = (headline || title || '').trim();
    if (!rawHeadline) {
      return NextResponse.json({ error: 'Expense headline is required' }, { status: 400 });
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
        headline,
        title,
        category,
        amount,
        expense_date,
        paid_to,
        employee_id,
        approved_by,
        receipt_url,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const rows = await query<ExpenseRecord>(sql, [
      rawHeadline,
      rawHeadline,
      'general',
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
