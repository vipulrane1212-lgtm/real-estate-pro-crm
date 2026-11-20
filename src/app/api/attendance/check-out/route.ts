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
        { error: 'Location permission is required for attendance check-out.' },
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
      const filename = `checkout-${timestamp}.jpg`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'attendance', auth.userId);
      await fs.mkdir(uploadDir, { recursive: true });
      await fs.writeFile(path.join(uploadDir, filename), buffer);
      finalSelfieUrl = `/uploads/attendance/${auth.userId}/${filename}`;
    }

    // 3. Verify Today's Check-in Record
    const todayCheck = await query<{ id: string; check_in: string; check_out: string; out_time_str: string }>(
      `SELECT id, check_in, check_out, TO_CHAR(check_out, 'HH12:MI AM') as out_time_str 
       FROM public.attendance 
       WHERE employee_id = $1 AND date = CURRENT_DATE`,
      [employeeId]
    );

    if (todayCheck.length === 0 || !todayCheck[0].check_in) {
      return NextResponse.json(
        { error: 'No check-in record found for today. You must check in before checking out.' },
        { status: 400 }
      );
    }

    if (todayCheck[0].check_out) {
      return NextResponse.json(
        { error: `You have already checked out today at ${todayCheck[0].out_time_str}.` },
        { status: 400 }
      );
    }

    const finalAddress = address && address.trim() 
      ? address.trim() 
      : `GPS: ${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`;

    const sql = `
      UPDATE public.attendance
      SET check_out = now(),
          check_out_selfie_url = $1,
          check_out_latitude = $2,
          check_out_longitude = $3,
          check_out_address = $4,
          notes = COALESCE($5::text, notes)
      WHERE id = $6
      RETURNING *
    `;

    const rows = await query<AttendanceRecord>(sql, [
      finalSelfieUrl,
      Number(latitude),
      Number(longitude),
      finalAddress,
      notes || null,
      todayCheck[0].id,
    ]);

    return NextResponse.json({
      success: true,
      message: 'Check-out recorded successfully',
      attendance: rows[0],
    });
  } catch (err: unknown) {
    console.error('Check-out error:', err);
    return NextResponse.json({ error: 'Failed to record check-out' }, { status: 500 });
  }
}
