import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import { FollowUp } from '@/lib/supabase/types';
import { shouldIncludeDemo, getDemoCondition } from '@/lib/db/demo-filter';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('lead_id');
    const status = searchParams.get('status') || '';
    const filter = searchParams.get('filter') || 'all'; // 'today', 'overdue', 'upcoming', 'all'
    const type = searchParams.get('type') || '';
    const assignedTo = searchParams.get('assigned_to') || '';

    const conditions: string[] = [];
    const params: unknown[] = [];

    const includeDemo = shouldIncludeDemo(request);
    const demoCond = getDemoCondition('f', includeDemo);
    if (demoCond) {
      conditions.push(demoCond);
    }

    // Role-based access control: Employee only sees assigned follow-ups
    if (!auth.isAdmin) {
      if (!auth.employeeId) {
        return NextResponse.json({ followUps: [] });
      }
      params.push(auth.employeeId);
      conditions.push(`f.assigned_to = $${params.length}`);
    } else if (assignedTo && assignedTo !== 'all') {
      params.push(assignedTo);
      conditions.push(`f.assigned_to = $${params.length}`);
    }

    if (leadId) {
      params.push(leadId);
      conditions.push(`f.lead_id = $${params.length}`);
    }

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`f.status = $${params.length}`);
    }

    if (type && type !== 'all') {
      params.push(type);
      conditions.push(`f.follow_up_type = $${params.length}`);
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

    if (filter === 'today') {
      params.push(todayStart, todayEnd);
      conditions.push(`f.scheduled_at >= $${params.length - 1} AND f.scheduled_at <= $${params.length}`);
    } else if (filter === 'overdue') {
      params.push(now.toISOString());
      conditions.push(`f.scheduled_at < $${params.length} AND f.status = 'pending'`);
    } else if (filter === 'upcoming') {
      params.push(now.toISOString());
      conditions.push(`f.scheduled_at >= $${params.length} AND f.status = 'pending'`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        f.id,
        f.lead_id,
        f.assigned_to,
        f.scheduled_at,
        f.status,
        f.remarks,
        f.outcome,
        f.completed_at,
        f.follow_up_type,
        f.reminder_at,
        f.snoozed_until,
        f.acknowledged_at,
        f.repeat_count,
        f.created_at,
        f.updated_at,
        json_build_object(
          'id', l.id,
          'lead_number', l.lead_number,
          'full_name', l.full_name,
          'phone', l.phone,
          'status', l.status,
          'lead_type', l.lead_type,
          'location', COALESCE(l.location, l.preferred_location),
          'requirement', l.requirement
        ) as lead,
        json_build_object(
          'id', e.id,
          'designation', e.designation,
          'profile', json_build_object('full_name', prof.full_name, 'phone', prof.phone)
        ) as assigned_employee
      FROM public.follow_ups f
      LEFT JOIN public.leads l ON f.lead_id = l.id
      LEFT JOIN public.employees e ON f.assigned_to = e.id
      LEFT JOIN public.profiles prof ON e.user_id = prof.id
      ${whereClause}
      ORDER BY 
        CASE WHEN f.status = 'pending' THEN 0 ELSE 1 END,
        f.scheduled_at ASC
    `;

    const followUps = await query<FollowUp>(sql, params);

    return NextResponse.json({ followUps });
  } catch (err: unknown) {
    console.error('Follow-ups GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch follow-ups' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const leadId = body.leadId || body.lead_id;
    const scheduledAt = body.scheduledAt || body.scheduled_at || body.follow_up_date;
    const followUpType = body.followUpType || body.follow_up_type || 'call';
    const assignedTo = body.assignedTo || body.assigned_to;
    const remarks = body.remarks;
    const reminderAt = body.reminderAt || body.reminder_at;

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 });
    }
    if (!scheduledAt) {
      return NextResponse.json({ error: 'scheduledAt date & time is required' }, { status: 400 });
    }

    // Verify lead exists
    const leadRows = await query<{ id: string; full_name: string; assigned_to: string }>(
      'SELECT id, full_name, assigned_to FROM public.leads WHERE id = $1',
      [leadId]
    );

    if (leadRows.length === 0) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const lead = leadRows[0];

    // Determine assigned employee
    let targetEmployeeId = assignedTo;
    if (!targetEmployeeId) {
      targetEmployeeId = lead.assigned_to || auth.employeeId;
    }

    if (!targetEmployeeId) {
      // Pick first employee or self
      const firstEmp = await query<{ id: string }>('SELECT id FROM public.employees LIMIT 1');
      targetEmployeeId = firstEmp[0]?.id;
    }

    // Insert follow_up
    const insertSql = `
      INSERT INTO public.follow_ups (
        lead_id,
        assigned_to,
        scheduled_at,
        status,
        follow_up_type,
        remarks,
        reminder_at
      ) VALUES ($1, $2, $3, 'pending', $4, $5, $6)
      RETURNING *
    `;

    const res = await query<FollowUp>(insertSql, [
      leadId,
      targetEmployeeId,
      scheduledAt,
      followUpType,
      remarks || null,
      reminderAt || null,
    ]);

    const newFollowUp = res[0];

    // Log to lead_history
    try {
      await query(
        `INSERT INTO public.lead_history (lead_id, actor_id, actor_name, action_type, title, description, details)
         VALUES ($1, $2, $3, 'follow_up', $4, $5, $6)`,
        [
          leadId,
          auth.userId,
          auth.employeeName,
          `Follow-up scheduled (${followUpType.toUpperCase()})`,
          remarks || `Follow-up set for ${new Date(scheduledAt).toLocaleString()}`,
          JSON.stringify({
            follow_up_id: newFollowUp.id,
            scheduled_at: scheduledAt,
            type: followUpType,
          }),
        ]
      );
    } catch (histErr) {
      console.error('Failed to log follow-up to history:', histErr);
    }

    return NextResponse.json({ success: true, followUp: newFollowUp });
  } catch (err: unknown) {
    console.error('Follow-ups POST error:', err);
    return NextResponse.json({ error: 'Failed to create follow-up' }, { status: 500 });
  }
}
