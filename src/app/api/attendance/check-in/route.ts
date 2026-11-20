import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import { AttendanceRecord } from '@/lib/supabase/types';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employeeId = auth.employeeId;
    if (!employeeId) {
      return NextResponse.json({ error: 'No active employee profile associated with this account' }, { status: 400 });
    }

    const body = await request.json();
    const {
      latitude,
      longitude,
      address,
      selfie_url,
      selfie_base64,
      notes,
    } = body;

    // 1. Mandatory Location Enforcement
    if (
      latitude === undefined ||
      latitude === null ||
      longitude === undefined ||
      longitude === null ||
      isNaN(Number(latitude)) ||
      isNaN(Number(longitude))
    ) {
      return NextResponse.json(
        { error: 'Location permission is required. Check-in cannot be recorded without GPS coordinates.' },
        { status: 400 }
      );
    }

    // 2. Mandatory Selfie Enforcement
    let finalSelfieUrl = selfie_url;
    if (!finalSelfieUrl && !selfie_base64) {
      return NextResponse.json(
        { error: 'Live camera selfie is required. Gallery uploads are disabled.' },
        { status: 400 }
      );
    }

    // Handle base64 camera snapshot saved to local uploads
    if (!finalSelfieUrl && selfie_base64) {
      const base64Data = selfie_base64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const timestamp = Date.now();
      const filename = `selfie-${timestamp}.jpg`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'attendance', auth.userId);
      await fs.mkdir(uploadDir, { recursive: true });
      await fs.writeFile(path.join(uploadDir, filename), buffer);
      finalSelfieUrl = `/uploads/attendance/${auth.userId}/${filename}`;
    }

    // 3. Strict Single Check-in Per Day Enforcement
    const todayCheck = await query<{ id: string; check_in: string; time_str: string }>(
      `SELECT id, check_in, TO_CHAR(check_in, 'HH12:MI AM') as time_str 
       FROM public.attendance 
       WHERE employee_id = $1 AND date = CURRENT_DATE`,
      [employeeId]
    );

    if (todayCheck.length > 0 && todayCheck[0].check_in) {
      return NextResponse.json(
        {
          error: `You have already checked in today at ${todayCheck[0].time_str}. A second check-in is not permitted.`,
        },
        { status: 400 }
      );
    }

    // 4. Determine On-Time vs Late (Threshold: 10:00 AM IST)
    const now = new Date();
    // Convert to Indian Standard Time (UTC+5:30)
    const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    const istHours = istTime.getUTCHours();
    const istMinutes = istTime.getUTCMinutes();
    const isLate = istHours > 10 || (istHours === 10 && istMinutes > 0);
    const status = isLate ? 'late' : 'present';

    const finalAddress = address && address.trim() 
      ? address.trim() 
      : `GPS: ${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`;

    const sql = `
      INSERT INTO public.attendance (
        employee_id,
        date,
        check_in,
        check_in_selfie_url,
        check_in_latitude,
        check_in_longitude,
        check_in_address,
        status,
        is_late,
        notes
      ) VALUES ($1, CURRENT_DATE, now(), $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (employee_id, date) DO UPDATE SET
        check_in = now(),
        check_in_selfie_url = EXCLUDED.check_in_selfie_url,
        check_in_latitude = EXCLUDED.check_in_latitude,
        check_in_longitude = EXCLUDED.check_in_longitude,
        check_in_address = EXCLUDED.check_in_address,
        status = EXCLUDED.status,
        is_late = EXCLUDED.is_late
      RETURNING *
    `;

    const rows = await query<AttendanceRecord>(sql, [
      employeeId,
      finalSelfieUrl,
      Number(latitude),
      Number(longitude),
      finalAddress,
      status,
      isLate,
      notes || (isLate ? 'Checked in late after 10:00 AM' : 'On-time check-in'),
    ]);

    return NextResponse.json({
      success: true,
      message: isLate ? 'Check-in recorded (Marked Late - after 10:00 AM)' : 'Check-in recorded successfully (Present)',
      attendance: rows[0],
    });
  } catch (err: unknown) {
    console.error('Check-in error:', err);
    return NextResponse.json({ error: 'Failed to record check-in' }, { status: 500 });
  }
}
