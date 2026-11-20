import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { query } from '@/lib/db';
import { CompanySettings } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    try {
      const rows = await query<CompanySettings>(
        'SELECT * FROM public.company_settings ORDER BY created_at ASC LIMIT 1'
      );
      if (rows.length) {
        return NextResponse.json({ settings: rows[0] });
      }
    } catch {
      // Supabase fallback
      const supabase = await createClient();
      const { data } = await supabase.from('company_settings').select('*').limit(1).maybeSingle();
      if (data) {
        return NextResponse.json({ settings: data });
      }
    }

    return NextResponse.json({
      settings: {
        id: 'default',
        company_name: 'Diksha Real Estate',
        logo_url: null,
        phone: '+91 98765 43210',
        whatsapp_number: '+91 98765 43210',
        address: 'Level 8, Supreme Chambers, Andheri West, Mumbai, Maharashtra 400053',
        email: 'info@diksharealestate.com',
        website: 'https://diksharealestate.com',
      },
    });
  } catch (err: unknown) {
    console.error('Company settings GET error:', err);
    return NextResponse.json({ error: 'Failed to retrieve company settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    let role = session?.role;

    if (!role) {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const { data: p } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
        role = p?.role;
      }
    }

    if (!role || !['super_admin', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required to update company profile' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      companyName,
      logoUrl,
      phone,
      whatsappNumber,
      address,
      email,
      website,
    } = body;

    try {
      const rows = await query<CompanySettings>(
        `UPDATE public.company_settings
         SET company_name = COALESCE($1, company_name),
             logo_url = $2,
             phone = $3,
             whatsapp_number = $4,
             address = $5,
             email = $6,
             website = $7,
             updated_at = now()
         WHERE id = (SELECT id FROM public.company_settings LIMIT 1)
         RETURNING *`,
        [companyName, logoUrl || null, phone || null, whatsappNumber || null, address || null, email || null, website || null]
      );

      if (rows.length) {
        return NextResponse.json({ success: true, settings: rows[0] });
      }
    } catch (dbErr) {
      console.error('Postgres company settings update error:', dbErr);
    }

    return NextResponse.json({ success: true, settings: body });
  } catch (err: unknown) {
    console.error('Company settings PUT error:', err);
    return NextResponse.json({ error: 'Failed to update company settings' }, { status: 500 });
  }
}
