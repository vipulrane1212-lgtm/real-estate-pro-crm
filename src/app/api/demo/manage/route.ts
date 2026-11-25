import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { getCrmDemoStatus, resetAllCrmDemoData, seedAllCrmDemoData } from '@/lib/demo/crm-demo-seeder';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = await getCrmDemoStatus();
    return NextResponse.json(status);
  } catch (err) {
    console.error('Error fetching global demo status:', err);
    return NextResponse.json({ error: 'Failed to fetch demo status' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!auth.isAdmin && auth.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: Only administrators can manage demo data' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    if (!['seed', 'reseed', 'reset'].includes(action)) {
      return NextResponse.json({ error: 'action must be "seed", "reseed", or "reset"' }, { status: 400 });
    }

    if (action === 'reset') {
      const res = await resetAllCrmDemoData();
      return NextResponse.json({
        success: true,
        action: 'reset',
        deletedCounts: res.deletedCounts,
        message: 'Successfully removed all demo data across all CRM modules. Real production data remains untouched.',
      });
    }

    if (action === 'seed' || action === 'reseed') {
      const res = await seedAllCrmDemoData();
      return NextResponse.json({
        success: true,
        action: 'seed',
        seededCounts: res.seededCounts,
        message: 'Successfully seeded comprehensive demo data across all CRM modules (Leads, Properties, Rentals, Calls, Visits, Attendance, Expenses, Deals, Documents).',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: unknown) {
    console.error('Error in demo manage POST:', err);
    return NextResponse.json({ error: (err as Error)?.message || 'Failed to process demo action' }, { status: 500 });
  }
}
