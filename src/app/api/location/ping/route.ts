import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employeeId = auth.employeeId;
    if (!employeeId) {
      return NextResponse.json(
        { error: 'No active employee profile linked to this account.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      latitude,
      longitude,
      accuracy = null,
      speed = null,
      heading = null,
      battery_level = null,
      is_charging = false,
      activity_type = 'stationary',
      address = null,
      is_mock = false,
    } = body;

    // Validate coordinates
    if (
      latitude === undefined ||
      latitude === null ||
      longitude === undefined ||
      longitude === null ||
      isNaN(Number(latitude)) ||
      isNaN(Number(longitude))
    ) {
      return NextResponse.json(
        { error: 'Valid latitude and longitude numbers are required.' },
        { status: 400 }
      );
    }

    const lat = Number(latitude);
    const lng = Number(longitude);
    const recordedAt = new Date().toISOString();

    // 1. Insert into historical breadcrumb logs
    await query(
      `
      INSERT INTO public.employee_location_logs (
        employee_id,
        latitude,
        longitude,
        accuracy,
        speed,
        heading,
        battery_level,
        is_charging,
        activity_type,
        address,
        is_mock,
        is_demo,
        recorded_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, $12)
    `,
      [
        employeeId,
        lat,
        lng,
        accuracy !== null ? Number(accuracy) : null,
        speed !== null ? Number(speed) : null,
        heading !== null ? Number(heading) : null,
        battery_level !== null ? Number(battery_level) : null,
        Boolean(is_charging),
        activity_type || 'stationary',
        address || `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        Boolean(is_mock),
        recordedAt,
      ]
    );

    // 2. Update employee's cached latest coordinates for zero-latency radar queries
    await query(
      `
      UPDATE public.employees
      SET 
        last_latitude = $1,
        last_longitude = $2,
        last_location_address = $3,
        last_location_at = $4,
        last_battery_level = $5,
        last_speed = $6,
        last_activity_type = $7,
        updated_at = now()
      WHERE id = $8
    `,
      [
        lat,
        lng,
        address || `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        recordedAt,
        battery_level !== null ? Number(battery_level) : null,
        speed !== null ? Number(speed) : null,
        activity_type || 'stationary',
        employeeId,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Location ping recorded successfully',
      recorded_at: recordedAt,
    });
  } catch (err: unknown) {
    console.error('Error recording location ping:', err);
    return NextResponse.json(
      { error: 'Internal server error while recording location ping.' },
      { status: 500 }
    );
  }
}
