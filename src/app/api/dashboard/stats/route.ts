import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DashboardStats } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Run parallel queries to fetch real database counts (respecting RLS)
    const [
      totalLeadsRes,
      newLeadsRes,
      pendingFollowUpsRes,
      siteVisitsTodayRes,
      closedDealsRes,
      availablePropertiesRes,
    ] = await Promise.all([
      supabase.from('leads').select('*', { count: 'exact', head: true }),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'new'),
      supabase.from('follow_ups').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase
        .from('site_visits')
        .select('*', { count: 'exact', head: true })
        .gte('visit_date', todayStart.toISOString())
        .lte('visit_date', todayEnd.toISOString()),
      supabase.from('deals').select('*', { count: 'exact', head: true }).eq('status', 'closed_won'),
      supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'available'),
    ]);

    const stats: DashboardStats = {
      totalLeads: totalLeadsRes.count ?? 0,
      newLeads: newLeadsRes.count ?? 0,
      pendingFollowUps: pendingFollowUpsRes.count ?? 0,
      siteVisitsToday: siteVisitsTodayRes.count ?? 0,
      closedDeals: closedDealsRes.count ?? 0,
      availableProperties: availablePropertiesRes.count ?? 0,
    };

    return NextResponse.json({ stats });
  } catch (err: unknown) {
    console.error('Dashboard stats API error:', err);
    // Return zeros without throwing unhandled exceptions
    return NextResponse.json({
      stats: {
        totalLeads: 0,
        newLeads: 0,
        pendingFollowUps: 0,
        siteVisitsToday: 0,
        closedDeals: 0,
        availableProperties: 0,
      },
    });
  }
}
