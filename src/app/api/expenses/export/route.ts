import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    const category = searchParams.get('category');
    const employeeId = searchParams.get('employee_id');

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (!auth.isAdmin) {
      if (!auth.employeeId) {
        return NextResponse.json({ error: 'No employee assignment' }, { status: 403 });
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

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        TO_CHAR(ex.expense_date, 'YYYY-MM-DD') as "Date",
        ex.title as "Expense Title",
        UPPER(ex.category) as "Category",
        ex.amount as "Amount (INR)",
        COALESCE(ex.paid_to, '—') as "Paid To",
        COALESCE(p.full_name, 'Diksha Real Estate') as "Added By",
        COALESCE(ex.notes, '—') as "Notes",
        CASE WHEN ex.receipt_url IS NOT NULL THEN 'ATTACHED' ELSE 'NONE' END as "Receipt Attached"
      FROM public.expenses ex
      LEFT JOIN public.employees e ON ex.employee_id = e.id
      LEFT JOIN public.profiles p ON e.user_id = p.id
      ${whereClause}
      ORDER BY ex.expense_date DESC
    `;

    const rows = await query<Record<string, unknown>>(sql, params);

    const workbook = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(
      rows.length > 0 ? rows : [{ Note: 'No expenses found for this selection' }]
    );
    XLSX.utils.book_append_sheet(workbook, ws, 'Office Expenses');

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const filename = `Diksha_Expenses_Report_${month}.xlsx`;

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    console.error('Error exporting expenses:', err);
    return NextResponse.json({ error: 'Failed to export expenses report' }, { status: 500 });
  }
}
