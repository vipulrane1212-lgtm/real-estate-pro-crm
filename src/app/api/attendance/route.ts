import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import { AttendanceRecord } from '@/lib/supabase/types';
import { shouldIncludeDemo, getDemoCondition } from '@/lib/db/demo-filter';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date'); // YYYY-MM-DD
    const month = searchParams.get('month'); // YYYY-MM
    const employeeId = searchParams.get('employee_id');

    const conditions: string[] = [];
    const params: unknown[] = [];

    const includeDemo = shouldIncludeDemo(request);
    const demoCond = getDemoCondition('a', includeDemo);
    if (demoCond) {
      conditions.push(demoCond);
    }

    // Role-based filtering: Employee sees only their own attendance
    if (!auth.isAdmin) {
      if (!auth.employeeId) {
        return NextResponse.json({ attendance: [], summary: { present: 0, late: 0, absent: 0 } });
      }
      params.push(auth.employeeId);
      conditions.push(`a.employee_id = $${params.length}`);
    } else if (employeeId && employeeId !== 'all') {
      params.push(employeeId);
      conditions.push(`a.employee_id = $${params.length}`);
    }

    if (date) {
      params.push(date);
      conditions.push(`a.date = $${params.length}::date`);
    } else if (month) {
      params.push(`${month}-01`);
      conditions.push(`a.date >= $${params.length}::date AND a.date < ($${params.length}::date + INTERVAL '1 month')`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        a.id,
        a.employee_id,
        TO_CHAR(a.date, 'YYYY-MM-DD') as date,
        a.check_in,
        a.check_out,
        a.check_in_selfie_url,
        a.check_in_latitude,
        a.check_in_longitude,
        a.check_in_address,
        a.check_out_selfie_url,
        a.check_out_latitude,
        a.check_out_longitude,
        a.check_out_address,
        a.status,
        a.is_late,
        a.notes,
        a.created_at,
        json_build_object(
          'id', e.id,
          'designation', e.designation,
          'profile', json_build_object(
            'full_name', p.full_name,
            'phone', p.phone
          )
        ) as employee
      FROM public.attendance a
      JOIN public.employees e ON a.employee_id = e.id
      JOIN public.profiles p ON e.user_id = p.id
      ${whereClause}
      ORDER BY a.date DESC, a.check_in DESC NULLS LAST
    `;

    const rows = await query<AttendanceRecord>(sql, params);

    // Compute Summary metrics
    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;

    rows.forEach((r) => {
      if (r.status === 'present') presentCount++;
      else if (r.status === 'late' || r.is_late) lateCount++;
      else if (r.status === 'absent') absentCount++;
    });

    return NextResponse.json({
      attendance: rows,
      summary: {
        total: rows.length,
        present: presentCount,
        late: lateCount,
        absent: absentCount,
      },
    });
  } catch (err: unknown) {
    console.error('Error fetching attendance records:', err);
    return NextResponse.json({ error: 'Failed to fetch attendance records' }, { status: 500 });
  }
}
