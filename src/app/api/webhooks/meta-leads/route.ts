import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { query } from '@/lib/db';
import { findDuplicateLead, normalizePhone } from '@/lib/leads/duplicate-check';

export const dynamic = 'force-dynamic';

// GET Handshake for Meta Webhook Verification
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.META_VERIFY_TOKEN;

  if (!verifyToken) {
    return new NextResponse('Meta webhook verify token not configured in environment', { status: 400 });
  }

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[Meta Webhook] Handshake verified successfully.');
    return new NextResponse(challenge || '', { status: 200 });
  }

  return new NextResponse('Forbidden: Invalid verification token', { status: 403 });
}

// POST Webhook Receiver for Meta Lead Ads (Facebook & Instagram)
export async function POST(request: Request) {
  try {
    const appSecret = process.env.META_APP_SECRET;
    const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN;

    if (!appSecret || !pageAccessToken) {
      return NextResponse.json(
        {
          error: 'Not connected — needs Diksha\'s Facebook Page + Meta business verification',
          missing_env: [
            !appSecret ? 'META_APP_SECRET' : null,
            !pageAccessToken ? 'META_PAGE_ACCESS_TOKEN' : null,
          ].filter(Boolean),
        },
        { status: 400 }
      );
    }

    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    // Verify HMAC SHA256 Signature
    if (signature) {
      const expectedSignature = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
      const sigBuffer = Buffer.from(signature);
      const expBuffer = Buffer.from(expectedSignature);

      if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
        console.warn('[Meta Webhook] Invalid signature rejected.');
        return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
      }
    } else {
      console.warn('[Meta Webhook] Missing x-hub-signature-256 header.');
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
    }

    // Process leadgen changes
    const entries = Array.isArray(payload.entry) ? payload.entry : [];
    let processedCount = 0;

    for (const entry of entries) {
      const changes = Array.isArray(entry.changes) ? entry.changes : [];
      for (const change of changes) {
        if (change.field === 'leadgen' && change.value) {
          const leadgenId = change.value.leadgen_id;
          const formId = change.value.form_id;

          // Fetch full lead payload from Meta Graph API
          try {
            const graphRes = await fetch(
              `https://graph.facebook.com/v19.0/${leadgenId}?access_token=${pageAccessToken}`
            );

            if (graphRes.ok) {
              const leadData = await graphRes.json();
              const fieldData = Array.isArray(leadData.field_data) ? leadData.field_data : [];

              let fullName = 'Meta Lead';
              let rawPhone = '';
              let email: string | null = null;

              for (const f of fieldData) {
                const fName = String(f.name || '').toLowerCase();
                const fVal = Array.isArray(f.values) && f.values.length > 0 ? f.values[0] : '';
                if (fName.includes('name') || fName.includes('full_name')) {
                  fullName = fVal || fullName;
                } else if (fName.includes('phone') || fName.includes('mobile')) {
                  rawPhone = fVal || rawPhone;
                } else if (fName.includes('email')) {
                  email = fVal || null;
                }
              }

              if (rawPhone) {
                const { normalized } = normalizePhone(rawPhone);
                const duplicate = await findDuplicateLead(rawPhone);

                if (duplicate) {
                  console.warn(`[Meta Webhook] Duplicate phone detected: ${rawPhone}. Flagging for agent review.`);
                }

                // Insert into public.leads
                const inserted = await query<{ id: string }>(
                  `INSERT INTO public.leads (
                    full_name,
                    phone,
                    email,
                    source,
                    source_detail,
                    lead_type,
                    status,
                    remarks
                  ) VALUES ($1, $2, $3, 'meta_ads', $4, 'buy', 'new', $5)
                  RETURNING id`,
                  [
                    fullName,
                    normalized || rawPhone,
                    email,
                    `Meta Lead Ad Form #${formId || leadgenId}`,
                    duplicate
                      ? `[DUPLICATE WARNING] Matches existing lead #${duplicate.lead_number} (${duplicate.full_name})`
                      : 'Received via Meta Graph Webhook',
                  ]
                );

                if (inserted[0]?.id) {
                  processedCount++;
                  await query(
                    `INSERT INTO public.lead_history (lead_id, actor_name, action_type, title, description, details)
                     VALUES ($1, 'Meta Ads Webhook', 'created', 'Meta Lead Received', $2, $3)`,
                    [
                      inserted[0].id,
                      `Lead automatically ingested from Meta Lead Ads (Form ID: ${formId || leadgenId}).`,
                      JSON.stringify({ leadgen_id: leadgenId, form_id: formId, is_duplicate: Boolean(duplicate) }),
                    ]
                  );
                }
              }
            }
          } catch (graphErr) {
            console.error('[Meta Webhook] Failed to fetch lead from Graph API:', graphErr);
          }
        }
      }
    }

    return NextResponse.json({ status: 'success', processed: processedCount });
  } catch (err: unknown) {
    console.error('Meta Webhook error:', err);
    return NextResponse.json({ error: 'Internal webhook processing error' }, { status: 500 });
  }
}
