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

    const existing = await query<FollowUp>('SELECT * FROM public.follow_ups WHERE id = $1', [id]);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 });
    }

    if (!auth.isAdmin && existing[0].assigned_to !== auth.employeeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updateSql = `
      UPDATE public.follow_ups
      SET 
        acknowledged_at = now(),
        updated_at = now()
      WHERE id = $1
      RETURNING id, acknowledged_at
    `;

    const updated = await query<{ id: string; acknowledged_at: string }>(updateSql, [id]);

    // Audit log
    await query(
      `INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, new_data)
       VALUES ($1, 'acknowledge', 'follow_up', $2, $3)`,
      [auth.userId, id, JSON.stringify({ acknowledged_at: updated[0].acknowledged_at })]
    );

    return NextResponse.json({
      success: true,
      acknowledged_at: updated[0].acknowledged_at,
    });
  } catch (err: unknown) {
    console.error('Error acknowledging follow-up:', err);
    return NextResponse.json({ error: 'Failed to acknowledge follow-up' }, { status: 500 });
  }
}
