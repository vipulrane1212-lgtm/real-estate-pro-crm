import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { query } from '@/lib/db';
import { Employee } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
    const { isActive, is_active, designation, permissions, managerId } = body;
    const activeVal = typeof isActive === 'boolean' ? isActive : (typeof is_active === 'boolean' ? is_active : undefined);

    // Fetch existing employee to get user_id
    const existing = await query<Employee>('SELECT * FROM public.employees WHERE id = $1', [id]);
    if (!existing.length) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const emp = existing[0];
    const newActive = typeof activeVal === 'boolean' ? activeVal : emp.is_active;
    const newDesignation = designation !== undefined ? designation : emp.designation;
    const newPermissions = permissions !== undefined ? JSON.stringify(permissions) : JSON.stringify(emp.permissions);
    const newManager = managerId !== undefined ? managerId : emp.manager_id;

    // Update employees table
    const updated = await query<Employee>(
      `UPDATE public.employees
       SET is_active = $1, designation = $2, permissions = $3, manager_id = $4, updated_at = now()
       WHERE id = $5
       RETURNING *`,
      [newActive, newDesignation, newPermissions, newManager, id]
    );

    // Sync is_active to profiles
    if (typeof activeVal === 'boolean') {
      await query('UPDATE public.profiles SET is_active = $1, updated_at = now() WHERE id = $2', [
        activeVal,
        emp.user_id,
      ]);
    }

    return NextResponse.json({ success: true, employee: updated[0] });
  } catch (err: unknown) {
    console.error('Employee PATCH error:', err);
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
  }
}
