import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: settings, error } = await supabase
      .from('company_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Company settings fetch error:', error);
    }

    if (!settings) {
      // Return default fallback structure if database row isn't created yet
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
    }

    return NextResponse.json({ settings });
  } catch (err: unknown) {
    console.error('Company settings GET error:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve company settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!callerProfile || !['super_admin', 'admin'].includes(callerProfile.role)) {
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

    const adminSupabase = createAdminClient();

    // Check if an existing row is present
    const { data: existing } = await adminSupabase
      .from('company_settings')
      .select('id')
      .limit(1)
      .maybeSingle();

    let result;

    if (existing?.id) {
      result = await adminSupabase
        .from('company_settings')
        .update({
          company_name: companyName,
          logo_url: logoUrl,
          phone,
          whatsapp_number: whatsappNumber,
          address,
          email,
          website,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      result = await adminSupabase
        .from('company_settings')
        .insert({
          company_name: companyName || 'Diksha Real Estate',
          logo_url: logoUrl,
          phone,
          whatsapp_number: whatsappNumber,
          address,
          email,
          website,
        })
        .select()
        .single();
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      settings: result.data,
    });
  } catch (err: unknown) {
    console.error('Company settings PUT error:', err);
    return NextResponse.json(
      { error: 'Failed to update company settings' },
      { status: 500 }
    );
  }
}
