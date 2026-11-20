import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';
import { query } from '@/lib/db';
import { Profile, Employee } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let userId: string | null = null;
    let userEmail: string | null = null;

    // 1. Check local session cookie
    const localSession = await getSession();
    if (localSession?.userId) {
      userId = localSession.userId;
      userEmail = localSession.email;
    }

    // 2. Fallback to Supabase if local session not present
    if (!userId) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
        try {
          const supabase = await createClient();
          const { data } = await supabase.auth.getUser();
          if (data.user) {
            userId = data.user.id;
            userEmail = data.user.email || null;
          }
        } catch {
          // ignore
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch profile and employee
    let profile: Profile | null = null;
    let employee: Employee | null = null;

    try {
      const profiles = await query<Profile>(
        `SELECT id, full_name, phone, role, is_active, created_at, updated_at
         FROM public.profiles
         WHERE id = $1`,
        [userId]
      );
      profile = profiles[0] || null;

      const employees = await query<Employee>(
        `SELECT id, user_id, designation, joining_date, permissions, manager_id, is_active, created_at, updated_at
         FROM public.employees
         WHERE user_id = $1`,
        [userId]
      );
      employee = employees[0] || null;
    } catch {
      // Fallback to Supabase client query
      const supabase = await createClient();
      const pRes = await supabase.from('profiles').select('*').eq('id', userId).single();
      profile = pRes.data || null;
      const eRes = await supabase.from('employees').select('*').eq('user_id', userId).maybeSingle();
      employee = eRes.data || null;
    }

    return NextResponse.json({
      user: {
        id: userId,
        email: userEmail,
      },
      profile,
      employee,
      role: profile?.role || 'employee',
      isAdmin: profile?.role === 'admin' || profile?.role === 'super_admin',
    });
  } catch (err: unknown) {
    console.error('Auth /me error:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve current user' },
      { status: 500 }
    );
  }
}
