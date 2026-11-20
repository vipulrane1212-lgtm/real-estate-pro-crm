import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verify session
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
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      isActive,
      designation,
      permissions,
      managerId,
      fullName,
      phone,
      role,
    } = body;

    const adminSupabase = createAdminClient();

    // First fetch employee to know the user_id
    const { data: existingEmployee, error: findError } = await adminSupabase
      .from('employees')
      .select('user_id')
      .eq('id', id)
      .single();

    if (findError || !existingEmployee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Build update object for employees
    const employeeUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof isActive === 'boolean') {
      employeeUpdates.is_active = isActive;
    }
    if (designation !== undefined) {
      employeeUpdates.designation = designation;
    }
    if (permissions !== undefined) {
      employeeUpdates.permissions = permissions;
    }
    if (managerId !== undefined) {
      employeeUpdates.manager_id = managerId || null;
    }

    const { data: updatedEmployee, error: updateEmpError } = await adminSupabase
      .from('employees')
      .update(employeeUpdates)
      .eq('id', id)
      .select(`
        id,
        user_id,
        designation,
        joining_date,
        permissions,
        manager_id,
        is_active,
        created_at,
        updated_at,
        profile:profiles(id, full_name, phone, role, is_active)
      `)
      .single();

    if (updateEmpError) {
      return NextResponse.json(
        { error: updateEmpError.message },
        { status: 400 }
      );
    }

    // If profile fields were supplied or active status changed, update profile as well
    const profileUpdates: Record<string, unknown> = {};
    if (typeof isActive === 'boolean') {
      profileUpdates.is_active = isActive;
    }
    if (fullName !== undefined) {
      profileUpdates.full_name = fullName;
    }
    if (phone !== undefined) {
      profileUpdates.phone = phone;
    }
    if (role !== undefined) {
      profileUpdates.role = role;
    }

    if (Object.keys(profileUpdates).length > 0) {
      await adminSupabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', existingEmployee.user_id);
    }

    return NextResponse.json({
      success: true,
      employee: updatedEmployee,
    });
  } catch (err: unknown) {
    console.error('Employee PATCH error:', err);
    return NextResponse.json(
      { error: 'Failed to update employee' },
      { status: 500 }
    );
  }
}
