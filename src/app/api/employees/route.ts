import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// Default permissions for new employees
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

    // Fetch employees with joined profiles
    const { data: employees, error: fetchError } = await supabase
      .from('employees')
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
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching employees:', fetchError);
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ employees: employees || [] });
  } catch (err: unknown) {
    console.error('Employees GET error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch employee roster' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      email,
      password,
      fullName,
      phone,
      designation,
      joiningDate,
      managerId,
      permissions,
      role = 'employee',
    } = body;

    if (!email || !password || !fullName || !designation) {
      return NextResponse.json(
        { error: 'Email, password, full name, and designation are required' },
        { status: 400 }
      );
    }

    // Create user in Supabase auth via Service Role Admin Client
    const adminSupabase = createAdminClient();

    const { data: newAuthUser, error: createAuthError } =
      await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          phone: phone || null,
          role,
        },
      });

    if (createAuthError || !newAuthUser.user) {
      return NextResponse.json(
        { error: createAuthError?.message || 'Failed to create authentication account' },
        { status: 400 }
      );
    }

    const newUserId = newAuthUser.user.id;

    // Ensure profile is upserted correctly
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .upsert({
        id: newUserId,
        full_name: fullName,
        phone: phone || null,
        role,
        is_active: true,
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
    }

    // Insert employee record
    const { data: newEmployee, error: employeeError } = await adminSupabase
      .from('employees')
      .insert({
        user_id: newUserId,
        designation,
        joining_date: joiningDate || new Date().toISOString().split('T')[0],
        manager_id: managerId || null,
        permissions: permissions || DEFAULT_PERMISSIONS,
        is_active: true,
      })
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

    if (employeeError) {
      console.error('Employee creation error:', employeeError);
      return NextResponse.json(
        { error: employeeError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      employee: newEmployee,
    });
  } catch (err: unknown) {
    console.error('Employees POST error:', err);
    return NextResponse.json(
      { error: 'An error occurred while creating employee' },
      { status: 500 }
    );
  }
}
