import { getSession } from './session';
import { createClient } from '@/lib/supabase/server';
import { query } from '@/lib/db';

export interface AuthContext {
  userId: string;
  email: string;
  role: 'super_admin' | 'admin' | 'employee';
  employeeId: string | null;
  employeeName: string;
  isAdmin: boolean;
}

export async function getAuthContext(): Promise<AuthContext | null> {
  // 1. Check local session cookie first
  const localSession = await getSession();
  let userId = localSession?.userId;
  let email = localSession?.email || '';
  let role = localSession?.role;

  // 2. Fall back to Supabase auth if not in local session
  if (!userId) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        userId = data.user.id;
        email = data.user.email || '';
        const { data: p } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();
        role = p?.role;
      }
    } catch {
      // ignore
    }
  }

  if (!userId || !role) {
    return null;
  }

  // 3. Resolve profile & employee ID
  let employeeId: string | null = null;
  let employeeName = email;

  try {
    const profRows = await query<{ full_name: string }>(
      'SELECT full_name FROM public.profiles WHERE id = $1 LIMIT 1',
      [userId]
    );
    if (profRows[0]?.full_name) {
      employeeName = profRows[0].full_name;
    }

    const empRows = await query<{ id: string }>(
      'SELECT id FROM public.employees WHERE user_id = $1 LIMIT 1',
      [userId]
    );
    if (empRows[0]?.id) {
      employeeId = empRows[0].id;
    }
  } catch (err) {
    console.error('Error resolving auth context profile/employee:', err);
  }

  const isAdmin = role === 'super_admin' || role === 'admin';

  return {
    userId,
    email,
    role,
    employeeId,
    employeeName,
    isAdmin,
  };
}
