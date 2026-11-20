import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Leads by Status
    const statusRows = await query<{ status: string; count: string }>(
      'SELECT status, COUNT(*) as count FROM public.leads GROUP BY status'
    );

    // 2. Leads by Type
    const typeRows = await query<{ lead_type: string; count: string }>(
      'SELECT COALESCE(lead_type, \'buy\') as lead_type, COUNT(*) as count FROM public.leads GROUP BY lead_type'
    );

    // 3. Leads by Source
    const sourceRows = await query<{ source: string; count: string }>(
      'SELECT source, COUNT(*) as count FROM public.leads GROUP BY source'
    );

    // 4. Follow-up Performance
    const followUpStats = await query<{
      total: string;
      completed: string;
      pending: string;
      overdue: string;
    }>(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'pending' AND scheduled_at < now()) as overdue
      FROM public.follow_ups
    `);

    // 5. Site Visits Performance
    const siteVisitStats = await query<{
      total: string;
      completed: string;
      scheduled: string;
      cancelled: string;
      no_show: string;
    }>(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COUNT(*) FILTER (WHERE status = 'no_show') as no_show
      FROM public.site_visits
    `);

    // 6. Deals & Brokerage Summary
    const dealStats = await query<{
      total_deals: string;
      closed_deals: string;
      total_deal_value: string;
      total_brokerage: string;
    }>(`
      SELECT 
        COUNT(*) as total_deals,
        COUNT(*) FILTER (WHERE status = 'closed_won') as closed_deals,
        COALESCE(SUM(deal_value) FILTER (WHERE status = 'closed_won'), 0) as total_deal_value,
        COALESCE(SUM(commission_amount) FILTER (WHERE status = 'closed_won'), 0) as total_brokerage
      FROM public.deals
    `);

    // 7. Per-Employee Performance Leaderboard
    const agentStats = await query<{
      id: string;
      full_name: string;
      designation: string;
      leads_count: string;
      calls_count: string;
      visits_count: string;
      deals_count: string;
      total_brokerage: string;
    }>(`
      SELECT 
        e.id,
        p.full_name,
        e.designation,
        COUNT(DISTINCT l.id) as leads_count,
        COUNT(DISTINCT c.id) as calls_count,
        COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'completed') as visits_count,
        COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'closed_won') as deals_count,
        COALESCE(SUM(b.total_brokerage), 0) as total_brokerage
      FROM public.employees e
      JOIN public.profiles p ON e.user_id = p.id
      LEFT JOIN public.leads l ON l.assigned_to = e.id
      LEFT JOIN public.calls c ON c.employee_id = e.id
      LEFT JOIN public.site_visits v ON v.assigned_to = e.id
      LEFT JOIN public.deals d ON d.employee_id = e.id
      LEFT JOIN public.brokerage b ON b.deal_id = d.id
      GROUP BY e.id, p.full_name, e.designation
      ORDER BY total_brokerage DESC, deals_count DESC
    `);

    return NextResponse.json({
      analytics: {
        leadsByStatus: statusRows.map((r) => ({ status: r.status, count: parseInt(r.count, 10) })),
        leadsByType: typeRows.map((r) => ({ type: r.lead_type, count: parseInt(r.count, 10) })),
        leadsBySource: sourceRows.map((r) => ({ source: r.source, count: parseInt(r.count, 10) })),
        followUps: {
          total: parseInt(followUpStats[0]?.total || '0', 10),
          completed: parseInt(followUpStats[0]?.completed || '0', 10),
          pending: parseInt(followUpStats[0]?.pending || '0', 10),
          overdue: parseInt(followUpStats[0]?.overdue || '0', 10),
        },
        siteVisits: {
          total: parseInt(siteVisitStats[0]?.total || '0', 10),
          completed: parseInt(siteVisitStats[0]?.completed || '0', 10),
          scheduled: parseInt(siteVisitStats[0]?.scheduled || '0', 10),
          cancelled: parseInt(siteVisitStats[0]?.cancelled || '0', 10),
          noShow: parseInt(siteVisitStats[0]?.no_show || '0', 10),
        },
        deals: {
          totalDeals: parseInt(dealStats[0]?.total_deals || '0', 10),
          closedDeals: parseInt(dealStats[0]?.closed_deals || '0', 10),
          totalDealValue: parseFloat(dealStats[0]?.total_deal_value || '0'),
          totalBrokerage: parseFloat(dealStats[0]?.total_brokerage || '0'),
        },
        agentPerformance: agentStats.map((a) => ({
          id: a.id,
          name: a.full_name,
          designation: a.designation,
          leadsAssigned: parseInt(a.leads_count, 10),
          callsMade: parseInt(a.calls_count, 10),
          visitsCompleted: parseInt(a.visits_count, 10),
          dealsClosed: parseInt(a.deals_count, 10),
          totalBrokerage: parseFloat(a.total_brokerage),
        })),
      },
    });
  } catch (err: unknown) {
    console.error('Error computing analytics:', err);
    return NextResponse.json({ error: 'Failed to compute analytics' }, { status: 500 });
  }
}
