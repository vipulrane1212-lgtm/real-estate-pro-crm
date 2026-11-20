import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { query } from '@/lib/db';
import { DashboardStats } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Check authentication
    const localSession = await getSession();
    let userId = localSession?.userId;

    if (!userId) {
      try {
        const supabase = await createClient();
        const { data } = await supabase.auth.getUser();
        userId = data.user?.id;
      } catch {
        // ignore
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Query real PostgreSQL counts
    try {
      const today = new Date().toISOString().split('T')[0];

      const [
        totalLeadsRes,
        newLeadsRes,
        pendingFollowUpsRes,
        siteVisitsTodayRes,
        closedDealsRes,
        availablePropertiesRes,
      ] = await Promise.all([
        query<{ count: string }>('SELECT COUNT(*) as count FROM public.leads'),
        query<{ count: string }>('SELECT COUNT(*) as count FROM public.leads WHERE status = $1', ['new']),
        query<{ count: string }>('SELECT COUNT(*) as count FROM public.follow_ups WHERE status = $1', ['pending']),
        query<{ count: string }>('SELECT COUNT(*) as count FROM public.site_visits WHERE DATE(visit_date) = $1', [today]),
        query<{ count: string }>('SELECT COUNT(*) as count FROM public.deals WHERE status = $1', ['closed_won']),
        query<{ count: string }>('SELECT COUNT(*) as count FROM public.properties WHERE status = $1', ['available']),
      ]);

      const stats: DashboardStats = {
        totalLeads: parseInt(totalLeadsRes[0]?.count || '0', 10),
        newLeads: parseInt(newLeadsRes[0]?.count || '0', 10),
        pendingFollowUps: parseInt(pendingFollowUpsRes[0]?.count || '0', 10),
        siteVisitsToday: parseInt(siteVisitsTodayRes[0]?.count || '0', 10),
        closedDeals: parseInt(closedDealsRes[0]?.count || '0', 10),
        availableProperties: parseInt(availablePropertiesRes[0]?.count || '0', 10),
      };

      return NextResponse.json({ stats });
    } catch (dbErr) {
      console.error('Error fetching dashboard counts from Postgres, attempting Supabase fallback:', dbErr);
      const supabase = await createClient();
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
        supabase.from('site_visits').select('*', { count: 'exact', head: true }),
        supabase.from('deals').select('*', { count: 'exact', head: true }).eq('status', 'closed_won'),
        supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'available'),
      ]);

      return NextResponse.json({
        stats: {
          totalLeads: totalLeadsRes.count ?? 0,
          newLeads: newLeadsRes.count ?? 0,
          pendingFollowUps: pendingFollowUpsRes.count ?? 0,
          siteVisitsToday: siteVisitsTodayRes.count ?? 0,
          closedDeals: closedDealsRes.count ?? 0,
          availableProperties: availablePropertiesRes.count ?? 0,
        },
      });
    }
  } catch (err: unknown) {
    console.error('Dashboard stats API error:', err);
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
