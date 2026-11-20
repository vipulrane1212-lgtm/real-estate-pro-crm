import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import { FollowUp } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify existing follow-up
    const existingRows = await query<FollowUp>(
      'SELECT * FROM public.follow_ups WHERE id = $1',
      [id]
    );

    if (existingRows.length === 0) {
      return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 });
    }

    const existing = existingRows[0];

    // Check permissions
    if (!auth.isAdmin && existing.assigned_to !== auth.employeeId) {
      return NextResponse.json(
        { error: 'Forbidden: You can only update follow-ups assigned to you' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const status = body.status;
    const outcome = body.outcome || body.outcome_note;
    const remarks = body.remarks;
    const scheduledAt = body.scheduledAt || body.scheduled_at;
    const followUpType = body.followUpType || body.follow_up_type;
    const snoozedUntil = body.snoozedUntil || body.snoozed_until;
    const acknowledgedAt = body.acknowledgedAt || body.acknowledged_at;

    const updates: string[] = [];
    const values: unknown[] = [];

    if (status !== undefined) {
      values.push(status);
      updates.push(`status = $${values.length}`);
      if (status === 'completed') {
        values.push(new Date().toISOString());
        updates.push(`completed_at = $${values.length}`);
      }
    }

    if (outcome !== undefined) {
      values.push(outcome);
      updates.push(`outcome = $${values.length}`);
    }

    if (remarks !== undefined) {
      values.push(remarks);
      updates.push(`remarks = $${values.length}`);
    }

    if (scheduledAt !== undefined) {
      values.push(scheduledAt);
      updates.push(`scheduled_at = $${values.length}`);
    }

    if (followUpType !== undefined) {
      values.push(followUpType);
      updates.push(`follow_up_type = $${values.length}`);
    }

    if (snoozedUntil !== undefined) {
      values.push(snoozedUntil);
      updates.push(`snoozed_until = $${values.length}`);
      updates.push(`repeat_count = repeat_count + 1`);
    }

    if (acknowledgedAt !== undefined) {
      values.push(acknowledgedAt);
      updates.push(`acknowledged_at = $${values.length}`);
    }

    updates.push('updated_at = now()');
    values.push(id);

    const updateSql = `
      UPDATE public.follow_ups
      SET ${updates.join(', ')}
      WHERE id = $${values.length}
      RETURNING *
    `;

    const updatedRows = await query<FollowUp>(updateSql, values);
    const updated = updatedRows[0];

    // Log to lead_history
    if (status === 'completed') {
      try {
        await query(
          `INSERT INTO public.lead_history (lead_id, actor_id, actor_name, action_type, title, description, details)
           VALUES ($1, $2, $3, 'follow_up', $4, $5, $6)`,
          [
            existing.lead_id,
            auth.userId,
            auth.employeeName,
            `Follow-up Completed (${(existing.follow_up_type || 'Call').toUpperCase()})`,
            outcome ? `Outcome: ${outcome}` : 'Follow-up marked as completed',
            JSON.stringify({ follow_up_id: id, outcome }),
          ]
        );
      } catch (histErr) {
        console.error('Failed to log completion history:', histErr);
      }
    }

    return NextResponse.json({ success: true, followUp: updated });
  } catch (err: unknown) {
    console.error('Follow-up PATCH error:', err);
    return NextResponse.json({ error: 'Failed to update follow-up' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!auth.isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    await query('DELETE FROM public.follow_ups WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Follow-up DELETE error:', err);
    return NextResponse.json({ error: 'Failed to delete follow-up' }, { status: 500 });
  }
}
