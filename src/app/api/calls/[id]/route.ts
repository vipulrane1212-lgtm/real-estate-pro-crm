import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import { CallRecord } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

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

    // Verify existing call log
    const existing = await query<CallRecord>('SELECT * FROM public.calls WHERE id = $1', [id]);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Call log not found' }, { status: 404 });
    }

    // Admin or call creator can delete
    if (!auth.isAdmin && existing[0].employee_id !== auth.employeeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await query('DELETE FROM public.calls WHERE id = $1', [id]);

    return NextResponse.json({ success: true, message: 'Call log deleted' });
  } catch (err: unknown) {
    console.error('Error deleting call log:', err);
    return NextResponse.json({ error: 'Failed to delete call log' }, { status: 500 });
  }
}
