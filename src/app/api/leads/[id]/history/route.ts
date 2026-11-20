import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import { LeadHistoryItem } from '@/lib/supabase/types';

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

    // Verify lead access
    if (!auth.isAdmin) {
      const leadCheck = await query<{ assigned_to: string }>(
        'SELECT assigned_to FROM public.leads WHERE id = $1',
        [id]
      );
      if (!leadCheck || leadCheck.length === 0) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
      }
      if (leadCheck[0].assigned_to !== auth.employeeId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const historyRows = await query<LeadHistoryItem>(
      `SELECT 
        id,
        lead_id,
        actor_id,
        actor_name,
        action_type,
        title,
        description,
        details,
        created_at
      FROM public.lead_history
      WHERE lead_id = $1
      ORDER BY created_at DESC`,
      [id]
    );

    return NextResponse.json({ history: historyRows });
  } catch (err: unknown) {
    console.error('Error fetching lead history:', err);
    return NextResponse.json({ error: 'Failed to fetch timeline history' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action_type = 'note', title, description } = body;

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    // Verify lead access
    if (!auth.isAdmin) {
      const leadCheck = await query<{ assigned_to: string }>(
        'SELECT assigned_to FROM public.leads WHERE id = $1',
        [id]
      );
      if (!leadCheck || leadCheck.length === 0) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
      }
      if (leadCheck[0].assigned_to !== auth.employeeId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const insertSql = `
      INSERT INTO public.lead_history (
        lead_id,
        actor_id,
        actor_name,
        action_type,
        title,
        description,
        details
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const inserted = await query<LeadHistoryItem>(insertSql, [
      id,
      auth.userId,
      auth.employeeName,
      action_type,
      title.trim(),
      description.trim(),
      JSON.stringify(body.details || {}),
    ]);

    return NextResponse.json({ historyItem: inserted[0] }, { status: 201 });
  } catch (err: unknown) {
    console.error('Error adding lead history note:', err);
    return NextResponse.json({ error: 'Failed to add activity note' }, { status: 500 });
  }
}
