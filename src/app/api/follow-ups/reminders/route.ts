import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import { FollowUp } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const conditions: string[] = [
      "f.status = 'pending'",
      'f.scheduled_at <= now()',
      '(f.snoozed_until IS NULL OR f.snoozed_until <= now())',
      'f.acknowledged_at IS NULL',
    ];
    const params: unknown[] = [];

    // Role-based visibility: Employee only gets assigned reminders
    if (!auth.isAdmin) {
      if (!auth.employeeId) {
        return NextResponse.json({ reminders: [] });
      }
      params.push(auth.employeeId);
      conditions.push(`f.assigned_to = $${params.length}`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    params.push(limit);
    const limitIdx = params.length;

    const sql = `
      SELECT 
        f.id,
        f.lead_id,
        f.assigned_to,
        f.scheduled_at,
        f.status,
        f.remarks,
        f.outcome,
        f.reminder_at,
        f.snoozed_until,
        f.acknowledged_at,
        f.repeat_count,
        f.created_at,
        f.follow_up_type,
        ROUND(EXTRACT(EPOCH FROM (now() - f.scheduled_at)) / 60) as overdue_minutes,
        json_build_object(
          'id', l.id,
          'full_name', l.full_name,
          'phone', l.phone,
          'status', l.status,
          'location', l.location,
          'requirement', l.requirement,
          'lead_type', l.lead_type
        ) as lead,
        json_build_object(
          'id', e.id,
          'designation', e.designation,
          'profile', json_build_object(
            'full_name', p.full_name
          )
        ) as employee
      FROM public.follow_ups f
      JOIN public.leads l ON f.lead_id = l.id
      JOIN public.employees e ON f.assigned_to = e.id
      JOIN public.profiles p ON e.user_id = p.id
      ${whereClause}
      ORDER BY f.scheduled_at ASC
      LIMIT $${limitIdx}
    `;

    const rows = await query<FollowUp & { overdue_minutes: number }>(sql, params);

    return NextResponse.json({
      reminders: rows,
      count: rows.length,
      serverTime: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('Error fetching follow-up reminders:', err);
    return NextResponse.json({ error: 'Failed to fetch follow-up reminders' }, { status: 500 });
  }
}
