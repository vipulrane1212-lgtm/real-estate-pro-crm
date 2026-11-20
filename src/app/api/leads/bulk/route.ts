import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import { LeadStatus } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, lead_ids = [], assigned_to, status, scheduled_at, follow_up_type = 'call', remarks } = body;

    if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
      return NextResponse.json({ error: 'lead_ids array is required and must not be empty' }, { status: 400 });
    }

    if (!['assign', 'status', 'follow_up'].includes(action)) {
      return NextResponse.json({ error: 'action must be one of "assign", "status", or "follow_up"' }, { status: 400 });
    }

    // Role check: Only admin can reassign leads. Non-admin can only update status/followup for their assigned leads.
    if (action === 'assign' && !auth.isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Only administrators can bulk assign leads' }, { status: 403 });
    }

    // Filter leads if employee to ensure ownership
    let eligibleLeadIds = lead_ids;
    if (!auth.isAdmin) {
      const owned = await query<{ id: string }>(
        'SELECT id FROM public.leads WHERE id = ANY($1) AND assigned_to = $2',
        [lead_ids, auth.employeeId]
      );
      eligibleLeadIds = owned.map((r) => r.id);
      if (eligibleLeadIds.length === 0) {
        return NextResponse.json({ error: 'No authorized leads found for this action' }, { status: 403 });
      }
    }

    if (action === 'assign') {
      let targetEmployeeName = 'Unassigned';
      if (assigned_to) {
        const empRows = await query<{ full_name: string }>(
          `SELECT p.full_name FROM public.employees e JOIN public.profiles p ON e.user_id = p.id WHERE e.id = $1`,
          [assigned_to]
        );
        targetEmployeeName = empRows[0]?.full_name || 'Assigned Agent';
      }

      // Update leads
      await query(
        `UPDATE public.leads
         SET assigned_to = $1, updated_at = now()
         WHERE id = ANY($2)`,
        [assigned_to || null, eligibleLeadIds]
      );

      // Write one lead_history row per lead
      for (const leadId of eligibleLeadIds) {
        await query(
          `INSERT INTO public.lead_history (lead_id, actor_id, actor_name, action_type, title, description, details)
           VALUES ($1, $2, $3, 'assignment', 'Bulk Reassigned', $4, $5)`,
          [
            leadId,
            auth.userId,
            auth.employeeName,
            `Lead reassigned to ${targetEmployeeName} via bulk action.`,
            JSON.stringify({ assigned_to, actor: auth.employeeName, batch_size: eligibleLeadIds.length }),
          ]
        );
      }

      // Audit log
      try {
        await query(
          `INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, new_data)
           VALUES ($1, 'bulk_assign', 'lead', $2, $3)`,
          [
            auth.userId,
            assigned_to || 'unassigned',
            JSON.stringify({
              count: eligibleLeadIds.length,
              assigned_to,
              employee_name: targetEmployeeName,
              lead_ids: eligibleLeadIds,
            }),
          ]
        );
      } catch (auditErr) {
        console.warn('Audit log error on bulk assign:', auditErr);
      }

      return NextResponse.json({
        success: true,
        action: 'assign',
        affectedCount: eligibleLeadIds.length,
        assigned_to,
        employee_name: targetEmployeeName,
      });
    }

    if (action === 'status') {
      if (!status) {
        return NextResponse.json({ error: 'status is required for status change action' }, { status: 400 });
      }

      await query(
        `UPDATE public.leads
         SET status = $1, updated_at = now()
         WHERE id = ANY($2)`,
        [status, eligibleLeadIds]
      );

      for (const leadId of eligibleLeadIds) {
        await query(
          `INSERT INTO public.lead_history (lead_id, actor_id, actor_name, action_type, title, description, details)
           VALUES ($1, $2, $3, 'status_change', 'Status Changed', $4, $5)`,
          [
            leadId,
            auth.userId,
            auth.employeeName,
            `Pipeline status updated to '${status}' via bulk action.`,
            JSON.stringify({ new_status: status, batch_size: eligibleLeadIds.length }),
          ]
        );
      }

      try {
        await query(
          `INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, new_data)
           VALUES ($1, 'bulk_status_change', 'lead', $2, $3)`,
          [
            auth.userId,
            status,
            JSON.stringify({ count: eligibleLeadIds.length, status, lead_ids: eligibleLeadIds }),
          ]
        );
      } catch (auditErr) {
        console.warn('Audit log error on bulk status:', auditErr);
      }

      return NextResponse.json({
        success: true,
        action: 'status',
        affectedCount: eligibleLeadIds.length,
        status,
      });
    }

    if (action === 'follow_up') {
      if (!scheduled_at) {
        return NextResponse.json({ error: 'scheduled_at timestamp is required for follow-up' }, { status: 400 });
      }

      const assignedEmployeeId = auth.employeeId;
      if (!assignedEmployeeId) {
        return NextResponse.json({ error: 'Agent profile required to create follow-up' }, { status: 400 });
      }

      for (const leadId of eligibleLeadIds) {
        const fu = await query<{ id: string }>(
          `INSERT INTO public.follow_ups (lead_id, assigned_to, scheduled_at, follow_up_type, remarks, status)
           VALUES ($1, $2, $3, $4, $5, 'pending')
           RETURNING id`,
          [
            leadId,
            assignedEmployeeId,
            scheduled_at,
            follow_up_type,
            remarks || 'Scheduled via bulk task assignment',
          ]
        );

        await query(
          `INSERT INTO public.lead_history (lead_id, actor_id, actor_name, action_type, title, description, details)
           VALUES ($1, $2, $3, 'follow_up', 'Follow-up Scheduled', $4, $5)`,
          [
            leadId,
            auth.userId,
            auth.employeeName,
            `Scheduled a ${follow_up_type} for ${scheduled_at}.`,
            JSON.stringify({ follow_up_id: fu[0]?.id, scheduled_at, follow_up_type }),
          ]
        );
      }

      try {
        await query(
          `INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, new_data)
           VALUES ($1, 'bulk_follow_up', 'lead', $2, $3)`,
          [
            auth.userId,
            assignedEmployeeId,
            JSON.stringify({ count: eligibleLeadIds.length, scheduled_at, follow_up_type }),
          ]
        );
      } catch (auditErr) {
        console.warn('Audit log error on bulk follow-up:', auditErr);
      }

      return NextResponse.json({
        success: true,
        action: 'follow_up',
        affectedCount: eligibleLeadIds.length,
        scheduled_at,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: unknown) {
    console.error('Error executing bulk lead operation:', err);
    return NextResponse.json({ error: 'Failed to process bulk operation' }, { status: 500 });
  }
}
