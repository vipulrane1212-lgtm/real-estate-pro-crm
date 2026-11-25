import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Normalizes phone number to last 10 digits for reliable Indian mobile matching
 */
function cleanPhone(raw?: string | null): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/**
 * Telephony Webhook Endpoint
 * Ingests call recordings, duration, and status updates from:
 * 1. Exotel Webhooks (POST or GET)
 * 2. Twilio Voice Webhooks / Recording Callbacks
 * 3. Mobile Companion App auto-sync
 */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let payload: Record<string, any> = {};

    if (contentType.includes('application/json')) {
      payload = await request.json().catch(() => ({}));
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData().catch(() => null);
      if (formData) {
        formData.forEach((value, key) => {
          payload[key] = value.toString();
        });
      }
    } else {
      // Fallback: attempt to parse as JSON or URL params
      const text = await request.text();
      try {
        payload = JSON.parse(text);
      } catch {
        const searchParams = new URLSearchParams(text);
        searchParams.forEach((val, k) => {
          payload[k] = val;
        });
      }
    }

    return await processTelephonyEvent(payload);
  } catch (err: any) {
    console.error('Telephony Webhook POST Error:', err);
    return NextResponse.json({ error: 'Webhook processing failed', details: err?.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const payload: Record<string, any> = {};
    searchParams.forEach((val, key) => {
      payload[key] = val;
    });

    return await processTelephonyEvent(payload);
  } catch (err: any) {
    console.error('Telephony Webhook GET Error:', err);
    return NextResponse.json({ error: 'Webhook processing failed', details: err?.message }, { status: 500 });
  }
}

async function processTelephonyEvent(payload: Record<string, any>) {
  // Extract provider call identifier
  const providerCallId =
    payload.CallSid ||
    payload.call_sid ||
    payload.provider_call_id ||
    payload.Sid ||
    payload.id ||
    `call_${Date.now()}`;

  // Extract Caller / Recipient phone numbers
  const rawFrom = payload.From || payload.caller || payload.agent_phone || payload.employee_phone || '';
  const rawTo = payload.To || payload.client_phone || payload.dial_to || payload.recipient || '';

  // Extract recording URL
  const recordingUrl =
    payload.RecordingUrl ||
    payload.recording_url ||
    payload.RecordingURL ||
    payload.recording ||
    null;

  // Extract duration
  const durationSec = parseInt(
    payload.DialCallDuration ||
      payload.CallDuration ||
      payload.duration_seconds ||
      payload.Duration ||
      payload.duration ||
      '0',
    10
  ) || 0;

  // Status mapping
  const rawStatus = (payload.Status || payload.CallStatus || payload.status || payload.outcome || '').toLowerCase();
  let outcome = 'connected';
  if (['busy'].includes(rawStatus)) {
    outcome = 'busy';
  } else if (['no-answer', 'not_answered', 'failed', 'canceled'].includes(rawStatus)) {
    outcome = 'not_answered';
  } else if (['wrong_number'].includes(rawStatus)) {
    outcome = 'wrong_number';
  } else if (durationSec > 0 || ['completed', 'answered', 'connected'].includes(rawStatus)) {
    outcome = 'connected';
  }

  // Determine direction
  const callType = (payload.Direction || payload.call_type || 'outgoing').includes('inbound')
    ? 'incoming'
    : 'outgoing';

  const notes =
    payload.notes ||
    payload.note ||
    `Telephony call via ${payload.provider || 'Cloud Telephony'}${recordingUrl ? ' with audio recording' : ''}`;

  // Clean phone numbers
  const fromClean = cleanPhone(rawFrom);
  const toClean = cleanPhone(rawTo);

  // 1. Resolve Acting Employee
  // Match employee phone against fromClean or toClean, or explicit employee_id
  let employeeId: string | null = payload.employee_id || null;
  if (!employeeId && (fromClean || toClean)) {
    const empMatches = await query<{ id: string }>(
      `SELECT e.id FROM public.employees e
       JOIN public.profiles p ON e.user_id = p.id
       WHERE (p.phone ILIKE '%' || $1 || '%' OR p.phone ILIKE '%' || $2 || '%')
         AND e.is_active = true
       LIMIT 1`,
      [fromClean || 'INVALID', toClean || 'INVALID']
    );
    if (empMatches.length > 0) {
      employeeId = empMatches[0].id;
    }
  }

  // Fallback employee if phone was not found
  if (!employeeId) {
    const fallbackEmp = await query<{ id: string }>(
      `SELECT id FROM public.employees WHERE is_active = true ORDER BY created_at ASC LIMIT 1`
    );
    employeeId = fallbackEmp[0]?.id || null;
  }

  if (!employeeId) {
    return NextResponse.json({ error: 'No active employee found in organization' }, { status: 400 });
  }

  // 2. Resolve Client Lead
  // Determine client phone (the other party)
  const clientPhone = callType === 'incoming' ? rawFrom : (rawTo || rawFrom);
  const clientPhoneClean = cleanPhone(clientPhone);

  let leadId: string | null = payload.lead_id || null;
  if (!leadId && clientPhoneClean) {
    const leadMatches = await query<{ id: string }>(
      `SELECT id FROM public.leads 
       WHERE phone ILIKE '%' || $1 || '%' 
       ORDER BY created_at DESC LIMIT 1`,
      [clientPhoneClean]
    );
    if (leadMatches.length > 0) {
      leadId = leadMatches[0].id;
    }
  }

  // If no lead found, automatically create an Inbound/Outbound Lead so the call is never lost
  if (!leadId) {
    const formattedName = `Client (${clientPhone || 'Unknown Phone'})`;
    const newLead = await query<{ id: string }>(
      `INSERT INTO public.leads (
         full_name,
         phone,
         email,
         source,
         status,
         budget_min,
         budget_max,
         assigned_to,
         remarks,
         is_demo
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false)
       RETURNING id`,
      [
        formattedName,
        clientPhone || '+91 9000000000',
        null,
        'Phone Call',
        'New',
        0,
        0,
        employeeId,
        `Auto-created lead from telephony ${callType} call log.`
      ]
    );
    leadId = newLead[0]?.id || null;
  }

  if (!leadId) {
    return NextResponse.json({ error: 'Failed to create or associate lead' }, { status: 500 });
  }

  // 3. Upsert Call Log Record
  // Check if provider_call_id already exists to prevent duplicate entries
  const existingCall = await query<{ id: string }>(
    `SELECT id FROM public.calls WHERE provider_call_id = $1 LIMIT 1`,
    [providerCallId]
  );

  let savedCall;
  if (existingCall.length > 0) {
    // Update existing record (e.g. recording URL and final duration arrived after call ended)
    const updateSql = `
      UPDATE public.calls
      SET
        duration_seconds = GREATEST(duration_seconds, $1),
        recording_url = COALESCE($2, recording_url),
        outcome = COALESCE($3, outcome),
        notes = COALESCE($4, notes)
      WHERE id = $5
      RETURNING *
    `;
    const updated = await query(updateSql, [
      durationSec,
      recordingUrl,
      outcome,
      notes,
      existingCall[0].id,
    ]);
    savedCall = updated[0];
  } else {
    // Insert new call
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
        provider_call_id,
        is_demo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, false)
      RETURNING *
    `;
    const inserted = await query(insertSql, [
      leadId,
      employeeId,
      callType,
      outcome,
      durationSec,
      clientPhone,
      recordingUrl,
      notes,
      providerCallId,
    ]);
    savedCall = inserted[0];
  }

  // 4. Update Lead's last contacted timestamp
  await query(
    `UPDATE public.leads SET updated_at = NOW() WHERE id = $1`,
    [leadId]
  );

  return NextResponse.json({
    success: true,
    message: 'Telephony call record and recording processed successfully',
    call: savedCall,
  });
}
