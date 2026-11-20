import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import { WhatsAppMessage } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

function cleanPhoneForWhatsApp(phone: string): string {
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.length === 10) {
    clean = '91' + clean;
  }
  return clean;
}

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('lead_id');
    const employeeId = searchParams.get('employee_id');

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (!auth.isAdmin) {
      if (!auth.employeeId) {
        return NextResponse.json({ messages: [] });
      }
      params.push(auth.employeeId);
      conditions.push(`(w.employee_id = $${params.length} OR l.assigned_to = $${params.length})`);
    } else if (employeeId) {
      params.push(employeeId);
      conditions.push(`w.employee_id = $${params.length}`);
    }

    if (leadId) {
      params.push(leadId);
      conditions.push(`w.lead_id = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        w.id,
        w.lead_id,
        w.employee_id,
        w.recipient_phone,
        w.template_name,
        w.message_text,
        w.status,
        w.provider_message_id,
        w.created_at,
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
      FROM public.whatsapp_messages w
      LEFT JOIN public.leads l ON w.lead_id = l.id
      LEFT JOIN public.employees e ON w.employee_id = e.id
      LEFT JOIN public.profiles p ON e.user_id = p.id
      ${whereClause}
      ORDER BY w.created_at DESC
    `;

    const rows = await query<WhatsAppMessage>(sql, params);

    return NextResponse.json({ messages: rows });
  } catch (err: unknown) {
    console.error('Error fetching WhatsApp messages:', err);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
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
      template_name = 'custom',
      message_text,
      recipient_phone,
    } = body;

    const targetLeadId = lead_id || leadId;
    if (!targetLeadId) {
      return NextResponse.json({ error: 'lead_id is required' }, { status: 400 });
    }
    if (!message_text || !message_text.trim()) {
      return NextResponse.json({ error: 'message_text is required' }, { status: 400 });
    }

    let targetEmployeeId = auth.employeeId;
    if (!targetEmployeeId && auth.isAdmin) {
      const fallbackEmp = await query<{ id: string }>(
        'SELECT id FROM public.employees WHERE is_active = true ORDER BY created_at ASC LIMIT 1'
      );
      targetEmployeeId = fallbackEmp[0]?.id || null;
    }
    if (!targetEmployeeId) {
      return NextResponse.json({ error: 'Active employee profile required' }, { status: 400 });
    }

    // Verify lead
    const leadRows = await query<{ full_name: string; phone: string }>(
      'SELECT full_name, phone FROM public.leads WHERE id = $1',
      [targetLeadId]
    );
    if (leadRows.length === 0) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const lead = leadRows[0];
    const finalPhone = cleanPhoneForWhatsApp(recipient_phone || lead.phone);

    // Check if WhatsApp Business API keys exist
    const hasBusinessApi = !!(
      process.env.WHATSAPP_BUSINESS_API_KEY &&
      process.env.WHATSAPP_PHONE_NUMBER_ID
    );

    let providerMessageId: string | null = null;
    let messageStatus = 'sent_via_wa_me';

    if (body.trigger_auto_api) {
      if (!hasBusinessApi) {
        return NextResponse.json(
          {
            error:
              'Automated background WhatsApp sending requires Meta WhatsApp Business Cloud API keys (WHATSAPP_BUSINESS_API_KEY, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_BUSINESS_ACCOUNT_ID). Direct messaging works via instant wa.me link generation.',
          },
          { status: 501 }
        );
      }
    }

    // Generate wa.me deep link
    const waMeUrl = `https://wa.me/${finalPhone}?text=${encodeURIComponent(message_text.trim())}`;

    // Insert into database
    const insertSql = `
      INSERT INTO public.whatsapp_messages (
        lead_id,
        employee_id,
        recipient_phone,
        template_name,
        message_text,
        status,
        provider_message_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const insertedRows = await query<WhatsAppMessage>(insertSql, [
      targetLeadId,
      targetEmployeeId,
      finalPhone,
      template_name,
      message_text.trim(),
      messageStatus,
      providerCallIdFallback(providerMessageId),
    ]);

    const message = insertedRows[0];

    // Log to Lead History timeline
    const templateLabel = (template_name || 'custom').replace('_', ' ').toUpperCase();
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
        'note',
        `WhatsApp Sent [${templateLabel}]`,
        message_text.trim(),
        JSON.stringify({
          whatsapp_message_id: message.id,
          template: template_name,
          phone: finalPhone,
        }),
      ]
    );

    return NextResponse.json({
      success: true,
      message,
      waMeUrl,
      hasBusinessApi,
    });
  } catch (err: unknown) {
    console.error('Error recording WhatsApp message:', err);
    return NextResponse.json({ error: 'Failed to record WhatsApp message' }, { status: 500 });
  }
}

function providerCallIdFallback(val: string | null): string | null {
  return val;
}
