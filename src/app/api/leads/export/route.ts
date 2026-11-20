import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import { Lead } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';
    const location = searchParams.get('location') || '';

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (!auth.isAdmin) {
      if (!auth.employeeId) {
        return new NextResponse('', {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="leads.csv"',
          },
        });
      }
      params.push(auth.employeeId);
      conditions.push(`l.assigned_to = $${params.length}`);
    }

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`l.status = $${params.length}`);
    }

    if (type && type !== 'all') {
      params.push(type);
      conditions.push(`l.lead_type = $${params.length}`);
    }

    if (location && location !== 'all') {
      params.push(`%${location}%`);
      conditions.push(`(l.location ILIKE $${params.length} OR l.preferred_location ILIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        l.lead_number,
        l.full_name,
        l.phone,
        l.email,
        l.lead_type,
        l.status,
        l.source,
        l.budget_min,
        l.budget_max,
        COALESCE(l.location, l.preferred_location) as location,
        l.requirement,
        l.remarks,
        p.full_name as assigned_employee_name,
        l.created_at
      FROM public.leads l
      LEFT JOIN public.employees e ON l.assigned_to = e.id
      LEFT JOIN public.profiles p ON e.user_id = p.id
      ${whereClause}
      ORDER BY l.created_at DESC
    `;

    interface ExportRow {
      lead_number: number;
      full_name: string;
      phone: string;
      email: string | null;
      lead_type: string;
      status: string;
      source: string;
      budget_min: number | null;
      budget_max: number | null;
      location: string | null;
      requirement: string | null;
      remarks: string | null;
      assigned_employee_name: string | null;
      created_at: string;
    }

    const rows = await query<ExportRow>(sql, params);

    const headers = [
      'Lead #',
      'Client Name',
      'Mobile',
      'Email',
      'Type',
      'Status',
      'Source',
      'Budget Min (INR)',
      'Budget Max (INR)',
      'Location / Area',
      'Requirement',
      'Remarks',
      'Assigned Employee',
      'Created Date',
    ];

    const csvRows = [headers.join(',')];

    for (const r of rows) {
      csvRows.push(
        [
          escapeCSV(r.lead_number),
          escapeCSV(r.full_name),
          escapeCSV(r.phone),
          escapeCSV(r.email),
          escapeCSV(r.lead_type),
          escapeCSV(r.status),
          escapeCSV(r.source),
          escapeCSV(r.budget_min),
          escapeCSV(r.budget_max),
          escapeCSV(r.location),
          escapeCSV(r.requirement),
          escapeCSV(r.remarks),
          escapeCSV(r.assigned_employee_name || 'Unassigned'),
          escapeCSV(new Date(r.created_at).toLocaleDateString()),
        ].join(',')
      );
    }

    const csvContent = csvRows.join('\r\n');
    const dateStr = new Date().toISOString().split('T')[0];

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="diksha-crm-leads-${dateStr}.csv"`,
      },
    });
  } catch (err: unknown) {
    console.error('Error exporting leads CSV:', err);
    return NextResponse.json({ error: 'Failed to export leads' }, { status: 500 });
  }
}
