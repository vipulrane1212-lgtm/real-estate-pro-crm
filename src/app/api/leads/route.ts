import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import { Lead } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';
    const location = searchParams.get('location') || '';
    const assignedTo = searchParams.get('assigned_to') || '';

    const conditions: string[] = [];
    const params: unknown[] = [];

    // Role-based access control: Employee only sees their assigned leads
    if (!auth.isAdmin) {
      if (!auth.employeeId) {
        return NextResponse.json({ leads: [] });
      }
      params.push(auth.employeeId);
      conditions.push(`l.assigned_to = $${params.length}`);
    } else if (assignedTo) {
      params.push(assignedTo);
      conditions.push(`l.assigned_to = $${params.length}`);
    }

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`l.status = $${params.length}`);
    }

    if (type && type !== 'all') {
      params.push(type);
      conditions.push(`l.lead_type = $${params.length}`);
    }

    if (location && location !== 'all') {
      params.push(`%${location}%`);
      conditions.push(`(l.location ILIKE $${params.length} OR l.preferred_location ILIKE $${params.length})`);
    }

    if (search) {
      params.push(`%${search}%`);
      const searchIndex = params.length;
      conditions.push(
        `(l.full_name ILIKE $${searchIndex} OR l.phone ILIKE $${searchIndex} OR l.email ILIKE $${searchIndex} OR l.location ILIKE $${searchIndex} OR l.requirement ILIKE $${searchIndex})`
      );
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        l.id,
        l.lead_number,
        l.full_name,
        l.email,
        l.phone,
        l.alternate_phone,
        l.status,
        l.source,
        l.lead_type,
        l.budget_min,
        l.budget_max,
        l.property_type,
        COALESCE(l.location, l.preferred_location) as location,
        l.preferred_location,
        l.requirement,
        l.remarks,
        l.assigned_to,
        l.created_by,
        l.created_at,
        l.updated_at,
        json_build_object(
          'id', e.id,
          'designation', e.designation,
          'profile', json_build_object(
            'full_name', p.full_name,
            'phone', p.phone
          )
        ) as assigned_employee
      FROM public.leads l
      LEFT JOIN public.employees e ON l.assigned_to = e.id
      LEFT JOIN public.profiles p ON e.user_id = p.id
      ${whereClause}
      ORDER BY l.created_at DESC
    `;

    const rows = await query<Lead>(sql, params);

    // Clean up empty assigned_employee json if unassigned
    const leads = rows.map((row) => ({
      ...row,
      budget_min: row.budget_min ? Number(row.budget_min) : null,
      budget_max: row.budget_max ? Number(row.budget_max) : null,
      assigned_employee: row.assigned_to ? row.assigned_employee : null,
    }));

    return NextResponse.json({ leads });
  } catch (err: unknown) {
    console.error('Error fetching leads:', err);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      full_name,
      phone,
      email,
      alternate_phone,
      lead_type = 'buy',
      status = 'new',
      source = 'website',
      budget_min,
      budget_max,
      property_type,
      location,
      requirement,
      remarks,
      assigned_to,
    } = body;

    // Validation
    if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
      return NextResponse.json({ error: 'Client name is required' }, { status: 400 });
    }

    if (!phone || typeof phone !== 'string' || !phone.trim() || phone.trim().length < 7) {
      return NextResponse.json({ error: 'A valid mobile number is required' }, { status: 400 });
    }

    // Determine assigned employee
    let targetAssignedTo = assigned_to || null;
    if (!auth.isAdmin && !targetAssignedTo) {
      targetAssignedTo = auth.employeeId;
    }

    const insertSql = `
      INSERT INTO public.leads (
        full_name,
        email,
        phone,
        alternate_phone,
        lead_type,
        status,
        source,
        budget_min,
        budget_max,
        property_type,
        location,
        preferred_location,
        requirement,
        remarks,
        assigned_to,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const inserted = await query<Lead>(insertSql, [
      full_name.trim(),
      email?.trim() || null,
      phone.trim(),
      alternate_phone?.trim() || null,
      lead_type || 'buy',
      status || 'new',
      source || 'website',
      budget_min ? Number(budget_min) : null,
      budget_max ? Number(budget_max) : null,
      property_type || null,
      location?.trim() || null,
      location?.trim() || null,
      requirement?.trim() || null,
      remarks?.trim() || null,
      targetAssignedTo,
      auth.userId,
    ]);

    const lead = inserted[0];

    // Log to lead_history
    if (lead) {
      await query(
        `INSERT INTO public.lead_history (lead_id, actor_id, actor_name, action_type, title, description, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          lead.id,
          auth.userId,
          auth.employeeName,
          'created',
          'Lead Created',
          `New enquiry registered for ${lead.full_name} (${lead.phone}) with status '${lead.status}'.`,
          JSON.stringify({ lead_type, status, source, budget_min, budget_max, location }),
        ]
      );
    }

    return NextResponse.json({ lead }, { status: 201 });
  } catch (err: unknown) {
    console.error('Error creating lead:', err);
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
  }
}
