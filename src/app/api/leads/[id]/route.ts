import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import { Lead } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

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
      WHERE l.id = $1
      LIMIT 1
    `;

    const rows = await query<Lead>(sql, [id]);
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const lead = rows[0];

    // Check permissions
    if (!auth.isAdmin && lead.assigned_to !== auth.employeeId) {
      return NextResponse.json({ error: 'Forbidden: Access to lead restricted' }, { status: 403 });
    }

    return NextResponse.json({
      lead: {
        ...lead,
        budget_min: lead.budget_min ? Number(lead.budget_min) : null,
        budget_max: lead.budget_max ? Number(lead.budget_max) : null,
        assigned_employee: lead.assigned_to ? lead.assigned_employee : null,
      },
    });
  } catch (err: unknown) {
    console.error('Error fetching lead details:', err);
    return NextResponse.json({ error: 'Failed to fetch lead' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch existing lead to detect changes
    const existingRows = await query<Lead>('SELECT * FROM public.leads WHERE id = $1', [id]);
    if (!existingRows || existingRows.length === 0) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const existing = existingRows[0];

    if (!auth.isAdmin && existing.assigned_to !== auth.employeeId) {
      return NextResponse.json({ error: 'Forbidden: Cannot edit unassigned lead' }, { status: 403 });
    }

    const body = await request.json();
    const {
      full_name = existing.full_name,
      phone = existing.phone,
      email = existing.email,
      alternate_phone = existing.alternate_phone,
      lead_type = existing.lead_type || 'buy',
      status = existing.status,
      source = existing.source,
      budget_min = existing.budget_min,
      budget_max = existing.budget_max,
      property_type = existing.property_type,
      location = existing.location || existing.preferred_location,
      requirement = existing.requirement,
      remarks = existing.remarks,
      assigned_to = existing.assigned_to,
    } = body;

    // Validation
    if (!full_name || !phone) {
      return NextResponse.json({ error: 'Name and phone cannot be empty' }, { status: 400 });
    }

    // Only admin can reassign leads to someone else
    let targetAssignedTo = assigned_to;
    if (!auth.isAdmin && assigned_to !== existing.assigned_to) {
      targetAssignedTo = existing.assigned_to;
    }

    const updateSql = `
      UPDATE public.leads
      SET 
        full_name = $1,
        phone = $2,
        email = $3,
        alternate_phone = $4,
        lead_type = $5,
        status = $6,
        source = $7,
        budget_min = $8,
        budget_max = $9,
        property_type = $10,
        location = $11,
        preferred_location = $11,
        requirement = $12,
        remarks = $13,
        assigned_to = $14,
        updated_at = now()
      WHERE id = $15
      RETURNING *
    `;

    const updatedRows = await query<Lead>(updateSql, [
      full_name.trim(),
      phone.trim(),
      email ? email.trim() : null,
      alternate_phone ? alternate_phone.trim() : null,
      lead_type,
      status,
      source,
      budget_min !== null && budget_min !== undefined ? Number(budget_min) : null,
      budget_max !== null && budget_max !== undefined ? Number(budget_max) : null,
      property_type || null,
      location ? location.trim() : null,
      requirement ? requirement.trim() : null,
      remarks ? remarks.trim() : null,
      targetAssignedTo || null,
      id,
    ]);

    const updated = updatedRows[0];

    // Detect status change and log to lead_history
    if (existing.status !== status) {
      await query(
        `INSERT INTO public.lead_history (lead_id, actor_id, actor_name, action_type, title, description, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          id,
          auth.userId,
          auth.employeeName,
          'status_change',
          `Status changed to ${status}`,
          `Pipeline status changed from '${existing.status}' to '${status}'.`,
          JSON.stringify({ previous_status: existing.status, new_status: status }),
        ]
      );
    }

    // Detect assignment change and log
    if (existing.assigned_to !== targetAssignedTo) {
      let assigneeName = 'Unassigned';
      if (targetAssignedTo) {
        const emp = await query<{ full_name: string }>(
          `SELECT p.full_name FROM public.employees e JOIN public.profiles p ON e.user_id = p.id WHERE e.id = $1`,
          [targetAssignedTo]
        );
        if (emp[0]?.full_name) assigneeName = emp[0].full_name;
      }

      await query(
        `INSERT INTO public.lead_history (lead_id, actor_id, actor_name, action_type, title, description, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          id,
          auth.userId,
          auth.employeeName,
          'assignment',
          'Assigned Agent Updated',
          `Lead assigned to ${assigneeName}.`,
          JSON.stringify({ previous_assigned_to: existing.assigned_to, new_assigned_to: targetAssignedTo }),
        ]
      );
    }

    return NextResponse.json({ lead: updated });
  } catch (err: unknown) {
    console.error('Error updating lead:', err);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext();
    if (!auth || !auth.isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required to delete leads' }, { status: 403 });
    }

    const { id } = await params;
    await query('DELETE FROM public.leads WHERE id = $1', [id]);

    return NextResponse.json({ success: true, message: 'Lead deleted successfully' });
  } catch (err: unknown) {
    console.error('Error deleting lead:', err);
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
  }
}

export const PATCH = PUT;
