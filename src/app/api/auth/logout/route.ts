import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { clearSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await clearSession();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
      try {
        const supabase = await createClient();
        await supabase.auth.signOut();
      } catch {
        // Ignore fallback
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Logout API error:', err);
    return NextResponse.json(
      { error: 'Failed to sign out' },
      { status: 500 }
    );
  }
}
