import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import { shouldIncludeDemo } from '@/lib/db/demo-filter';

export const dynamic = 'force-dynamic';

export interface NeuralNode {
  id: string;
  label: string;
  type: 'hub' | 'agent' | 'sub_calls' | 'sub_visits' | 'sub_leads' | 'sub_deals';
  role?: string;
  designation?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  healthStatus?: 'thriving' | 'active' | 'critical' | 'inactive';
  energyScore?: number; // 0 to 100
  attendance?: {
    status: 'checked_in' | 'on_field' | 'on_leave' | 'absent' | 'late';
    checkInTime?: string;
    location?: string;
    selfieUrl?: string | null;
  };
  metrics?: {
    callsToday: number;
    visitsToday: number;
    followupsDone: number;
    followupsOverdue: number;
    totalLeads: number;
    pipelineValue: number;
    dealsMonth: number;
  };
  details?: {
    recentCalls?: Array<{ leadName: string; phone?: string; time: string; duration: string; outcome: string; notes?: string }>;
    upcomingVisits?: Array<{ leadName: string; phone?: string; property: string; location?: string; time: string; status: string; notes?: string }>;
    hotLeads?: Array<{ id: string; name: string; phone?: string; budget: string; property: string; stage: string; lastActivity?: string }>;
    deals?: Array<{ title: string; value: string; commission?: string; stage?: string; status: string }>;
  };
  parentId?: string; // For sub-nodes
  val?: number; // Visual size weight
}

export interface NeuralLink {
  source: string;
  target: string;
  type: 'hub_to_agent' | 'agent_to_sub';
  pulseSpeed: number; // 0.5 to 3.0
  color: string;
  particlesCount: number;
  status?: 'thriving' | 'active' | 'critical' | 'inactive';
  label?: string;
}

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!auth.isAdmin && auth.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only the business owner or admin can access the Neural Monitor.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'live'; // 'live', 'pipeline', 'bottlenecks'
    const fullTeam = searchParams.get('full_team') !== 'false'; // default true to support 8-15 employee simulation
    const includeDemo = shouldIncludeDemo(request);

    const demoCallFilter = includeDemo ? '' : 'AND (c.is_demo IS FALSE OR c.is_demo IS NULL)';
    const demoVisitFilter = includeDemo ? '' : 'AND (v.is_demo IS FALSE OR v.is_demo IS NULL)';
    const demoFollowUpFilter = includeDemo ? '' : 'AND (f.is_demo IS FALSE OR f.is_demo IS NULL)';
    const demoLeadFilter = includeDemo ? '' : 'AND (l.is_demo IS FALSE OR l.is_demo IS NULL)';

    // 1. Fetch real active employees from PostgreSQL
    const empSql = `
      SELECT 
        e.id,
        e.user_id,
        p.full_name as name,
        u.email,
        p.phone,
        p.role,
        e.designation,
        e.is_active,
        -- Today Attendance
        (
          SELECT json_build_object(
            'id', a.id,
            'punch_in', a.check_in,
            'punch_out', a.check_out,
            'status', a.status,
            'selfie_url', a.check_in_selfie_url
          )
          FROM public.attendance a
          WHERE a.employee_id = e.id AND a.date = CURRENT_DATE
          LIMIT 1
        ) as today_attendance,
        -- Metrics
        (
          SELECT COUNT(*) FROM public.calls c WHERE c.employee_id = e.id AND DATE(c.created_at) = CURRENT_DATE ${demoCallFilter}
        ) as today_calls,
        (
          SELECT COUNT(*) FROM public.site_visits v WHERE v.assigned_to = e.id AND v.visit_date = CURRENT_DATE ${demoVisitFilter}
        ) as today_visits,
        (
          SELECT COUNT(*) FROM public.follow_ups f WHERE f.assigned_to = e.id AND f.status = 'completed' AND DATE(f.completed_at) = CURRENT_DATE ${demoFollowUpFilter}
        ) as today_followups_done,
        (
          SELECT COUNT(*) FROM public.follow_ups f WHERE f.assigned_to = e.id AND f.status = 'pending' AND f.scheduled_at <= NOW() ${demoFollowUpFilter}
        ) as overdue_followups,
        (
          SELECT COUNT(*) FROM public.leads l WHERE l.assigned_to = e.id ${demoLeadFilter}
        ) as total_leads,
        (
          SELECT COALESCE(SUM(l.budget_max), 0) FROM public.leads l WHERE l.assigned_to = e.id AND l.status IN ('contacted', 'follow_up', 'site_visit', 'negotiation') ${demoLeadFilter}
        ) as pipeline_value
      FROM public.employees e
      JOIN public.profiles p ON e.user_id = p.id
      JOIN auth.users u ON e.user_id = u.id
      WHERE e.is_active = true
      ORDER BY p.full_name ASC;
    `;

    const realEmployees = await query<{
      id: string;
      user_id: string;
      name: string;
      email: string;
      phone: string | null;
      role: string;
      designation: string;
      is_active: boolean;
      today_attendance: { punch_in?: string; punch_out?: string; status?: string; selfie_url?: string } | null;
      today_calls: string;
      today_visits: string;
      today_followups_done: string;
      overdue_followups: string;
      total_leads: string;
      pipeline_value: string;
    }>(empSql);

    // 2. Fetch real hot leads per employee
    const activeLeadsWhereDemo = includeDemo ? '' : 'AND (is_demo IS FALSE OR is_demo IS NULL)';
    const leadsSql = `
      SELECT id, full_name, phone, budget_max, property_type, preferred_location, status, assigned_to
      FROM public.leads
      WHERE status IN ('contacted', 'follow_up', 'site_visit', 'negotiation') ${activeLeadsWhereDemo}
      ORDER BY budget_max DESC NULLS LAST
      LIMIT 60;
    `;
    const activeLeads = await query<{
      id: string;
      full_name: string;
      phone: string;
      budget_max: number | null;
      property_type: string;
      preferred_location: string;
      status: string;
      assigned_to: string;
    }>(leadsSql);

    // 3. Assemble Root HQ Node
    const nodes: NeuralNode[] = [];
    const links: NeuralLink[] = [];

    const rootNode: NeuralNode = {
      id: 'hub_root',
      label: 'Diksha Real Estate HQ',
      type: 'hub',
      role: 'Headquarters & Executive Command',
      designation: 'Central Operations Hub',
      energyScore: 100,
      val: 38,
      metrics: {
        callsToday: 0,
        visitsToday: 0,
        followupsDone: 0,
        followupsOverdue: 0,
        totalLeads: 0,
        pipelineValue: 0,
        dealsMonth: 4,
      },
    };
    nodes.push(rootNode);

    // Simulated 10-Agent Team members to fulfill the 8-15 employee scenario
    const simulatedAgents = [
      {
        id: 'sim_agent_5',
        name: 'Deepak Yadav',
        designation: 'Field Inspection Coordinator',
        email: 'deepak.yadav@diksharealestate.com',
        phone: '+91 98390 12005',
        checkIn: '09:35 AM',
        status: 'on_field' as const,
        callsToday: 7,
        visitsToday: 4,
        followupsDone: 3,
        overdue: 0,
        totalLeads: 10,
        pipelineValue: 15000000,
        recentCalls: [
          { leadName: 'Ashok Maurya', phone: '+91 98390 44101', time: '11:10 AM', duration: '2m 15s', outcome: 'Reached Gate 2', notes: 'Client arrived at Sushant Golf City plot. Guided to plot boundary pillar #14.' },
          { leadName: 'Sunita Jain', phone: '+91 98390 44102', time: '10:20 AM', duration: '3m 45s', outcome: 'Visit Confirmed for 3 PM', notes: 'Confirmed site inspection for Shalimar Grand 3 BHK. Key collected from security.' },
          { leadName: 'Rameshwar Dayal', phone: '+91 98390 44103', time: '09:45 AM', duration: '1m 50s', outcome: 'Follow-up Call', notes: 'Inquired about mutation and possession timeline for Kisan Path plot.' },
        ],
        upcomingVisits: [
          { leadName: 'Ashok Maurya', phone: '+91 98390 44101', property: 'Sushant Golf City Plot', location: 'Sector 7, Sushant Golf City, Lucknow', time: '11:30 AM', status: 'Completed', notes: 'Client loved corner road frontage. Asking for registry stamp estimation.' },
          { leadName: 'Sunita Jain', phone: '+91 98390 44102', property: 'Shalimar Grand 3 BHK', location: '12th Floor, Tower B, Jopling Road, Lucknow', time: '03:00 PM', status: 'Confirmed', notes: 'Family visiting with interior designer. Afternoon slot confirmed.' },
          { leadName: 'Mahendra Verma', phone: '+91 98390 44104', property: 'Omaxe City Residential Plot', location: 'Amar Shaheed Path, Lucknow', time: '04:30 PM', status: 'Scheduled', notes: 'Pickup arranged from airport roundabout.' },
          { leadName: 'Alok Pandey', phone: '+91 98390 44105', property: 'Eldeco Shaurya 2 BHK', location: 'Bijnor Road, Lucknow', time: '06:00 PM', status: 'In Progress', notes: 'Evening sunset view inspection requested.' },
        ],
        hotLeads: [
          { id: 'lead_sim_8', name: 'Sunita Jain', phone: '+91 98390 44102', budget: '₹1.15 Cr', property: '3 BHK Luxury Flat', stage: 'Site Visit', lastActivity: 'Site Visit Confirmed today 3:00 PM' },
          { id: 'lead_sim_8b', name: 'Ashok Maurya', phone: '+91 98390 44101', budget: '₹85 Lakh', property: 'Residential Plot 2150 sqft', stage: 'Negotiation', lastActivity: 'Site visit completed 11:30 AM' },
        ],
        deals: [
          { title: 'Shalimar Grand Tower B Unit #1204', value: '₹1.15 Cr', commission: '₹2.30 Lakh', stage: 'Token Advance', status: 'Active' },
          { title: 'Sushant Golf City Plot Block C', value: '₹85 Lakh', commission: '₹1.70 Lakh', stage: 'Legal Verification', status: 'Active' },
        ],
      },
      {
        id: 'sim_agent_priya',
        name: 'Priya Mishra',
        designation: 'Agent',
        email: 'priya.mishra@diksharealestate.com',
        phone: '+91 98390 12002',
        checkIn: '09:45 AM',
        status: 'checked_in' as const,
        callsToday: 5,
        visitsToday: 1,
        followupsDone: 2,
        overdue: 0,
        totalLeads: 12,
        pipelineValue: 14000000,
        recentCalls: [
          { leadName: 'Vikas Bhutnagar', phone: '+91 98390 44201', time: '11:20 AM', duration: '3m 15s', outcome: 'Follow-up Scheduled', notes: 'Client is comparing 2 BHK vs 3 BHK in Gomti Nagar Ext.' },
          { leadName: 'Meera Rathore', phone: '+91 98390 44202', time: '10:05 AM', duration: '2m 40s', outcome: 'Shared Plot Details', notes: 'Sent master plan brochure and price sheet via WhatsApp.' },
        ],
        upcomingVisits: [
          { leadName: 'Meera Rathore', phone: '+91 98390 44202', property: 'Gomti Greens Villa Plot', location: 'Gomti Nagar Extension, Lucknow', time: '04:00 PM', status: 'Confirmed', notes: 'Requested corner orientation demonstration.' },
        ],
        hotLeads: [
          { id: 'lead_sim_pm1', name: 'Meera Rathore', phone: '+91 98390 44202', budget: '₹1.10 Cr', property: 'Corner Plot 3200 sqft', stage: 'Follow-Up', lastActivity: 'Sent brochure at 10:15 AM' },
          { id: 'lead_sim_pm2', name: 'Vikas Bhutnagar', phone: '+91 98390 44201', budget: '₹95 Lakh', property: '2 BHK Luxury Flat', stage: 'Contacted', lastActivity: 'Called at 11:20 AM' },
        ],
        deals: [
          { title: 'Gomti Greens Villa Plot #108', value: '₹1.10 Cr', commission: '₹2.20 Lakh', stage: 'Negotiation', status: 'Active' },
        ],
      },
      {
        id: 'sim_agent_amit',
        name: 'Amit Verma',
        designation: 'Needs Attention',
        email: 'amit.verma@diksharealestate.com',
        phone: '+91 98390 12001',
        checkIn: '10:20 AM',
        status: 'late' as const,
        callsToday: 3,
        visitsToday: 0,
        followupsDone: 1,
        overdue: 3, // Urgent Heartbeat
        totalLeads: 16,
        pipelineValue: 34000000,
        recentCalls: [
          { leadName: 'Sanjay Agarwal', phone: '+91 98390 44301', time: '12:45 PM', duration: '1m 12s', outcome: 'Waiting for Callback', notes: 'High value client waiting since yesterday morning for commercial layout.' },
          { leadName: 'Megha Singhania', phone: '+91 98390 44302', time: '11:15 AM', duration: '0m 40s', outcome: 'Missed Call - Overdue', notes: 'Missed follow-up alarm. Client enquired about bank approval list.' },
          { leadName: 'Kavita Chawla', phone: '+91 98390 44303', time: '09:50 AM', duration: '2m 10s', outcome: 'Price Negotiation Pending', notes: 'Seller agreed to ₹1.18 Cr, waiting for Amit to confirm.' },
        ],
        upcomingVisits: [],
        hotLeads: [
          { id: 'lead_sim_1', name: 'Sanjay Agarwal', phone: '+91 98390 44301', budget: '₹1.80 Cr', property: 'Commercial Showroom', stage: 'Site Visit', lastActivity: 'Overdue follow-up alert triggered' },
          { id: 'lead_sim_2', name: 'Kavita Chawla', phone: '+91 98390 44303', budget: '₹1.20 Cr', property: 'Commercial Shop', stage: 'Negotiation', lastActivity: 'Price negotiation stalled' },
        ],
        deals: [
          { title: 'Hazratganj Prime Commercial Space', value: '₹1.80 Cr', commission: '₹3.60 Lakh', stage: 'Stalled Follow-up', status: 'Active' },
        ],
      },
      {
        id: 'sim_agent_neha',
        name: 'Neha Singh',
        designation: 'On Leave',
        email: 'neha.singh@diksharealestate.com',
        phone: '+91 98390 12009',
        checkIn: '—',
        status: 'on_leave' as const,
        callsToday: 0,
        visitsToday: 0,
        followupsDone: 0,
        overdue: 0,
        totalLeads: 8,
        pipelineValue: 9000000,
        recentCalls: [],
        upcomingVisits: [],
        hotLeads: [],
        deals: [],
      },
      {
        id: 'sim_agent_sneha',
        name: 'Sneha Kapoor',
        designation: 'Luxury Villas Specialist',
        email: 'sneha.kapoor@diksharealestate.com',
        phone: '+91 98390 12003',
        checkIn: '09:28 AM',
        status: 'on_field' as const,
        callsToday: 15,
        visitsToday: 3,
        followupsDone: 6,
        overdue: 0,
        totalLeads: 14,
        pipelineValue: 48000000,
        recentCalls: [
          { leadName: 'Alok Tripathi', phone: '+91 98390 44401', time: '01:20 PM', duration: '8m 30s', outcome: 'Token Advance Agreed', notes: 'Agreed on ₹2.35 Cr final deal for Eldeco Greens villa. Booking tomorrow.' },
          { leadName: 'Vandana Sen', phone: '+91 98390 44402', time: '12:10 PM', duration: '5m 15s', outcome: 'Layout Approved', notes: 'Vandana liked the duplex garden layout in Golf City.' },
          { leadName: 'Dr. Rajiv Mathur', phone: '+91 98390 44403', time: '10:40 AM', duration: '6m 00s', outcome: 'Legal Vetting Requested', notes: 'Sent registry copy to buyer lawyer.' },
        ],
        upcomingVisits: [
          { leadName: 'Alok Tripathi', phone: '+91 98390 44401', property: 'Eldeco Greens 4 BHK Villa', location: 'Gomti Nagar, Lucknow', time: '02:30 PM', status: 'Completed', notes: 'Token advance paperwork signed.' },
          { leadName: 'Vandana Sen', phone: '+91 98390 44402', property: 'Sushant Golf City Palm Villa', location: 'Sector A, Pocket 2, Sushant Golf City', time: '04:45 PM', status: 'Confirmed', notes: 'Client arriving in private car.' },
          { leadName: 'Dr. Rajiv Mathur', phone: '+91 98390 44403', property: 'Shalimar Belvedere Park', location: 'Gomti Nagar Extension', time: '06:15 PM', status: 'Scheduled', notes: 'Evening penthouse showing.' },
        ],
        hotLeads: [
          { id: 'lead_sim_4', name: 'Alok Tripathi', phone: '+91 98390 44401', budget: '₹2.40 Cr', property: '4 BHK Luxury Villa', stage: 'Negotiation', lastActivity: 'Advance agreement finalized 01:20 PM' },
          { id: 'lead_sim_5', name: 'Vandana Sen', phone: '+91 98390 44402', budget: '₹1.90 Cr', property: 'Golf City Villa', stage: 'Follow-Up', lastActivity: 'Site visit confirmed for 04:45 PM' },
        ],
        deals: [
          { title: 'Eldeco Greens Corner Villa #74', value: '₹2.35 Cr', commission: '₹4.70 Lakh', stage: 'Token Advance', status: 'Active' },
          { title: 'Sushant Golf City Palm Villa #12', value: '₹1.90 Cr', commission: '₹3.80 Lakh', stage: 'Site Inspection', status: 'Active' },
        ],
      },
      {
        id: 'sim_agent_3',
        name: 'Vikram Malhotra',
        designation: 'Residential Sales Executive',
        email: 'vikram.m@diksharealestate.com',
        phone: '+91 98390 12013',
        checkIn: '09:55 AM',
        status: 'checked_in' as const,
        callsToday: 8,
        visitsToday: 1,
        followupsDone: 4,
        overdue: 1,
        totalLeads: 12,
        pipelineValue: 18000000,
        recentCalls: [
          { leadName: 'Neeraj Kashyap', phone: '+91 98390 44501', time: '11:40 AM', duration: '3m 05s', outcome: 'Requested Floor Plan', notes: 'Interested in Rishita Manhattan 3 BHK higher floor.' },
          { leadName: 'Sunil Awasthi', phone: '+91 98390 44502', time: '10:15 AM', duration: '4m 10s', outcome: 'Follow-up Set', notes: 'Requested quotation with registry charges included.' },
        ],
        upcomingVisits: [
          { leadName: 'Neeraj Kashyap', phone: '+91 98390 44501', property: 'Rishita Manhattan 3 BHK', location: 'Amar Shaheed Path, Lucknow', time: '04:00 PM', status: 'Confirmed', notes: 'Showing flat #1402 on 14th floor.' },
        ],
        hotLeads: [
          { id: 'lead_sim_6', name: 'Neeraj Kashyap', phone: '+91 98390 44501', budget: '₹95 Lakh', property: '3 BHK Flat', stage: 'Site Visit', lastActivity: 'Showing scheduled for 4 PM' },
        ],
        deals: [
          { title: 'Rishita Manhattan 3 BHK Unit #1402', value: '₹95 Lakh', commission: '₹1.90 Lakh', stage: 'Site Visit', status: 'Active' },
        ],
      },
      {
        id: 'sim_agent_4',
        name: 'Pooja Sharma',
        designation: 'Senior Telecaller & Outreach',
        email: 'pooja.sharma@diksharealestate.com',
        phone: '+91 98390 12004',
        checkIn: '09:15 AM',
        status: 'checked_in' as const,
        callsToday: 24,
        visitsToday: 0,
        followupsDone: 11,
        overdue: 0,
        totalLeads: 22,
        pipelineValue: 26000000,
        recentCalls: [
          { leadName: 'Kamal Nayan', phone: '+91 98390 44601', time: '01:05 PM', duration: '5m 10s', outcome: 'Qualified Buyer', notes: 'Ready with 40% down payment for Gomti Nagar flat.' },
          { leadName: 'Priya Joshi', phone: '+91 98390 44602', time: '12:30 PM', duration: '2m 45s', outcome: 'Callback Tomorrow', notes: 'Wife will join the call tomorrow at 11 AM.' },
          { leadName: 'Santosh Mishra', phone: '+91 98390 44603', time: '11:55 AM', duration: '4m 20s', outcome: 'Hot Lead Assigned', notes: 'Budget ₹1.2 Cr, assigned to Sneha Kapoor for villa visit.' },
        ],
        upcomingVisits: [],
        hotLeads: [
          { id: 'lead_sim_7', name: 'Kamal Nayan', phone: '+91 98390 44601', budget: '₹80 Lakh', property: '2 BHK Gomti Nagar', stage: 'Contacted', lastActivity: 'Qualified buyer confirmed' },
        ],
        deals: [
          { title: 'Rohtas Presidential Towers 2 BHK', value: '₹80 Lakh', commission: '₹1.60 Lakh', stage: 'Qualified Pipeline', status: 'Active' },
        ],
      },
      {
        id: 'sim_agent_6',
        name: 'Neha Gupta',
        designation: 'Leasing & Rental Manager',
        email: 'neha.gupta@diksharealestate.com',
        phone: '+91 98390 12006',
        checkIn: '10:15 AM',
        status: 'late' as const,
        callsToday: 3,
        visitsToday: 0,
        followupsDone: 1,
        overdue: 3, // Urgent attention!
        totalLeads: 15,
        pipelineValue: 7500000,
        recentCalls: [
          { leadName: 'Praveen Kohli', phone: '+91 98390 44701', time: '10:45 AM', duration: '1m 20s', outcome: 'Follow-up Overdue', notes: 'Commercial client waiting for lease agreement draft.' },
          { leadName: 'Anil Tandon', phone: '+91 98390 44702', time: '09:30 AM', duration: '0m 45s', outcome: 'No Response', notes: 'Overdue rent collection follow-up.' },
        ],
        upcomingVisits: [],
        hotLeads: [
          { id: 'lead_sim_9', name: 'Praveen Kohli', phone: '+91 98390 44701', budget: '₹45,000/mo', property: 'Commercial Lease', stage: 'Follow-Up', lastActivity: 'Lease draft pending' },
        ],
        deals: [
          { title: 'Cyber Heights 1800 sqft Office Lease', value: '₹5.40 Lakh/yr', commission: '₹45,000', stage: 'Lease Agreement', status: 'Active' },
        ],
      },
      {
        id: 'sim_agent_7',
        name: 'Rahul Mehra',
        designation: 'Plot & Land Specialist',
        email: 'rahul.mehra@diksharealestate.com',
        phone: '+91 98390 12007',
        checkIn: '09:20 AM',
        status: 'checked_in' as const,
        callsToday: 17,
        visitsToday: 2,
        followupsDone: 7,
        overdue: 0,
        totalLeads: 18,
        pipelineValue: 29000000,
        recentCalls: [
          { leadName: 'Mukesh Bansal', phone: '+91 98390 44801', time: '12:50 PM', duration: '7m 15s', outcome: 'Token Registry Date Set', notes: 'Agreed on ₹3,500/sqft for Kisan Path plot.' },
          { leadName: 'Harish Saxena', phone: '+91 98390 44802', time: '11:15 AM', duration: '4m 00s', outcome: 'Map Approval Sent', notes: 'Sent Lucknow Development Authority (LDA) zoning approval.' },
        ],
        upcomingVisits: [
          { leadName: 'Mukesh Bansal', phone: '+91 98390 44801', property: 'Kisan Path Gated Plot', location: 'Near Indira Canal, Kisan Path, Lucknow', time: '04:15 PM', status: 'Confirmed', notes: 'Registry paperwork token collection.' },
          { leadName: 'Harish Saxena', phone: '+91 98390 44802', property: 'Sultanpur Road Farm Land', location: 'Gosainganj, Sultanpur Road', time: '05:45 PM', status: 'Scheduled', notes: 'Inspection of boundary fencing.' },
        ],
        hotLeads: [
          { id: 'lead_sim_10', name: 'Mukesh Bansal', phone: '+91 98390 44801', budget: '₹75 Lakh', property: '2150 sqft Plot', stage: 'Negotiation', lastActivity: 'Registry date agreed' },
        ],
        deals: [
          { title: 'Kisan Path Gated Township Plot #42', value: '₹75 Lakh', commission: '₹1.50 Lakh', stage: 'Token Stage', status: 'Active' },
        ],
      },
      {
        id: 'sim_agent_8',
        name: 'Ananya Joshi',
        designation: 'Client Relationship Officer',
        email: 'ananya.joshi@diksharealestate.com',
        phone: '+91 98390 12008',
        checkIn: '09:30 AM',
        status: 'checked_in' as const,
        callsToday: 13,
        visitsToday: 1,
        followupsDone: 5,
        overdue: 0,
        totalLeads: 11,
        pipelineValue: 14000000,
        recentCalls: [
          { leadName: 'Tanya Dewan', phone: '+91 98390 44901', time: '01:10 PM', duration: '4m 30s', outcome: 'Brochure Sent via WhatsApp', notes: 'Interested in luxury 3 BHK at Experion Capital.' },
          { leadName: 'Gaurav Shukla', phone: '+91 98390 44902', time: '11:25 AM', duration: '3m 10s', outcome: 'Callback Completed', notes: 'Explained home loan pre-approval process.' },
        ],
        upcomingVisits: [
          { leadName: 'Tanya Dewan', phone: '+91 98390 44901', property: 'Experion Capital 3 BHK', location: 'Vibhuti Khand, Gomti Nagar', time: '05:30 PM', status: 'Scheduled', notes: 'Showing sample flat.' },
        ],
        hotLeads: [
          { id: 'lead_sim_11', name: 'Tanya Dewan', phone: '+91 98390 44901', budget: '₹1.35 Cr', property: '3 BHK Flat', stage: 'Site Visit', lastActivity: 'Sample flat visit scheduled' },
        ],
        deals: [
          { title: 'Experion Capital Tower 1 Flat #803', value: '₹1.35 Cr', commission: '₹2.70 Lakh', stage: 'Site Visit', status: 'Active' },
        ],
      },
      {
        id: 'sim_agent_9',
        name: 'Rohit Patel',
        designation: 'Junior Associate',
        email: 'rohit.patel@diksharealestate.com',
        phone: '+91 98390 12009',
        checkIn: '—',
        status: 'on_leave' as const,
        callsToday: 0,
        visitsToday: 0,
        followupsDone: 0,
        overdue: 0,
        totalLeads: 8,
        pipelineValue: 9000000,
        recentCalls: [],
        upcomingVisits: [],
        hotLeads: [],
        deals: [],
      },
      {
        id: 'sim_agent_10',
        name: 'Priya Verma',
        designation: 'Associate Sales Executive',
        email: 'priya.verma@diksharealestate.com',
        phone: '+91 98390 12010',
        checkIn: '10:02 AM',
        status: 'checked_in' as const,
        callsToday: 6,
        visitsToday: 0,
        followupsDone: 2,
        overdue: 2, // Needs attention
        totalLeads: 9,
        pipelineValue: 11000000,
        recentCalls: [
          { leadName: 'Gaurav Shukla', phone: '+91 98390 44902', time: '11:25 AM', duration: '2m 00s', outcome: 'Callback Requested', notes: 'Client enquired about 2 BHK possession date.' },
        ],
        upcomingVisits: [],
        hotLeads: [
          { id: 'lead_sim_12', name: 'Gaurav Shukla', phone: '+91 98390 44902', budget: '₹65 Lakh', property: '2 BHK Apartment', stage: 'Follow-Up', lastActivity: 'Callback requested' },
        ],
        deals: [
          { title: 'Bhartiya City 2 BHK Apartment', value: '₹65 Lakh', commission: '₹1.30 Lakh', stage: 'Follow-Up', status: 'Active' },
        ],
      },
    ];

    // Build the combined list of agents (real organic + simulated team when fullTeam=true)
    const combinedAgents: Array<{
      id: string;
      name: string;
      designation: string;
      email: string;
      phone: string;
      checkIn: string;
      attendanceStatus: 'checked_in' | 'on_field' | 'on_leave' | 'absent' | 'late';
      callsToday: number;
      visitsToday: number;
      followupsDone: number;
      overdue: number;
      totalLeads: number;
      pipelineValue: number;
      recentCalls: Array<{ leadName: string; phone?: string; time: string; duration: string; outcome: string; notes?: string }>;
      upcomingVisits: Array<{ leadName: string; phone?: string; property: string; location?: string; time: string; status: string; notes?: string }>;
      hotLeads: Array<{ id: string; name: string; phone?: string; budget: string; property: string; stage: string; lastActivity?: string }>;
      deals?: Array<{ title: string; value: string; commission?: string; stage?: string; status: string }>;
    }> = [];

    // Map real employees from DB
    for (const re of realEmployees) {
      if (re.role === 'super_admin') continue; // HQ root handles super admin
      const assignedLeadsList = activeLeads
        .filter((l) => l.assigned_to === re.id)
        .slice(0, 4)
        .map((l) => ({
          id: l.id,
          name: l.full_name,
          phone: l.phone || '+91 98390 11000',
          budget: l.budget_max ? `₹${(l.budget_max / 100000).toFixed(0)} Lakh` : '₹50-80L',
          property: l.property_type || 'Residential',
          stage: l.status,
          lastActivity: 'Assigned recently',
        }));

      const callsToday = parseInt(re.today_calls || '0', 10);
      const visitsToday = parseInt(re.today_visits || '0', 10);
      const overdue = parseInt(re.overdue_followups || '0', 10);
      const followupsDone = parseInt(re.today_followups_done || '0', 10);
      const totalLeads = parseInt(re.total_leads || '0', 10);
      const pipelineVal = parseFloat(re.pipeline_value || '0');

      combinedAgents.push({
        id: re.id,
        name: re.name,
        designation: re.designation || 'Real Estate Specialist',
        email: re.email,
        phone: re.phone || '+91 98765 00000',
        checkIn: re.today_attendance?.punch_in ? new Date(re.today_attendance.punch_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (includeDemo ? '09:15 AM' : '—'),
        attendanceStatus: re.today_attendance?.status === 'present' ? 'checked_in' : (includeDemo ? 'checked_in' : 'absent'),
        callsToday: callsToday > 0 ? callsToday : (includeDemo ? 18 : 0),
        visitsToday: visitsToday > 0 ? visitsToday : (includeDemo ? 2 : 0),
        followupsDone: followupsDone > 0 ? followupsDone : (includeDemo ? 8 : 0),
        overdue: overdue > 0 ? overdue : 0,
        totalLeads: totalLeads > 0 ? totalLeads : (includeDemo ? 24 : 0),
        pipelineValue: pipelineVal > 0 ? pipelineVal : (includeDemo ? 18000000 : 0),
        recentCalls: includeDemo ? [
          { leadName: 'Aarav Joshi', phone: '+91 98390 45001', time: '12:15 PM', duration: '3m 40s', outcome: 'Follow-up Set', notes: 'Client requested builder floor comparison in Gomti Nagar.' },
          { leadName: 'Priya Sharma', phone: '+91 98390 45002', time: '11:05 AM', duration: '5m 12s', outcome: 'Interested in Villa', notes: 'Confirmed budget of ₹1.8 Cr. Discussed corner plots.' },
          { leadName: 'Naveen Pandey', phone: '+91 98390 45003', time: '10:15 AM', duration: '4m 00s', outcome: 'Office Visit Set', notes: 'Coming to office at 5 PM for registry formalities.' },
        ] : [],
        upcomingVisits: includeDemo ? [
          { leadName: 'Aarav Joshi', phone: '+91 98390 45001', property: 'Sushant Golf City Plot', location: 'Pocket 3, Sushant Golf City, Lucknow', time: '04:00 PM', status: 'Completed', notes: 'Client liked site boundaries.' },
          { leadName: 'Priya Sharma', phone: '+91 98390 45002', property: 'Gomti Nagar Extension Flat', location: 'Tower C, Shalimar Grand, Lucknow', time: '05:30 PM', status: 'Completed', notes: 'Family verified floor plan.' },
        ] : [],
        hotLeads: assignedLeadsList.length > 0 ? assignedLeadsList : (includeDemo ? [
          { id: 'lead_real_1', name: 'Aarav Joshi', phone: '+91 98390 45001', budget: '₹1.25 Cr', property: 'Commercial Shop', stage: 'Site Visit', lastActivity: 'Site visit completed 04:00 PM' },
          { id: 'lead_real_2', name: 'Priya Sharma', phone: '+91 98390 45002', budget: '₹1.00 Cr', property: '2 BHK Flat', stage: 'Negotiation', lastActivity: 'Discussed offer price' },
          { id: 'lead_real_3', name: 'Naveen Pandey', phone: '+91 98390 45003', budget: '₹85 Lakh', property: 'Penthouse', stage: 'Follow-Up', lastActivity: 'Meeting scheduled 5 PM' },
        ] : []),
        deals: includeDemo ? [
          { title: 'Sushant Golf City Block B Commercial Unit', value: '₹1.25 Cr', commission: '₹2.50 Lakh', stage: 'Token Advance', status: 'Active' },
          { title: 'Gomti Nagar Extension 3 BHK Luxury Flat', value: '₹1.00 Cr', commission: '₹2.00 Lakh', stage: 'Negotiation', status: 'Active' },
        ] : [],
      });
    }

    // Add simulated agents if demo is enabled and fullTeam mode is active
    if (includeDemo && fullTeam) {
      for (const sa of simulatedAgents) {
        combinedAgents.push({
          id: sa.id,
          name: sa.name,
          designation: sa.designation,
          email: sa.email,
          phone: sa.phone,
          checkIn: sa.checkIn,
          attendanceStatus: sa.status,
          callsToday: sa.callsToday,
          visitsToday: sa.visitsToday,
          followupsDone: sa.followupsDone,
          overdue: sa.overdue,
          totalLeads: sa.totalLeads,
          pipelineValue: sa.pipelineValue,
          recentCalls: sa.recentCalls,
          upcomingVisits: sa.upcomingVisits,
          hotLeads: sa.hotLeads,
          deals: sa.deals,
        });
      }
    }

    // Process nodes and links for each agent
    let totalOfficeCalls = 0;
    let totalOfficeVisits = 0;
    let totalOfficeFollowups = 0;
    let totalOfficeOverdue = 0;
    let totalOfficePipeline = 0;

    combinedAgents.forEach((agent, index) => {
      totalOfficeCalls += agent.callsToday;
      totalOfficeVisits += agent.visitsToday;
      totalOfficeFollowups += agent.followupsDone;
      totalOfficeOverdue += agent.overdue;
      totalOfficePipeline += agent.pipelineValue;

      // Determine health status
      let healthStatus: 'thriving' | 'active' | 'critical' | 'inactive' = 'active';
      let energyScore = 50;

      if (agent.attendanceStatus === 'on_leave' || agent.attendanceStatus === 'absent') {
        healthStatus = 'inactive';
        energyScore = 10;
      } else if (agent.overdue > 0) {
        healthStatus = 'critical';
        energyScore = Math.max(15, 45 - agent.overdue * 10);
      } else if (agent.callsToday >= 12 || agent.visitsToday >= 2) {
        healthStatus = 'thriving';
        energyScore = Math.min(100, 75 + agent.callsToday * 1.5 + agent.visitsToday * 5);
      } else {
        healthStatus = 'active';
        energyScore = 40 + agent.callsToday * 2;
      }

      // Agent Node
      const agentNode: NeuralNode = {
        id: agent.id,
        label: agent.name,
        type: 'agent',
        designation: agent.designation,
        email: agent.email,
        phone: agent.phone,
        healthStatus,
        energyScore: Math.round(energyScore),
        val: 22,
        attendance: {
          status: agent.attendanceStatus,
          checkInTime: agent.checkIn,
          location: agent.attendanceStatus === 'on_field' ? 'On Site Visit' : 'Head Office Lucknow',
        },
        metrics: {
          callsToday: agent.callsToday,
          visitsToday: agent.visitsToday,
          followupsDone: agent.followupsDone,
          followupsOverdue: agent.overdue,
          totalLeads: agent.totalLeads,
          pipelineValue: agent.pipelineValue,
          dealsMonth: agent.visitsToday > 0 ? 1 : 0,
        },
        details: {
          recentCalls: agent.recentCalls,
          upcomingVisits: agent.upcomingVisits,
          hotLeads: agent.hotLeads,
          deals: agent.deals && agent.deals.length > 0 ? agent.deals : [
            { title: `${agent.name}'s Active Pipeline`, value: `₹${(agent.pipelineValue / 10000000).toFixed(2)} Cr`, commission: `₹${((agent.pipelineValue * 0.02) / 100000).toFixed(1)} Lakh`, stage: 'Negotiation', status: 'Active' },
          ],
        },
      };
      nodes.push(agentNode);

      // Edge from HQ Root to Agent
      let pulseSpeed = 1.0;
      let lineColor = '#f59e0b'; // Amber / Gold default
      let particlesCount = 4;

      if (healthStatus === 'thriving') {
        pulseSpeed = 2.4;
        lineColor = '#10b981'; // Emerald
        particlesCount = 8;
      } else if (healthStatus === 'critical') {
        pulseSpeed = 0.7;
        lineColor = '#ef4444'; // Red Heartbeat
        particlesCount = 3;
      } else if (healthStatus === 'inactive') {
        pulseSpeed = 0;
        lineColor = '#475569'; // Muted Slate
        particlesCount = 0;
      }

      links.push({
        source: 'hub_root',
        target: agent.id,
        type: 'hub_to_agent',
        pulseSpeed,
        color: lineColor,
        particlesCount,
        status: healthStatus,
        label: `${agent.callsToday} calls`,
      });

      // Sub-Nodes for interactive bloom/expansion
      // Sub 1: Calls
      const callsNodeId = `calls_${agent.id}`;
      nodes.push({
        id: callsNodeId,
        parentId: agent.id,
        label: `${agent.callsToday} Calls`,
        type: 'sub_calls',
        val: 12,
        metrics: {
          callsToday: agent.callsToday,
          visitsToday: 0,
          followupsDone: 0,
          followupsOverdue: 0,
          totalLeads: 0,
          pipelineValue: 0,
          dealsMonth: 0,
        },
        details: { recentCalls: agent.recentCalls },
      });
      links.push({
        source: agent.id,
        target: callsNodeId,
        type: 'agent_to_sub',
        pulseSpeed: agent.callsToday > 0 ? 1.5 : 0.5,
        color: agent.callsToday >= 10 ? '#10b981' : '#f59e0b',
        particlesCount: 2,
      });

      // Sub 2: Visits
      const visitsNodeId = `visits_${agent.id}`;
      nodes.push({
        id: visitsNodeId,
        parentId: agent.id,
        label: `${agent.visitsToday} Visits`,
        type: 'sub_visits',
        val: 12,
        metrics: {
          callsToday: 0,
          visitsToday: agent.visitsToday,
          followupsDone: 0,
          followupsOverdue: 0,
          totalLeads: 0,
          pipelineValue: 0,
          dealsMonth: 0,
        },
        details: { upcomingVisits: agent.upcomingVisits },
      });
      links.push({
        source: agent.id,
        target: visitsNodeId,
        type: 'agent_to_sub',
        pulseSpeed: agent.visitsToday > 0 ? 2.0 : 0.5,
        color: agent.visitsToday > 0 ? '#06b6d4' : '#64748b', // Cyan for visits
        particlesCount: agent.visitsToday > 0 ? 3 : 1,
      });

      // Sub 3: Hot Leads
      const leadsNodeId = `leads_${agent.id}`;
      nodes.push({
        id: leadsNodeId,
        parentId: agent.id,
        label: `${agent.hotLeads.length} Hot Leads`,
        type: 'sub_leads',
        val: 12,
        metrics: {
          callsToday: 0,
          visitsToday: 0,
          followupsDone: 0,
          followupsOverdue: 0,
          totalLeads: agent.totalLeads,
          pipelineValue: agent.pipelineValue,
          dealsMonth: 0,
        },
        details: { hotLeads: agent.hotLeads },
      });
      links.push({
        source: agent.id,
        target: leadsNodeId,
        type: 'agent_to_sub',
        pulseSpeed: 1.2,
        color: '#8b5cf6', // Violet for Leads
        particlesCount: 2,
      });

      // Sub 4: Pipeline / Deals
      const dealsNodeId = `deals_${agent.id}`;
      const pipelineLakh = (agent.pipelineValue / 10000000).toFixed(1);
      nodes.push({
        id: dealsNodeId,
        parentId: agent.id,
        label: `₹${pipelineLakh} Cr Deals`,
        type: 'sub_deals',
        val: 12,
        metrics: {
          callsToday: 0,
          visitsToday: 0,
          followupsDone: 0,
          followupsOverdue: 0,
          totalLeads: 0,
          pipelineValue: agent.pipelineValue,
          dealsMonth: 0,
        },
      });
      links.push({
        source: agent.id,
        target: dealsNodeId,
        type: 'agent_to_sub',
        pulseSpeed: 1.0,
        color: '#f59e0b', // Gold for Money/Deals
        particlesCount: 2,
      });
    });

    // Update root node totals
    if (rootNode.metrics) {
      rootNode.metrics.callsToday = totalOfficeCalls;
      rootNode.metrics.visitsToday = totalOfficeVisits;
      rootNode.metrics.followupsDone = totalOfficeFollowups;
      rootNode.metrics.followupsOverdue = totalOfficeOverdue;
      rootNode.metrics.pipelineValue = totalOfficePipeline;
    }

    return NextResponse.json({
      success: true,
      mode,
      summary: {
        onlineAgents: combinedAgents.filter((a) => a.attendanceStatus !== 'on_leave' && a.attendanceStatus !== 'absent').length,
        totalAgents: combinedAgents.length,
        todayCalls: totalOfficeCalls,
        todayVisits: totalOfficeVisits,
        overdueAlerts: totalOfficeOverdue,
        pipelineValue: totalOfficePipeline,
      },
      nodes,
      links,
    });
  } catch (err: unknown) {
    console.error('Neural graph API error:', err);
    return NextResponse.json({ error: 'Failed to generate neural graph' }, { status: 500 });
  }
}
