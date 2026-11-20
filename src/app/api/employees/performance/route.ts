import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import { EmployeeDailyReport } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role check: Only admins can view the employee daily reports & governance
    if (!auth.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can view employee management and daily reports' },
        { status: 403 }
      );
    }

    const sql = `
      SELECT 
        e.id,
        e.user_id,
        p.full_name as name,
        u.email,
        p.phone,
        p.role,
        e.designation,
        e.is_active,
        TO_CHAR(e.joining_date, 'YYYY-MM-DD') as joining_date,

        -- Today's Real Metrics
        (
          SELECT COUNT(*) 
          FROM public.leads l 
          WHERE l.assigned_to = e.id AND DATE(l.created_at) = CURRENT_DATE
        ) as today_leads,
        (
          SELECT COUNT(*) 
          FROM public.calls c 
          WHERE c.employee_id = e.id AND DATE(c.created_at) = CURRENT_DATE
        ) as today_calls,
        (
          SELECT COUNT(*) 
          FROM public.site_visits v 
          WHERE v.assigned_to = e.id AND v.status = 'completed' AND v.visit_date = CURRENT_DATE
        ) as today_visits,
        (
          SELECT COUNT(*) 
          FROM public.follow_ups f 
          WHERE f.assigned_to = e.id AND f.status = 'completed' AND DATE(f.completed_at) = CURRENT_DATE
        ) as today_followups,

        -- This Month's Real Metrics
        (
          SELECT COUNT(*) 
          FROM public.leads l 
          WHERE l.assigned_to = e.id 
            AND l.created_at >= date_trunc('month', CURRENT_DATE)
        ) as month_leads,
        (
          SELECT COUNT(*) 
          FROM public.calls c 
          WHERE c.employee_id = e.id 
            AND c.created_at >= date_trunc('month', CURRENT_DATE)
        ) as month_calls,
        (
          SELECT COUNT(*) 
          FROM public.site_visits v 
          WHERE v.assigned_to = e.id AND v.status = 'completed'
            AND v.visit_date >= date_trunc('month', CURRENT_DATE)::date
        ) as month_visits,
        (
          SELECT COUNT(*) 
          FROM public.follow_ups f 
          WHERE f.assigned_to = e.id AND f.status = 'completed'
            AND f.completed_at >= date_trunc('month', CURRENT_DATE)
        ) as month_followups,
        (
          SELECT COUNT(*) 
          FROM public.deals d 
          WHERE d.employee_id = e.id AND d.status = 'closed_won'
            AND d.closed_date >= date_trunc('month', CURRENT_DATE)::date
        ) as month_deals,
        (
          SELECT COALESCE(SUM(b.total_brokerage), 0)
          FROM public.brokerage b 
          WHERE b.agent_id = e.id
            AND b.created_at >= date_trunc('month', CURRENT_DATE)
        ) as month_brokerage,

        -- All Time Metrics
        (
          SELECT COUNT(*) 
          FROM public.leads l 
          WHERE l.assigned_to = e.id
        ) as alltime_leads,
        (
          SELECT COUNT(*) 
          FROM public.calls c 
          WHERE c.employee_id = e.id
        ) as alltime_calls,
        (
          SELECT COUNT(*) 
          FROM public.site_visits v 
          WHERE v.assigned_to = e.id AND v.status = 'completed'
        ) as alltime_visits,
        (
          SELECT COUNT(*) 
          FROM public.deals d 
          WHERE d.employee_id = e.id AND d.status = 'closed_won'
        ) as alltime_deals,
        (
          SELECT COALESCE(SUM(b.total_brokerage), 0)
          FROM public.brokerage b 
          WHERE b.agent_id = e.id
        ) as alltime_brokerage

      FROM public.employees e
      JOIN public.profiles p ON e.user_id = p.id
      JOIN auth.users u ON e.user_id = u.id
      ORDER BY e.is_active DESC, p.full_name ASC
    `;

    interface RowType {
      id: string;
      user_id: string;
      name: string;
      email: string;
      phone: string | null;
      role: string;
      designation: string;
      is_active: boolean;
      joining_date: string | null;
      today_leads: string;
      today_calls: string;
      today_visits: string;
      today_followups: string;
      month_leads: string;
      month_calls: string;
      month_visits: string;
      month_followups: string;
      month_deals: string;
      month_brokerage: string;
      alltime_leads: string;
      alltime_calls: string;
      alltime_visits: string;
      alltime_deals: string;
      alltime_brokerage: string;
    }

    const rows = await query<RowType>(sql);

    const reports: EmployeeDailyReport[] = rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      role: r.role,
      designation: r.designation,
      is_active: r.is_active,
      joining_date: r.joining_date,
      today: {
        leadsAssigned: Number(r.today_leads) || 0,
        callsLogged: Number(r.today_calls) || 0,
        visitsDone: Number(r.today_visits) || 0,
        followupsCompleted: Number(r.today_followups) || 0,
      },
      thisMonth: {
        leadsAssigned: Number(r.month_leads) || 0,
        callsLogged: Number(r.month_calls) || 0,
        visitsDone: Number(r.month_visits) || 0,
        followupsCompleted: Number(r.month_followups) || 0,
        dealsClosed: Number(r.month_deals) || 0,
        brokerageEarned: Number(r.month_brokerage) || 0,
      },
      allTime: {
        leadsAssigned: Number(r.alltime_leads) || 0,
        callsLogged: Number(r.alltime_calls) || 0,
        visitsDone: Number(r.alltime_visits) || 0,
        dealsClosed: Number(r.alltime_deals) || 0,
        totalBrokerage: Number(r.alltime_brokerage) || 0,
      },
    }));

    const todayTotals = {
      leadsAssigned: reports.reduce((s, r) => s + r.today.leadsAssigned, 0),
      callsLogged: reports.reduce((s, r) => s + r.today.callsLogged, 0),
      visitsCompleted: reports.reduce((s, r) => s + r.today.visitsDone, 0),
      followupsCompleted: reports.reduce((s, r) => s + r.today.followupsCompleted, 0),
    };

    const leaderboard = [...reports]
      .sort((a, b) => b.allTime.dealsClosed - a.allTime.dealsClosed || b.allTime.totalBrokerage - a.allTime.totalBrokerage)
      .map((r, idx) => ({
        rank: idx + 1,
        employee_id: r.id,
        name: r.name,
        designation: r.designation,
        deals_closed: r.allTime.dealsClosed,
        brokerage_earned: r.allTime.totalBrokerage,
        active_leads: r.allTime.leadsAssigned,
      }));

    return NextResponse.json({
      reports,
      performance: reports,
      todayTotals,
      leaderboard,
      count: reports.length,
      serverDate: new Date().toISOString().split('T')[0],
    });
  } catch (err: unknown) {
    console.error('Error fetching employee daily reports:', err);
    return NextResponse.json({ error: 'Failed to fetch employee daily reports' }, { status: 500 });
  }
}
