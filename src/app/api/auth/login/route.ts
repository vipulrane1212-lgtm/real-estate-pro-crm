import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { query } from '@/lib/db';
import { setSession } from '@/lib/auth/session';
import { Profile } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const hasDatabaseUrl = !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    // 1. If DATABASE_URL is set (Local Postgres / Docker Postgres), authenticate directly
    if (hasDatabaseUrl) {
      try {
        const users = await query<{
          id: string;
          email: string;
          password_matches: boolean;
        }>(
          `SELECT id, email, (encrypted_password = crypt($1, encrypted_password)) AS password_matches
           FROM auth.users
           WHERE email = $2`,
          [password, email.toLowerCase().trim()]
        );

        if (users.length && users[0].password_matches) {
          const userId = users[0].id;

          const profiles = await query<Profile>(
            `SELECT id, full_name, phone, role, is_active, created_at, updated_at
             FROM public.profiles
             WHERE id = $1`,
            [userId]
          );

          const profile = profiles[0] || null;

          if (profile && !profile.is_active) {
            return NextResponse.json(
              { error: 'Account has been deactivated. Please contact your administrator.' },
              { status: 403 }
            );
          }

          const role = profile?.role || 'employee';

          await setSession({
            userId,
            email: users[0].email,
            role,
          });

          return NextResponse.json({
            success: true,
            user: {
              id: userId,
              email: users[0].email,
              profile,
            },
          });
        } else {
          return NextResponse.json(
            { error: 'Invalid email or password' },
            { status: 401 }
          );
        }
      } catch (dbErr) {
        console.error('Local DB auth error:', dbErr);
      }
    }

    // 2. Fallback to Supabase Auth (Cloud / Supabase CLI)
    if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
      try {
        const supabase = await createClient();
        const { data: authData, error: authError } =
          await supabase.auth.signInWithPassword({ email, password });

        if (!authError && authData.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();

          if (profile && !profile.is_active) {
            await supabase.auth.signOut();
            return NextResponse.json(
              { error: 'Account has been deactivated. Please contact your administrator.' },
              { status: 403 }
            );
          }

          if (profile) {
            await setSession({
              userId: authData.user.id,
              email: authData.user.email || email,
              role: profile.role,
            });
          }

          return NextResponse.json({
            success: true,
            user: {
              id: authData.user.id,
              email: authData.user.email,
              profile: profile || null,
            },
          });
        } else if (authError) {
          return NextResponse.json(
            { error: authError.message || 'Invalid credentials' },
            { status: 401 }
          );
        }
      } catch (supaErr) {
        console.error('Supabase auth attempt error:', supaErr);
      }
    }

    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    );
  } catch (err: unknown) {
    console.error('Login API error:', err);
    return NextResponse.json(
      { error: 'An unexpected authentication error occurred' },
      { status: 500 }
    );
  }
}
