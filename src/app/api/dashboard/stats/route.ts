import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { query } from '@/lib/db';
import { DashboardStats } from '@/lib/supabase/types';
import { shouldIncludeDemo, getDemoCondition } from '@/lib/db/demo-filter';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Check authentication
    const localSession = await getSession();
    let userId = localSession?.userId;
    let role = localSession?.role;

    if (!userId) {
      try {
        const supabase = await createClient();
        const { data } = await supabase.auth.getUser();
        userId = data.user?.id;
        if (userId) {
          const { data: p } = await supabase.from('profiles').select('role').eq('id', userId).single();
          role = p?.role;
        }
      } catch {
        // ignore
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const includeDemo = shouldIncludeDemo(request);

    // Demo filter for leads, follow-ups, visits, deals, properties
    const leadDemoCond = includeDemo ? '' : 'AND (is_demo IS FALSE OR is_demo IS NULL)';
    const leadWhereDemo = includeDemo ? '' : 'WHERE (is_demo IS FALSE OR is_demo IS NULL)';
    const followUpDemoCond = includeDemo ? '' : 'AND (is_demo IS FALSE OR is_demo IS NULL)';
    const visitDemoCond = includeDemo ? '' : 'AND (is_demo IS FALSE OR is_demo IS NULL)';
    const dealDemoCond = includeDemo ? '' : 'AND (is_demo IS FALSE OR is_demo IS NULL)';
    const propDemoCond = includeDemo ? '' : 'AND (is_demo IS FALSE OR is_demo IS NULL)';

    // Query real PostgreSQL counts
    try {
      const today = new Date().toISOString().split('T')[0];

      // Check if employee
      let employeeId: string | null = null;
      if (role === 'employee') {
        const empRows = await query<{ id: string }>('SELECT id FROM public.employees WHERE user_id = $1 LIMIT 1', [userId]);
        employeeId = empRows[0]?.id || null;
      }

      let totalLeadsRes, newLeadsRes, pendingFollowUpsRes, siteVisitsTodayRes, closedDealsRes;

      if (employeeId) {
        [totalLeadsRes, newLeadsRes, pendingFollowUpsRes, siteVisitsTodayRes, closedDealsRes] = await Promise.all([
          query<{ count: string }>(`SELECT COUNT(*) as count FROM public.leads WHERE assigned_to = $1 ${leadDemoCond}`, [employeeId]),
          query<{ count: string }>(`SELECT COUNT(*) as count FROM public.leads WHERE assigned_to = $1 AND status = $2 ${leadDemoCond}`, [employeeId, 'new']),
          query<{ count: string }>(`SELECT COUNT(*) as count FROM public.follow_ups WHERE assigned_to = $1 AND status = $2 ${followUpDemoCond}`, [employeeId, 'pending']),
          query<{ count: string }>(`SELECT COUNT(*) as count FROM public.site_visits WHERE assigned_to = $1 AND DATE(visit_date) = $2 ${visitDemoCond}`, [employeeId, today]),
          query<{ count: string }>(`SELECT COUNT(*) as count FROM public.deals WHERE employee_id = $1 AND status = $2 ${dealDemoCond}`, [employeeId, 'closed_won']),
        ]);
      } else {
        [totalLeadsRes, newLeadsRes, pendingFollowUpsRes, siteVisitsTodayRes, closedDealsRes] = await Promise.all([
          query<{ count: string }>(`SELECT COUNT(*) as count FROM public.leads ${leadWhereDemo}`),
          query<{ count: string }>(`SELECT COUNT(*) as count FROM public.leads WHERE status = $1 ${leadDemoCond}`, ['new']),
          query<{ count: string }>(`SELECT COUNT(*) as count FROM public.follow_ups WHERE status = $1 ${followUpDemoCond}`, ['pending']),
          query<{ count: string }>(`SELECT COUNT(*) as count FROM public.site_visits WHERE DATE(visit_date) = $1 ${visitDemoCond}`, [today]),
          query<{ count: string }>(`SELECT COUNT(*) as count FROM public.deals WHERE status = $1 ${dealDemoCond}`, ['closed_won']),
        ]);
      }

      const [availablePropertiesRes, leadsBySourceRows] = await Promise.all([
        query<{ count: string }>(`SELECT COUNT(*) as count FROM public.properties WHERE status = $1 ${propDemoCond}`, ['available']),
        query<{ source: string; count: string }>(
          `SELECT LOWER(source) as source, COUNT(*)::text as count 
           FROM public.leads 
           ${leadWhereDemo}
           GROUP BY LOWER(source)
           ORDER BY COUNT(*) DESC`
        ),
      ]);

      const leadsBySource = leadsBySourceRows.map((r) => ({
        source: r.source,
        count: parseInt(r.count, 10),
      }));

      const stats: DashboardStats = {
        totalLeads: parseInt(totalLeadsRes[0]?.count || '0', 10),
        newLeads: parseInt(newLeadsRes[0]?.count || '0', 10),
        pendingFollowUps: parseInt(pendingFollowUpsRes[0]?.count || '0', 10),
        siteVisitsToday: parseInt(siteVisitsTodayRes[0]?.count || '0', 10),
        closedDeals: parseInt(closedDealsRes[0]?.count || '0', 10),
        availableProperties: parseInt(availablePropertiesRes[0]?.count || '0', 10),
      };

      return NextResponse.json({
        stats,
        leadsBySource,
        includeDemo,
      });
    } catch (dbErr) {
      console.error('Error fetching dashboard counts from Postgres, attempting fallback:', dbErr);
      const supabase = await createClient();
      const [
        totalLeadsRes,
        newLeadsRes,
        pendingFollowUpsRes,
        siteVisitsTodayRes,
        closedDealsRes,
        availablePropertiesRes,
      ] = await Promise.all([
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('is_demo', false),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'new').eq('is_demo', false),
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
        leadsBySource: [],
        includeDemo: false,
      });
    }
  } catch (err: unknown) {
    console.error('Dashboard stats error:', err);
    return NextResponse.json({ error: 'Failed to fetch dashboard metrics' }, { status: 500 });
  }
}
