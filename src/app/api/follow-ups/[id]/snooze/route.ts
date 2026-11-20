import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import { FollowUp } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify existing follow up
    const existing = await query<FollowUp>('SELECT * FROM public.follow_ups WHERE id = $1', [id]);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 });
    }

    if (!auth.isAdmin && existing[0].assigned_to !== auth.employeeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let minutes = 10;
    try {
      const body = await request.json();
      if (body.minutes && Number(body.minutes) > 0) {
        minutes = Math.min(1440, Number(body.minutes));
      }
    } catch {
      // Body optional, defaults to 10 minutes
    }

    const updateSql = `
      UPDATE public.follow_ups
      SET 
        snoozed_until = now() + ($1 || ' minutes')::interval,
        acknowledged_at = NULL,
        repeat_count = COALESCE(repeat_count, 0) + 1,
        updated_at = now()
      WHERE id = $2
      RETURNING id, snoozed_until, repeat_count
    `;

    const updated = await query<{ id: string; snoozed_until: string; repeat_count: number }>(
      updateSql,
      [minutes, id]
    );

    // Audit log
    await query(
      `INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, new_data)
       VALUES ($1, 'snooze', 'follow_up', $2, $3)`,
      [auth.userId, id, JSON.stringify({ snoozed_minutes: minutes, snoozed_until: updated[0].snoozed_until })]
    );

    return NextResponse.json({
      success: true,
      snoozed_until: updated[0].snoozed_until,
      repeat_count: updated[0].repeat_count,
    });
  } catch (err: unknown) {
    console.error('Error snoozing follow-up:', err);
    return NextResponse.json({ error: 'Failed to snooze follow-up' }, { status: 500 });
  }
}
