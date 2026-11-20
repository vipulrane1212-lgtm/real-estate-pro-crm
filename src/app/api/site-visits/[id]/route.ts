import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import { SiteVisit } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check existing site visit
    const existingRows = await query<SiteVisit>('SELECT * FROM public.site_visits WHERE id = $1', [id]);
    if (existingRows.length === 0) {
      return NextResponse.json({ error: 'Site visit not found' }, { status: 404 });
    }

    const visit = existingRows[0];

    // Check permission
    if (!auth.isAdmin && visit.assigned_to !== auth.employeeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      status, // 'scheduled', 'completed', 'cancelled', 'no_show'
      feedback, // 'interested', 'not_interested', 'negotiating'
      outcome_note,
      cancellation_reason,
      visit_date,
      client_interest_level,
    } = body;

    const updates: string[] = [];
    const values: unknown[] = [];

    if (status) {
      values.push(status);
      updates.push(`status = $${values.length}`);
      if (status === 'completed') {
        values.push(new Date().toISOString());
        updates.push(`completed_at = $${values.length}`);
      }
    }

    if (feedback !== undefined) {
      values.push(feedback);
      updates.push(`feedback = $${values.length}`);
    }

    if (outcome_note !== undefined) {
      values.push(outcome_note);
      updates.push(`outcome_note = $${values.length}`);
    }

    if (cancellation_reason !== undefined) {
      values.push(cancellation_reason);
      updates.push(`cancellation_reason = $${values.length}`);
    }

    if (visit_date) {
      values.push(visit_date);
      updates.push(`visit_date = $${values.length}`);
    }

    if (client_interest_level) {
      values.push(client_interest_level);
      updates.push(`client_interest_level = $${values.length}`);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(id);
    const sql = `
      UPDATE public.site_visits
      SET ${updates.join(', ')}, updated_at = now()
      WHERE id = $${values.length}
      RETURNING *
    `;

    const updatedRows = await query<SiteVisit>(sql, values);
    const updatedVisit = updatedRows[0];

    // Log to Lead History
    if (status && status !== visit.status) {
      const statusLabel = status.replace('_', ' ').toUpperCase();
      const feedbackLabel = feedback ? ` | Client Feedback: ${feedback.toUpperCase()}` : '';
      const notes = outcome_note || cancellation_reason || '';

      await query(
        `INSERT INTO public.lead_history (
          lead_id,
          actor_id,
          actor_name,
          action_type,
          title,
          description,
          details
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          visit.lead_id,
          auth.userId,
          auth.employeeName,
          'visit',
          `Site Visit Marked ${statusLabel}${feedbackLabel}`,
          notes ? notes : `Site visit status updated to ${statusLabel}`,
          JSON.stringify({
            visit_id: id,
            status,
            feedback,
            outcome_note,
            cancellation_reason,
          }),
        ]
      );
    }

    return NextResponse.json({ success: true, visit: updatedVisit });
  } catch (err: unknown) {
    console.error('Error updating site visit:', err);
    return NextResponse.json({ error: 'Failed to update site visit' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await query<SiteVisit>('SELECT * FROM public.site_visits WHERE id = $1', [id]);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Site visit not found' }, { status: 404 });
    }

    if (!auth.isAdmin && existing[0].assigned_to !== auth.employeeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await query('DELETE FROM public.site_visits WHERE id = $1', [id]);

    return NextResponse.json({ success: true, message: 'Site visit deleted' });
  } catch (err: unknown) {
    console.error('Error deleting site visit:', err);
    return NextResponse.json({ error: 'Failed to delete site visit' }, { status: 500 });
  }
}
