import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import { shouldIncludeDemo } from '@/lib/db/demo-filter';

export const dynamic = 'force-dynamic';

export interface LiveFleetAgent {
  employee_id: string;
  name: string;
  designation: string;
  phone: string;
  role: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed_kmh: number;
  battery_level: number;
  is_charging: boolean;
  activity_type: 'stationary' | 'walking' | 'in_vehicle' | 'unknown';
  status: 'moving' | 'stationary' | 'offline';
  address: string;
  last_ping_at: string;
  is_on_duty: boolean;
  punch_in_time?: string;
  today_visits_count: number;
  today_calls_count: number;
  is_demo?: boolean;
}

// Simulated Lucknow Agents for Showcase Mode
const DEMO_LUCKNOW_AGENTS: LiveFleetAgent[] = [
  {
    employee_id: 'sim_agent_deepak',
    name: 'Deepak Yadav',
    designation: 'Field Inspection Coordinator',
    phone: '+91 98390 12005',
    role: 'employee',
    latitude: 26.7865,
    longitude: 80.9982,
    accuracy: 8.5,
    speed_kmh: 24.5,
    battery_level: 82,
    is_charging: false,
    activity_type: 'in_vehicle',
    status: 'moving',
    address: 'Sector 7, Sushant Golf City, Amar Shaheed Path, Lucknow',
    last_ping_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    is_on_duty: true,
    punch_in_time: '09:35 AM',
    today_visits_count: 4,
    today_calls_count: 7,
    is_demo: true,
  },
  {
    employee_id: 'sim_agent_priya',
    name: 'Priya Mishra',
    designation: 'Senior Sales Agent',
    phone: '+91 98390 12002',
    role: 'employee',
    latitude: 26.8524,
    longitude: 81.0112,
    accuracy: 5.0,
    speed_kmh: 0,
    battery_level: 91,
    is_charging: true,
    activity_type: 'stationary',
    status: 'stationary',
    address: 'Gomti Greens Villa Plot #108, Gomti Nagar Extension, Lucknow',
    last_ping_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    is_on_duty: true,
    punch_in_time: '09:45 AM',
    today_visits_count: 2,
    today_calls_count: 5,
    is_demo: true,
  },
  {
    employee_id: 'sim_agent_sneha',
    name: 'Sneha Kapoor',
    designation: 'Luxury Villas Specialist',
    phone: '+91 98390 12003',
    role: 'employee',
    latitude: 26.8612,
    longitude: 80.9856,
    accuracy: 6.2,
    speed_kmh: 0,
    battery_level: 68,
    is_charging: false,
    activity_type: 'stationary',
    status: 'stationary',
    address: 'Eldeco Greens 4 BHK Villa, Sector C, Gomti Nagar, Lucknow',
    last_ping_at: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
    is_on_duty: true,
    punch_in_time: '09:28 AM',
    today_visits_count: 3,
    today_calls_count: 15,
    is_demo: true,
  },
  {
    employee_id: 'sim_agent_rahul',
    name: 'Rahul Mehra',
    designation: 'Plot & Land Specialist',
    phone: '+91 98390 12007',
    role: 'employee',
    latitude: 26.8123,
    longitude: 81.0456,
    accuracy: 12.0,
    speed_kmh: 38.0,
    battery_level: 54,
    is_charging: false,
    activity_type: 'in_vehicle',
    status: 'moving',
    address: 'Near Indira Canal Roundabout, Kisan Path, Lucknow',
    last_ping_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    is_on_duty: true,
    punch_in_time: '09:20 AM',
    today_visits_count: 2,
    today_calls_count: 17,
    is_demo: true,
  },
  {
    employee_id: 'sim_agent_ananya',
    name: 'Ananya Joshi',
    designation: 'Client Relationship Officer',
    phone: '+91 98390 12008',
    role: 'employee',
    latitude: 26.8689,
    longitude: 81.0012,
    accuracy: 4.5,
    speed_kmh: 0,
    battery_level: 78,
    is_charging: false,
    activity_type: 'stationary',
    status: 'stationary',
    address: 'Experion Capital Tower 1, Vibhuti Khand, Gomti Nagar, Lucknow',
    last_ping_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    is_on_duty: true,
    punch_in_time: '09:30 AM',
    today_visits_count: 1,
    today_calls_count: 13,
    is_demo: true,
  },
  {
    employee_id: 'sim_agent_amit',
    name: 'Amit Verma',
    designation: 'Commercial Asset Executive',
    phone: '+91 98390 12001',
    role: 'employee',
    latitude: 26.8467,
    longitude: 80.9461,
    accuracy: 7.0,
    speed_kmh: 18.0,
    battery_level: 22, // Low battery warning
    is_charging: false,
    activity_type: 'in_vehicle',
    status: 'moving',
    address: 'Mahatma Gandhi Marg, Hazratganj Commercial Hub, Lucknow',
    last_ping_at: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    is_on_duty: true,
    punch_in_time: '10:20 AM',
    today_visits_count: 0,
    today_calls_count: 3,
    is_demo: true,
  },
  {
    employee_id: 'sim_agent_vikram',
    name: 'Vikram Malhotra',
    designation: 'Commercial Leasing Manager',
    phone: '+91 98390 12006',
    role: 'employee',
    latitude: 26.8624,
    longitude: 80.9995,
    accuracy: 9.0,
    speed_kmh: 0,
    battery_level: 65,
    is_charging: true,
    activity_type: 'stationary',
    status: 'stationary',
    address: 'Cyber Heights Commercial Tower, Vibhuti Khand, Lucknow',
    last_ping_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    is_on_duty: true,
    punch_in_time: '09:40 AM',
    today_visits_count: 1,
    today_calls_count: 9,
    is_demo: true,
  },
];

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const includeDemo = shouldIncludeDemo(request);

    // 1. Fetch real active employees from database
    const empRows = await query<{
      id: string;
      name: string;
      designation: string;
      phone: string;
      role: string;
      last_latitude: number | null;
      last_longitude: number | null;
      last_location_address: string | null;
      last_location_at: string | null;
      last_battery_level: number | null;
      last_speed: number | null;
      last_activity_type: string | null;
      today_attendance_id: string | null;
      check_in_time: string | null;
      today_visits: string;
      today_calls: string;
    }>(`
      SELECT 
        e.id,
        p.full_name as name,
        e.designation,
        p.phone,
        p.role,
        e.last_latitude,
        e.last_longitude,
        e.last_location_address,
        e.last_location_at,
        e.last_battery_level,
        e.last_speed,
        e.last_activity_type,
        a.id as today_attendance_id,
        a.check_in as check_in_time,
        (SELECT COUNT(*) FROM public.site_visits v WHERE v.assigned_to = e.id AND DATE(v.visit_date) = CURRENT_DATE) as today_visits,
        (SELECT COUNT(*) FROM public.calls c WHERE c.employee_id = e.id AND DATE(c.created_at) = CURRENT_DATE) as today_calls
      FROM public.employees e
      JOIN public.profiles p ON e.user_id = p.id
      LEFT JOIN public.attendance a ON a.employee_id = e.id AND a.date = CURRENT_DATE
      WHERE e.is_active = true
      ORDER BY p.full_name ASC
    `);

    const realAgents: LiveFleetAgent[] = [];

    for (const r of empRows) {
      if (r.role === 'super_admin' && !r.last_latitude) continue;

      const hasCoordinates = r.last_latitude !== null && r.last_longitude !== null;
      const speed = r.last_speed !== null ? Number(r.last_speed) : 0;
      const lastPingTime = r.last_location_at || r.check_in_time || null;

      // Only include real employees who have punched in or sent a GPS ping
      if (hasCoordinates) {
        realAgents.push({
          employee_id: r.id,
          name: r.name,
          designation: r.designation,
          phone: r.phone || '—',
          role: r.role,
          latitude: Number(r.last_latitude),
          longitude: Number(r.last_longitude),
          accuracy: 10,
          speed_kmh: speed,
          battery_level: r.last_battery_level !== null ? Number(r.last_battery_level) : 100,
          is_charging: false,
          activity_type: (r.last_activity_type as LiveFleetAgent['activity_type']) || 'stationary',
          status: speed > 5 ? 'moving' : 'stationary',
          address: r.last_location_address || `Lucknow, Uttar Pradesh`,
          last_ping_at: lastPingTime || new Date().toISOString(),
          is_on_duty: Boolean(r.today_attendance_id),
          punch_in_time: r.check_in_time
            ? new Date(r.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : undefined,
          today_visits_count: parseInt(r.today_visits || '0', 10),
          today_calls_count: parseInt(r.today_calls || '0', 10),
          is_demo: false,
        });
      }
    }

    // Combine: If demo mode is ON, include the rich Lucknow fleet simulation
    let combinedAgents: LiveFleetAgent[] = [];
    if (includeDemo) {
      combinedAgents = [...realAgents, ...DEMO_LUCKNOW_AGENTS];
    } else {
      combinedAgents = realAgents;
    }

    // Summary calculations
    const totalOnDuty = combinedAgents.filter((a) => a.is_on_duty).length;
    const moving = combinedAgents.filter((a) => a.status === 'moving').length;
    const stationary = combinedAgents.filter((a) => a.status === 'stationary').length;
    const batteryLow = combinedAgents.filter((a) => a.battery_level <= 25).length;

    return NextResponse.json({
      agents: combinedAgents,
      summary: {
        total_tracked: combinedAgents.length,
        total_on_duty: totalOnDuty,
        moving,
        stationary,
        battery_low: batteryLow,
      },
      include_demo: includeDemo,
    });
  } catch (err: unknown) {
    console.error('Error fetching live fleet locations:', err);
    return NextResponse.json({ error: 'Failed to fetch live fleet locations' }, { status: 500 });
  }
}
