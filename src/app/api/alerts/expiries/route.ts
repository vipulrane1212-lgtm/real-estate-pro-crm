import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export interface ExpiryAlertItem {
  id: string;
  source: 'document' | 'deal';
  title: string;
  document_type?: string;
  client_name: string;
  property_title: string;
  expiry_date: string;
  days_remaining: number;
  is_expired: boolean;
  voice_trigger: boolean;
  spoken_text: string;
}

export async function GET() {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const items: ExpiryAlertItem[] = [];

    // 1. Documents expiring within 30 days or already expired
    const docSql = `
      SELECT 
        d.id,
        d.title,
        d.document_type,
        TO_CHAR(d.expiry_date, 'YYYY-MM-DD') as expiry_date,
        (d.expiry_date - CURRENT_DATE) as days_remaining,
        COALESCE(l.full_name, 'Client') as client_name,
        COALESCE(p.title, 'Property') as property_title
      FROM public.documents d
      LEFT JOIN public.leads l ON d.lead_id = l.id
      LEFT JOIN public.properties p ON d.property_id = p.id
      WHERE d.expiry_date IS NOT NULL
        AND d.expiry_date <= (CURRENT_DATE + INTERVAL '30 days')
      ORDER BY d.expiry_date ASC
      LIMIT 50
    `;

    const docRows = await query<{
      id: string;
      title: string;
      document_type: string;
      expiry_date: string;
      days_remaining: number;
      client_name: string;
      property_title: string;
    }>(docSql);

    for (const d of docRows) {
      const days = Number(d.days_remaining);
      const isExpired = days < 0;
      // Voice alert triggers at 7 days, 3 days, 1 day, and on the day (0)
      const voiceTrigger = [0, 1, 3, 7].includes(days);
      const daysText = days === 0 ? 'today' : days === 1 ? 'in 1 day' : `in ${days} days`;
      const spokenText = isExpired
        ? `Attention: ${d.title} for ${d.client_name} expired ${Math.abs(days)} days ago`
        : `Attention: ${d.title} for ${d.client_name} expires ${daysText}`;

      items.push({
        id: d.id,
        source: 'document',
        title: d.title,
        document_type: d.document_type,
        client_name: d.client_name,
        property_title: d.property_title,
        expiry_date: d.expiry_date,
        days_remaining: days,
        is_expired: isExpired,
        voice_trigger: voiceTrigger,
        spoken_text: spokenText,
      });
    }

    // 2. Deals / Rental Agreements with agreement_end_date
    const dealSql = `
      SELECT 
        dl.id,
        dl.deal_number,
        TO_CHAR(dl.agreement_end_date, 'YYYY-MM-DD') as expiry_date,
        (dl.agreement_end_date - CURRENT_DATE) as days_remaining,
        COALESCE(l.full_name, 'Client') as client_name,
        COALESCE(p.title, 'Property') as property_title
      FROM public.deals dl
      LEFT JOIN public.leads l ON dl.lead_id = l.id
      LEFT JOIN public.properties p ON dl.property_id = p.id
      WHERE dl.agreement_end_date IS NOT NULL
        AND dl.agreement_end_date <= (CURRENT_DATE + INTERVAL '30 days')
      ORDER BY dl.agreement_end_date ASC
      LIMIT 50
    `;

    const dealRows = await query<{
      id: string;
      deal_number: number;
      expiry_date: string;
      days_remaining: number;
      client_name: string;
      property_title: string;
    }>(dealSql);

    for (const dl of dealRows) {
      const days = Number(dl.days_remaining);
      const isExpired = days < 0;
      const voiceTrigger = [0, 1, 3, 7].includes(days);
      const daysText = days === 0 ? 'today' : days === 1 ? 'in 1 day' : `in ${days} days`;
      const spokenText = isExpired
        ? `Attention: Agreement for Deal ${dl.deal_number} with ${dl.client_name} expired ${Math.abs(days)} days ago`
        : `Attention: Agreement for Deal ${dl.deal_number} with ${dl.client_name} expires ${daysText}`;

      items.push({
        id: dl.id,
        source: 'deal',
        title: `Deal #${dl.deal_number} Agreement`,
        document_type: 'agreement',
        client_name: dl.client_name,
        property_title: dl.property_title,
        expiry_date: dl.expiry_date,
        days_remaining: days,
        is_expired: isExpired,
        voice_trigger: voiceTrigger,
        spoken_text: spokenText,
      });
    }

    // Sort all nearest expiry first
    items.sort((a, b) => a.days_remaining - b.days_remaining);

    const voiceAlerts = items.filter((item) => item.voice_trigger);

    return NextResponse.json({
      expiries: items,
      count: items.length,
      voiceAlerts,
    });
  } catch (err: unknown) {
    console.error('Error fetching expiry alerts:', err);
    return NextResponse.json({ error: 'Failed to fetch expiry alerts' }, { status: 500 });
  }
}
