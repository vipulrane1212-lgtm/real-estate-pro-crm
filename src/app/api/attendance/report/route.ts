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
    const employeeId = searchParams.get('employee_id');
    const format = searchParams.get('format') || 'json';

    const conditions: string[] = [];
    const params: unknown[] = [];

    // Role-based visibility
    if (!auth.isAdmin) {
      if (!auth.employeeId) {
        return NextResponse.json({ report: [] });
      }
      params.push(auth.employeeId);
      conditions.push(`a.employee_id = $${params.length}`);
    } else if (employeeId && employeeId !== 'all') {
      params.push(employeeId);
      conditions.push(`a.employee_id = $${params.length}`);
    }

    params.push(`${month}-01`);
    conditions.push(`a.date >= $${params.length}::date AND a.date < ($${params.length}::date + INTERVAL '1 month')`);

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // 1. Detailed punch logs
    const sqlLogs = `
      SELECT 
        a.id,
        TO_CHAR(a.date, 'YYYY-MM-DD') as date_str,
        p.full_name as employee_name,
        e.designation,
        TO_CHAR(a.check_in, 'YYYY-MM-DD HH24:MI:SS') as check_in_time,
        a.check_in_selfie_url,
        a.check_in_latitude,
        a.check_in_longitude,
        COALESCE(a.check_in_address, '—') as check_in_location,
        TO_CHAR(a.check_out, 'YYYY-MM-DD HH24:MI:SS') as check_out_time,
        a.check_out_selfie_url,
        a.check_out_latitude,
        a.check_out_longitude,
        COALESCE(a.check_out_address, '—') as check_out_location,
        UPPER(a.status) as status,
        CASE WHEN a.is_late THEN 'YES' ELSE 'NO' END as is_late_str,
        COALESCE(a.notes, '—') as notes
      FROM public.attendance a
      JOIN public.employees e ON a.employee_id = e.id
      JOIN public.profiles p ON e.user_id = p.id
      ${whereClause}
      ORDER BY a.date DESC, a.check_in DESC
    `;

    const logs = await query<{
      id: string;
      date_str: string;
      employee_name: string;
      designation: string;
      check_in_time: string;
      check_in_selfie_url: string | null;
      check_in_latitude: number | null;
      check_in_longitude: number | null;
      check_in_location: string;
      check_out_time: string;
      check_out_selfie_url: string | null;
      check_out_latitude: number | null;
      check_out_longitude: number | null;
      check_out_location: string;
      status: string;
      is_late_str: string;
      notes: string;
    }>(sqlLogs, params);

    // 2. Summary per employee
    const summaryMap = new Map<string, {
      employeeName: string;
      designation: string;
      daysPresent: number;
      daysLate: number;
      daysAbsent: number;
      totalLogged: number;
    }>();

    logs.forEach((log) => {
      const existing = summaryMap.get(log.employee_name) || {
        employeeName: log.employee_name,
        designation: log.designation,
        daysPresent: 0,
        daysLate: 0,
        daysAbsent: 0,
        totalLogged: 0,
      };

      existing.totalLogged += 1;
      if (log.status === 'PRESENT') existing.daysPresent += 1;
      else if (log.status === 'LATE' || log.is_late_str === 'YES') existing.daysLate += 1;
      else if (log.status === 'ABSENT') existing.daysAbsent += 1;

      summaryMap.set(log.employee_name, existing);
    });

    const summaryList = Array.from(summaryMap.values());

    // If Excel export requested
    if (format === 'xlsx' || format === 'excel') {
      const workbook = XLSX.utils.book_new();

      // Sheet 1: Summary
      const summaryRows = summaryList.map((s) => ({
        'Employee Name': s.employeeName,
        'Designation': s.designation,
        'Days Present': s.daysPresent,
        'Days Late': s.daysLate,
        'Days Absent': s.daysAbsent,
        'Total Punches': s.totalLogged,
      }));

      const wsSummary = XLSX.utils.json_to_sheet(
        summaryRows.length > 0 ? summaryRows : [{ Note: 'No attendance records found for this month' }]
      );
      XLSX.utils.book_append_sheet(workbook, wsSummary, 'Monthly Summary');

      // Sheet 2: Detailed Logs
      const detailedRows = logs.map((l) => ({
        'Date': l.date_str,
        'Employee Name': l.employee_name,
        'Designation': l.designation,
        'Status': l.status,
        'Late?': l.is_late_str,
        'Check-In Time': l.check_in_time || '—',
        'Check-In Location': l.check_in_location,
        'Check-In Maps Link': l.check_in_latitude ? `https://www.google.com/maps?q=${l.check_in_latitude},${l.check_in_longitude}` : '—',
        'Check-Out Time': l.check_out_time || '—',
        'Check-Out Location': l.check_out_location,
        'Check-Out Maps Link': l.check_out_latitude ? `https://www.google.com/maps?q=${l.check_out_latitude},${l.check_out_longitude}` : '—',
        'Notes': l.notes,
      }));

      const wsDetailed = XLSX.utils.json_to_sheet(
        detailedRows.length > 0 ? detailedRows : [{ Note: 'No detailed punch logs found' }]
      );
      XLSX.utils.book_append_sheet(workbook, wsDetailed, 'Daily Punch Records');

      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      const filename = `Diksha_Attendance_Report_${month}.xlsx`;

      return new NextResponse(excelBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({
      month,
      summary: summaryList,
      logs,
    });
  } catch (err: unknown) {
    console.error('Error generating attendance report:', err);
    return NextResponse.json({ error: 'Failed to generate attendance report' }, { status: 500 });
  }
}
