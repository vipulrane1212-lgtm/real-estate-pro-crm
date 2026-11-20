import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import { Deal } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext();
    if (!auth || !auth.isAdmin) {
      return NextResponse.json({ error: 'Admin authorization required' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await query<Deal>('SELECT * FROM public.deals WHERE id = $1', [id]);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Cascade delete brokerage and deal
    await query('DELETE FROM public.brokerage WHERE deal_id = $1', [id]);
    await query('DELETE FROM public.deals WHERE id = $1', [id]);

    return NextResponse.json({ success: true, message: 'Deal deleted' });
  } catch (err: unknown) {
    console.error('Error deleting deal:', err);
    return NextResponse.json({ error: 'Failed to delete deal' }, { status: 500 });
  }
}
