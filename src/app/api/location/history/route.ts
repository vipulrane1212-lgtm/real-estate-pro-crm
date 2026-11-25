import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import { shouldIncludeDemo } from '@/lib/db/demo-filter';

export const dynamic = 'force-dynamic';

export interface LocationBreadcrumb {
  id: string;
  latitude: number;
  longitude: number;
  speed_kmh: number;
  battery_level: number;
  activity_type: string;
  address: string;
  timestamp: string;
  time_label: string;
}

// Generate realistic Lucknow route history for showcase agents
function generateDemoRoute(agentId: string, dateStr: string): LocationBreadcrumb[] {
  // Common Lucknow checkpoints:
  // 1. Diksha Head Office (Vibhuti Khand, Gomti Nagar) [26.8654, 80.9982]
  // 2. Patrakarpuram Crossing, Gomti Nagar [26.8582, 80.9950]
  // 3. Gomti Greens Villa Plot, Extension [26.8524, 81.0112]
  // 4. Shaheed Path Junction near Ekana Stadium [26.8042, 81.0021]
  // 5. Phoenix Palassio Mall, Shaheed Path [26.8012, 81.0010]
  // 6. Sushant Golf City Main Gate [26.7901, 80.9990]
  // 7. Sector 7 Corner Plot, Sushant Golf City [26.7865, 80.9982]
  // 8. Omaxe City Plots, Amar Shaheed Path [26.7750, 80.9750]

  const waypoints = [
    { lat: 26.8654, lng: 80.9982, speed: 0, battery: 100, act: 'stationary', time: '09:30 AM', addr: 'Diksha Real Estate HQ, Vibhuti Khand, Lucknow' },
    { lat: 26.8630, lng: 80.9970, speed: 22, battery: 98, act: 'in_vehicle', time: '09:45 AM', addr: 'Vibhuti Khand Flyover' },
    { lat: 26.8582, lng: 80.9950, speed: 18, battery: 96, act: 'in_vehicle', time: '10:05 AM', addr: 'Patrakarpuram Crossing, Gomti Nagar' },
    { lat: 26.8524, lng: 81.0112, speed: 0, battery: 93, act: 'stationary', time: '10:25 AM', addr: 'Client Showing: Gomti Greens Villa Plot #108' },
    { lat: 26.8450, lng: 81.0100, speed: 32, battery: 90, act: 'in_vehicle', time: '11:15 AM', addr: 'Shaheed Path Service Road' },
    { lat: 26.8210, lng: 81.0050, speed: 45, battery: 88, act: 'in_vehicle', time: '11:35 AM', addr: 'Amar Shaheed Path Highway (Near Ekana Stadium)' },
    { lat: 26.8012, lng: 81.0010, speed: 15, battery: 86, act: 'in_vehicle', time: '11:55 AM', addr: 'Phoenix Palassio Roundabout' },
    { lat: 26.7901, lng: 80.9990, speed: 20, battery: 84, act: 'in_vehicle', time: '12:15 PM', addr: 'Sushant Golf City Main Arch Gate' },
    { lat: 26.7865, lng: 80.9982, speed: 0, battery: 82, act: 'stationary', time: '12:30 PM', addr: 'Inspection: Sushant Golf City Sector 7 Plot' },
    { lat: 26.7870, lng: 80.9980, speed: 2, battery: 80, act: 'walking', time: '01:10 PM', addr: 'Walking boundary pillars with buyer' },
    { lat: 26.7865, lng: 80.9982, speed: 0, battery: 78, act: 'stationary', time: '02:00 PM', addr: 'Token Discussion at Site Office' },
  ];

  return waypoints.map((wp, i) => ({
    id: `demo_pt_${i}`,
    latitude: wp.lat,
    longitude: wp.lng,
    speed_kmh: wp.speed,
    battery_level: wp.battery,
    activity_type: wp.act,
    address: wp.addr,
    timestamp: `${dateStr}T${wp.time}:00Z`,
    time_label: wp.time,
  }));
}

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];

    if (!employeeId) {
      return NextResponse.json({ error: 'employee_id query param is required' }, { status: 400 });
    }

    const includeDemo = shouldIncludeDemo(request);

    // If demo agent or demo mode requested
    if (employeeId.startsWith('sim_') || (includeDemo && employeeId === 'demo')) {
      const demoTrail = generateDemoRoute(employeeId, dateStr);
      return NextResponse.json({
        employee_id: employeeId,
        date: dateStr,
        route: demoTrail,
        total_points: demoTrail.length,
        is_demo: true,
      });
    }

    // Real database query
    const rows = await query<{
      id: string;
      latitude: number;
      longitude: number;
      speed: number | null;
      battery_level: number | null;
      activity_type: string | null;
      address: string | null;
      recorded_at: string;
    }>(
      `
      SELECT 
        id,
        latitude,
        longitude,
        speed,
        battery_level,
        activity_type,
        address,
        recorded_at
      FROM public.employee_location_logs
      WHERE employee_id = $1 
        AND DATE(recorded_at) = $2::date
        ${includeDemo ? '' : 'AND (is_demo IS FALSE OR is_demo IS NULL)'}
      ORDER BY recorded_at ASC
    `,
      [employeeId, dateStr]
    );

    const route: LocationBreadcrumb[] = rows.map((r) => {
      const d = new Date(r.recorded_at);
      return {
        id: r.id,
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
        speed_kmh: r.speed !== null ? Number(r.speed) : 0,
        battery_level: r.battery_level !== null ? Number(r.battery_level) : 100,
        activity_type: r.activity_type || 'stationary',
        address: r.address || `GPS: ${Number(r.latitude).toFixed(5)}, ${Number(r.longitude).toFixed(5)}`,
        timestamp: r.recorded_at,
        time_label: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    });

    // If real employee has no logs for today, but demo mode is ON, generate a route for testing
    if (route.length === 0 && includeDemo) {
      const fallbackDemo = generateDemoRoute(employeeId, dateStr);
      return NextResponse.json({
        employee_id: employeeId,
        date: dateStr,
        route: fallbackDemo,
        total_points: fallbackDemo.length,
        is_demo: true,
      });
    }

    return NextResponse.json({
      employee_id: employeeId,
      date: dateStr,
      route,
      total_points: route.length,
      is_demo: false,
    });
  } catch (err: unknown) {
    console.error('Error fetching location history:', err);
    return NextResponse.json({ error: 'Failed to fetch location history' }, { status: 500 });
  }
}
