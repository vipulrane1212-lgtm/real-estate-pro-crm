import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { findDuplicateLead, normalizePhone } from '@/lib/leads/duplicate-check';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone') || '';
    const excludeLeadId = searchParams.get('exclude_id') || undefined;

    const { last10, normalized } = normalizePhone(phone);
    if (!last10 || last10.length < 10) {
      return NextResponse.json({ isDuplicate: false, duplicateLead: null });
    }

    const duplicateLead = await findDuplicateLead(last10, excludeLeadId);

    return NextResponse.json({
      isDuplicate: Boolean(duplicateLead),
      normalizedPhone: normalized,
      duplicateLead,
    });
  } catch (err: unknown) {
    console.error('Error checking duplicate phone:', err);
    return NextResponse.json({ error: 'Failed to check duplicate' }, { status: 500 });
  }
}
