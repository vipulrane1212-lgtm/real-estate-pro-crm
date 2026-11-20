import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!auth.isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Query DB configs if any
    const dbConfigs = await query<{
      provider: string;
      is_connected: boolean;
      last_sync_at: string | null;
      last_error: string | null;
    }>('SELECT provider, is_connected, last_sync_at, last_error FROM public.integration_configs');

    const configMap: Record<string, { last_sync_at: string | null; last_error: string | null }> = {};
    dbConfigs.forEach((c) => {
      configMap[c.provider] = { last_sync_at: c.last_sync_at, last_error: c.last_error };
    });

    const isMetaConnected = Boolean(
      process.env.META_APP_SECRET &&
      process.env.META_PAGE_ACCESS_TOKEN &&
      process.env.META_VERIFY_TOKEN
    );

    const isHousingConnected = Boolean(
      process.env.HOUSING_API_ID && process.env.HOUSING_API_KEY
    );

    const integrations = [
      {
        id: 'meta_lead_ads',
        name: 'Meta Lead Ads (Facebook & Instagram)',
        category: 'Social Ads',
        connected: isMetaConnected,
        codeReady: true,
        webhookUrl: 'http://localhost:3000/api/webhooks/meta-leads',
        requiredEnv: ['META_APP_SECRET', 'META_PAGE_ACCESS_TOKEN', 'META_VERIFY_TOKEN'],
        requirementNotice: "Needs Diksha's Facebook Page + Meta business verification",
        lastSync: configMap['meta_lead_ads']?.last_sync_at || null,
        lastError: configMap['meta_lead_ads']?.last_error || null,
      },
      {
        id: 'housing',
        name: 'Housing.com Builder Lead API',
        category: 'Property Portals',
        connected: isHousingConnected,
        codeReady: true,
        webhookUrl: 'http://localhost:3000/api/integrations/housing/sync',
        requiredEnv: ['HOUSING_API_ID', 'HOUSING_API_KEY'],
        requirementNotice: 'Ask your Housing.com manager to enable API access for your account',
        lastSync: configMap['housing']?.last_sync_at || null,
        lastError: configMap['housing']?.last_error || null,
      },
      {
        id: 'google_ads',
        name: 'Google Ads Lead Forms',
        category: 'Search & Display',
        connected: false,
        codeReady: false,
        comingNext: true,
        webhookUrl: 'http://localhost:3000/api/webhooks/google-leads',
        requiredEnv: ['GOOGLE_ADS_WEBHOOK_KEY'],
        requirementNotice: 'Coming next — needs account setup and cloud deployment (webhooks cannot reach localhost)',
        lastSync: null,
        lastError: null,
      },
      {
        id: 'whatsapp_business',
        name: 'WhatsApp Business API Webhooks',
        category: 'Messaging',
        connected: false,
        codeReady: false,
        comingNext: true,
        webhookUrl: 'http://localhost:3000/api/webhooks/whatsapp',
        requiredEnv: ['WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_VERIFY_TOKEN'],
        requirementNotice: 'Coming next — needs Meta WhatsApp Business verification and cloud deployment',
        lastSync: null,
        lastError: null,
      },
      {
        id: 'instagram_dms',
        name: 'Instagram Direct Messages & Ads',
        category: 'Social Messaging',
        connected: false,
        codeReady: false,
        comingNext: true,
        webhookUrl: 'http://localhost:3000/api/webhooks/instagram',
        requiredEnv: ['INSTAGRAM_PAGE_ID', 'INSTAGRAM_ACCESS_TOKEN'],
        requirementNotice: 'Coming next — needs Meta Instagram Professional account linked to Facebook Business Page',
        lastSync: null,
        lastError: null,
      },
    ];

    return NextResponse.json({ integrations });
  } catch (err: unknown) {
    console.error('Error fetching integration status:', err);
    return NextResponse.json({ error: 'Failed to fetch integrations status' }, { status: 500 });
  }
}
