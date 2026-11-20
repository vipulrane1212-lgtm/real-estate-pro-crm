import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';

    const workbook = XLSX.utils.book_new();

    // 1. Leads Sheet
    if (type === 'leads' || type === 'all') {
      const leads = await query<{
        lead_number: number;
        full_name: string;
        phone: string;
        email: string;
        lead_type: string;
        status: string;
        source: string;
        budget_min: number;
        budget_max: number;
        location: string;
        requirement: string;
        assigned_agent: string;
        created_at: string;
      }>(`
        SELECT 
          l.lead_number as "Lead #",
          l.full_name as "Client Name",
          l.phone as "Mobile",
          COALESCE(l.email, '—') as "Email",
          UPPER(l.lead_type) as "Type",
          UPPER(l.status) as "Status",
          INITCAP(l.source) as "Source",
          COALESCE(l.budget_min, 0) as "Budget Min (INR)",
          COALESCE(l.budget_max, 0) as "Budget Max (INR)",
          COALESCE(l.location, l.preferred_location, '—') as "Location",
          COALESCE(l.requirement, '—') as "Requirement",
          COALESCE(p.full_name, 'Unassigned') as "Assigned Agent",
          TO_CHAR(l.created_at, 'YYYY-MM-DD HH24:MI') as "Created At"
        FROM public.leads l
        LEFT JOIN public.employees e ON l.assigned_to = e.id
        LEFT JOIN public.profiles p ON e.user_id = p.id
        ORDER BY l.created_at DESC
      `);

      const wsLeads = XLSX.utils.json_to_sheet(leads.length > 0 ? leads : [{ 'Note': 'No leads recorded yet' }]);
      XLSX.utils.book_append_sheet(workbook, wsLeads, 'Leads');
    }

    // 2. Deals Sheet
    if (type === 'deals' || type === 'all') {
      const deals = await query<{
        deal_number: number;
        client_name: string;
        property_title: string;
        deal_value: number;
        brokerage_pct: number;
        commission_amount: number;
        closing_agent: string;
        status: string;
        closed_date: string;
      }>(`
        SELECT 
          d.deal_number as "Deal #",
          l.full_name as "Client Name",
          p.title as "Property",
          d.deal_value as "Deal Value (INR)",
          d.brokerage_percentage as "Brokerage %",
          d.commission_amount as "Commission Amount (INR)",
          prof.full_name as "Closing Agent",
          UPPER(d.status) as "Deal Status",
          TO_CHAR(d.closed_date, 'YYYY-MM-DD') as "Closed Date"
        FROM public.deals d
        LEFT JOIN public.leads l ON d.lead_id = l.id
        LEFT JOIN public.properties p ON d.property_id = p.id
        LEFT JOIN public.employees e ON d.employee_id = e.id
        LEFT JOIN public.profiles prof ON e.user_id = prof.id
        ORDER BY d.closed_date DESC
      `);

      const wsDeals = XLSX.utils.json_to_sheet(deals.length > 0 ? deals : [{ 'Note': 'No deals recorded yet' }]);
      XLSX.utils.book_append_sheet(workbook, wsDeals, 'Deals');
    }

    // 3. Site Visits Sheet
    if (type === 'visits' || type === 'all') {
      const visits = await query<{
        client_name: string;
        property_title: string;
        agent_name: string;
        visit_date: string;
        status: string;
        client_interest: string;
        outcome_note: string;
      }>(`
        SELECT 
          l.full_name as "Client Name",
          p.title as "Property",
          prof.full_name as "Assigned Agent",
          TO_CHAR(v.visit_date, 'YYYY-MM-DD HH24:MI') as "Visit Date Time",
          UPPER(v.status) as "Status",
          COALESCE(UPPER(v.client_interest_level), '—') as "Interest Level",
          COALESCE(v.outcome_note, v.feedback, '—') as "Outcome / Notes"
        FROM public.site_visits v
        LEFT JOIN public.leads l ON v.lead_id = l.id
        LEFT JOIN public.properties p ON v.property_id = p.id
        LEFT JOIN public.employees e ON v.assigned_to = e.id
        LEFT JOIN public.profiles prof ON e.user_id = prof.id
        ORDER BY v.visit_date DESC
      `);

      const wsVisits = XLSX.utils.json_to_sheet(visits.length > 0 ? visits : [{ 'Note': 'No site visits recorded yet' }]);
      XLSX.utils.book_append_sheet(workbook, wsVisits, 'Site Visits');
    }

    // 4. Agent Performance Sheet
    if (type === 'agents' || type === 'all') {
      const agents = await query<{
        agent_name: string;
        designation: string;
        leads_assigned: number;
        calls_logged: number;
        visits_completed: number;
        deals_closed: number;
        total_brokerage: number;
      }>(`
        SELECT 
          p.full_name as "Agent Name",
          e.designation as "Designation",
          COUNT(DISTINCT l.id) as "Leads Assigned",
          COUNT(DISTINCT c.id) as "Calls Logged",
          COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'completed') as "Visits Completed",
          COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'closed_won') as "Deals Closed",
          COALESCE(SUM(b.total_brokerage), 0) as "Total Brokerage (INR)"
        FROM public.employees e
        JOIN public.profiles p ON e.user_id = p.id
        LEFT JOIN public.leads l ON l.assigned_to = e.id
        LEFT JOIN public.calls c ON c.employee_id = e.id
        LEFT JOIN public.site_visits v ON v.assigned_to = e.id
        LEFT JOIN public.deals d ON d.employee_id = e.id
        LEFT JOIN public.brokerage b ON b.deal_id = d.id
        GROUP BY e.id, p.full_name, e.designation
        ORDER BY "Total Brokerage (INR)" DESC
      `);

      const wsAgents = XLSX.utils.json_to_sheet(agents.length > 0 ? agents : [{ 'Note': 'No agent metrics yet' }]);
      XLSX.utils.book_append_sheet(workbook, wsAgents, 'Agent Performance');
    }

    // Generate binary buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `Diksha_CRM_${type.toUpperCase()}_Report_${timestamp}.xlsx`;

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    console.error('Error generating Excel report:', err);
    return NextResponse.json({ error: 'Failed to export Excel report' }, { status: 500 });
  }
}
