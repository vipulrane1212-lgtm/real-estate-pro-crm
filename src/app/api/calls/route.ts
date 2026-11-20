import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import { CallRecord } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('lead_id');
    const employeeId = searchParams.get('employee_id');
    const outcome = searchParams.get('outcome');

    const conditions: string[] = [];
    const params: unknown[] = [];

    // Role-based filtering: Employee sees only their assigned leads or calls
    if (!auth.isAdmin) {
      if (!auth.employeeId) {
        return NextResponse.json({ calls: [] });
      }
      params.push(auth.employeeId);
      conditions.push(`(c.employee_id = $${params.length} OR l.assigned_to = $${params.length})`);
    } else if (employeeId) {
      params.push(employeeId);
      conditions.push(`c.employee_id = $${params.length}`);
    }

    if (leadId) {
      params.push(leadId);
      conditions.push(`c.lead_id = $${params.length}`);
    }

    if (outcome && outcome !== 'all') {
      params.push(outcome);
      conditions.push(`c.outcome = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        c.id,
        c.lead_id,
        c.employee_id,
        c.call_type,
        c.outcome,
        c.duration_seconds,
        c.client_phone,
        c.recording_url,
        c.notes,
        c.call_time,
        c.provider_call_id,
        c.created_at,
        json_build_object(
          'id', l.id,
          'full_name', l.full_name,
          'phone', l.phone
        ) as lead,
        json_build_object(
          'id', e.id,
          'designation', e.designation,
          'profile', json_build_object('full_name', p.full_name)
        ) as employee
      FROM public.calls c
      LEFT JOIN public.leads l ON c.lead_id = l.id
      LEFT JOIN public.employees e ON c.employee_id = e.id
      LEFT JOIN public.profiles p ON e.user_id = p.id
      ${whereClause}
      ORDER BY c.call_time DESC
    `;

    const rows = await query<CallRecord>(sql, params);

    return NextResponse.json({ calls: rows });
  } catch (err: unknown) {
    console.error('Error fetching calls:', err);
    return NextResponse.json({ error: 'Failed to fetch call logs' }, { status: 500 });
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
      lead_id,
      leadId,
      call_type = 'outgoing',
      outcome = 'connected',
      duration_seconds = 0,
      client_phone,
      recording_url,
      notes,
      call_time,
      employee_id,
    } = body;

    const targetLeadId = lead_id || leadId;
    if (!targetLeadId) {
      return NextResponse.json({ error: 'lead_id is required' }, { status: 400 });
    }

    // Determine acting employee
    let targetEmployeeId = auth.isAdmin && employee_id ? employee_id : auth.employeeId;
    if (!targetEmployeeId && auth.isAdmin) {
      const fallbackEmp = await query<{ id: string }>(
        'SELECT id FROM public.employees WHERE is_active = true ORDER BY created_at ASC LIMIT 1'
      );
      targetEmployeeId = fallbackEmp[0]?.id || null;
    }
    if (!targetEmployeeId) {
      return NextResponse.json({ error: 'Active employee profile required to log calls' }, { status: 400 });
    }

    // Fetch lead details
    const leadRows = await query<{ full_name: string; phone: string }>(
      'SELECT full_name, phone FROM public.leads WHERE id = $1',
      [targetLeadId]
    );
    if (leadRows.length === 0) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const clientPhoneFinal = client_phone || leadRows[0].phone;
    const callTimeFinal = call_time || new Date().toISOString();

    // Check if telephony provider is configured
    const twilioConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
    const exotelConfigured = !!(process.env.EXOTEL_API_KEY && process.env.EXOTEL_API_TOKEN && process.env.EXOTEL_SUBDOMAIN);
    const hasLiveCallingProvider = twilioConfigured || exotelConfigured;

    let providerCallId: string | null = null;
    if (body.trigger_live_dial && !hasLiveCallingProvider) {
      // Return clear explanation if live call was requested without keys
      return NextResponse.json(
        {
          error: 'Live in-app calling requires Twilio (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER) or Exotel (EXOTEL_API_KEY, EXOTEL_API_TOKEN, EXOTEL_SUBDOMAIN) configuration. Please use click-to-dial (tel: link) and manual call logging.',
        },
        { status: 501 }
      );
    }

    const insertSql = `
      INSERT INTO public.calls (
        lead_id,
        employee_id,
        call_type,
        outcome,
        duration_seconds,
        client_phone,
        recording_url,
        notes,
        call_time,
        provider_call_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const insertedRows = await query<CallRecord>(insertSql, [
      targetLeadId,
      targetEmployeeId,
      call_type,
      outcome,
      duration_seconds,
      clientPhoneFinal,
      recording_url || null,
      notes || null,
      callTimeFinal,
      providerCallId,
    ]);

    const call = insertedRows[0];

    // Log to Lead History timeline
    const durationMins = Math.floor(duration_seconds / 60);
    const durationSecs = duration_seconds % 60;
    const durationStr = duration_seconds > 0 ? ` (${durationMins}m ${durationSecs}s)` : '';
    const outcomeLabel = outcome.replace('_', ' ').toUpperCase();

    await query(
      `INSERT INTO public.lead_history (
        lead_id,
        actor_id,
        actor_name,
        action_type,
        title,
        description,
        details
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        targetLeadId,
        auth.userId,
        auth.employeeName,
        'call',
        `Phone Call Logged [${outcomeLabel}]${durationStr}`,
        notes ? `Outcome: ${outcomeLabel}. Note: ${notes}` : `Call completed with outcome: ${outcomeLabel}`,
        JSON.stringify({
          call_id: call.id,
          duration_seconds,
          outcome,
          recording_url: call.recording_url,
        }),
      ]
    );

    return NextResponse.json({
      success: true,
      call,
      providerConfigured: hasLiveCallingProvider,
    });
  } catch (err: unknown) {
    console.error('Error logging call:', err);
    return NextResponse.json({ error: 'Failed to record call log' }, { status: 500 });
  }
}
