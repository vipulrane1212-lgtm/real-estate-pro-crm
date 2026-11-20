import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import { findDuplicateLead, normalizePhone } from '@/lib/leads/duplicate-check';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiId = process.env.HOUSING_API_ID;
    const apiKey = process.env.HOUSING_API_KEY;

    if (!apiId || !apiKey) {
      return NextResponse.json(
        {
          connected: false,
          error: 'Not connected — ask your Housing.com manager to enable API access for your account',
          missing_env: [
            !apiId ? 'HOUSING_API_ID' : null,
            !apiKey ? 'HOUSING_API_KEY' : null,
          ].filter(Boolean),
        },
        { status: 400 }
      );
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = crypto.createHmac('sha256', apiKey).update(timestamp).digest('hex');

    const url = `https://leads.housing.com/api/v0/get_builder_leads?id=${encodeURIComponent(apiId)}&timestamp=${timestamp}&hash=${signature}`;

    let newLeadsCount = 0;
    let duplicateCount = 0;

    try {
      const resp = await fetch(url, { method: 'GET' });
      if (!resp.ok) {
        throw new Error(`Housing API responded with HTTP ${resp.status}`);
      }

      const data = await resp.json();
      const leadsList = Array.isArray(data.leads) ? data.leads : [];

      for (const item of leadsList) {
        const rawPhone = item.phone || item.mobile || '';
        const name = item.name || item.lead_name || 'Housing Lead';
        const project = item.project_name || 'Housing.com Portal';

        if (rawPhone) {
          const { normalized } = normalizePhone(rawPhone);
          const duplicate = await findDuplicateLead(rawPhone);

          if (duplicate) {
            duplicateCount++;
            continue; // Dedupe by phone
          }

          const inserted = await query<{ id: string }>(
            `INSERT INTO public.leads (
              full_name,
              phone,
              email,
              source,
              source_detail,
              lead_type,
              status,
              requirement,
              remarks
            ) VALUES ($1, $2, $3, 'housing', $4, 'buy', 'new', $5, 'Imported from Housing.com API')
            RETURNING id`,
            [
              name,
              normalized || rawPhone,
              item.email || null,
              `Housing.com - ${project}`,
              item.requirement || 'Residential Property',
            ]
          );

          if (inserted[0]?.id) {
            newLeadsCount++;
            await query(
              `INSERT INTO public.lead_history (lead_id, actor_name, action_type, title, description)
               VALUES ($1, 'Housing.com Poller', 'created', 'Lead Synced from Housing.com', $2)`,
              [inserted[0].id, `Ingested from Housing.com builder lead sync for ${project}.`]
            );
          }
        }
      }

      // Update integration_configs record
      await query(
        `UPDATE public.integration_configs
         SET is_connected = true, last_sync_at = now(), last_error = null, updated_at = now()
         WHERE provider = 'housing'`
      );

      return NextResponse.json({
        success: true,
        connected: true,
        syncedCount: newLeadsCount,
        duplicatesSkipped: duplicateCount,
        timestamp: new Date().toISOString(),
      });
    } catch (apiErr) {
      const errMsg = apiErr instanceof Error ? apiErr.message : 'Housing API network error';
      await query(
        `UPDATE public.integration_configs
         SET last_error = $1, updated_at = now()
         WHERE provider = 'housing'`,
        [errMsg]
      );
      throw apiErr;
    }
  } catch (err: unknown) {
    console.error('Error during Housing.com lead sync:', err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Housing.com sync failed',
        connected: Boolean(process.env.HOUSING_API_ID && process.env.HOUSING_API_KEY),
      },
      { status: 500 }
    );
  }
}
