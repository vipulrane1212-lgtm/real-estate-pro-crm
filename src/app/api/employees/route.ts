import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { query } from '@/lib/db';
import { Employee, Profile } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

const DEFAULT_PERMISSIONS = {
  leads: { view: true, create: true, edit: true, delete: false },
  properties: { view: true, create: false, edit: false, delete: false },
  follow_ups: { view: true, create: true, edit: true, delete: false },
  site_visits: { view: true, create: true, edit: true, delete: false },
  documents: { view: true, create: true, edit: false, delete: false },
  calls: { view: true, create: true, edit: false, delete: false },
  accounts: { view: false, create: false, edit: false, delete: false },
  reports: { view: false, create: false, edit: false, delete: false },
};

export async function GET() {
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
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch employees with profile
    try {
      const rows = await query<
        Employee & {
          profile_id: string;
          profile_name: string;
          profile_phone: string | null;
          profile_role: Profile['role'];
          profile_is_active: boolean;
        }
      >(`
        SELECT 
          e.id,
          e.user_id,
          e.designation,
          e.joining_date::text,
          e.permissions,
          e.manager_id,
          e.is_active,
          e.created_at,
          e.updated_at,
          p.id as profile_id,
          p.full_name as profile_name,
          p.phone as profile_phone,
          p.role as profile_role,
          p.is_active as profile_is_active
        FROM public.employees e
        LEFT JOIN public.profiles p ON e.user_id = p.id
        ORDER BY e.created_at DESC
      `);

      const employees: Employee[] = rows.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        designation: r.designation,
        joining_date: r.joining_date,
        permissions: r.permissions,
        manager_id: r.manager_id,
        is_active: r.is_active,
        created_at: r.created_at,
        updated_at: r.updated_at,
        profile: {
          id: r.profile_id,
          full_name: r.profile_name,
          phone: r.profile_phone,
          role: r.profile_role,
          is_active: r.profile_is_active,
          created_at: r.created_at,
          updated_at: r.updated_at,
        },
      }));

      return NextResponse.json({ employees });
    } catch {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('employees')
        .select(`*, profile:profiles(*)`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return NextResponse.json({ employees: data || [] });
    }
  } catch (err: unknown) {
    console.error('Employees GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      email,
      password,
      fullName,
      phone,
      designation,
      joiningDate,
      managerId,
      permissions,
      role: empRole = 'employee',
    } = body;

    if (!email || !password || !fullName || !designation) {
      return NextResponse.json(
        { error: 'Email, password, full name, and designation are required' },
        { status: 400 }
      );
    }

    // Insert user into local Postgres auth.users, profiles, and employees
    try {
      const userRes = await query<{ id: string }>(
        `INSERT INTO auth.users (email, encrypted_password, raw_user_meta_data)
         VALUES ($1, crypt($2, gen_salt('bf')), $3)
         ON CONFLICT (email) DO UPDATE SET encrypted_password = crypt($2, gen_salt('bf'))
         RETURNING id`,
        [
          email.toLowerCase().trim(),
          password,
          JSON.stringify({ full_name: fullName, phone, role: empRole }),
        ]
      );

      const newUserId = userRes[0].id;

      await query(
        `INSERT INTO public.profiles (id, full_name, phone, role, is_active)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (id) DO UPDATE SET full_name = $2, phone = $3, role = $4, is_active = true`,
        [newUserId, fullName, phone || null, empRole]
      );

      const empRes = await query<Employee>(
        `INSERT INTO public.employees (user_id, designation, joining_date, manager_id, permissions, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         RETURNING *`,
        [
          newUserId,
          designation,
          joiningDate || new Date().toISOString().split('T')[0],
          managerId || null,
          JSON.stringify(permissions || DEFAULT_PERMISSIONS),
        ]
      );

      const newEmployee = empRes[0];
      newEmployee.profile = {
        id: newUserId,
        full_name: fullName,
        phone: phone || null,
        role: empRole,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return NextResponse.json({ success: true, employee: newEmployee });
    } catch (err: unknown) {
      console.error('Error creating employee in Postgres:', err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Database error creating employee' },
        { status: 400 }
      );
    }
  } catch (err: unknown) {
    console.error('Employees POST error:', err);
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
  }
}
