import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import { SiteVisit } from '@/lib/supabase/types';
import { shouldIncludeDemo, getDemoCondition } from '@/lib/db/demo-filter';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all'; // 'today', 'upcoming', 'past', 'all'
    const status = searchParams.get('status') || '';
    const leadId = searchParams.get('lead_id') || '';
    const propertyId = searchParams.get('property_id') || '';
    const assignedTo = searchParams.get('assigned_to') || '';

    const conditions: string[] = [];
    const params: unknown[] = [];

    const includeDemo = shouldIncludeDemo(request);
    const demoCond = getDemoCondition('v', includeDemo);
    if (demoCond) {
      conditions.push(demoCond);
    }

    // Role-based filtering: Employee sees only their assigned visits or team
    if (!auth.isAdmin) {
      if (!auth.employeeId) {
        return NextResponse.json({ visits: [] });
      }
      params.push(auth.employeeId);
      conditions.push(`v.assigned_to = $${params.length}`);
    } else if (assignedTo && assignedTo !== 'all') {
      params.push(assignedTo);
      conditions.push(`v.assigned_to = $${params.length}`);
    }

    if (leadId) {
      params.push(leadId);
      conditions.push(`v.lead_id = $${params.length}`);
    }

    if (propertyId) {
      params.push(propertyId);
      conditions.push(`v.property_id = $${params.length}`);
    }

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`v.status = $${params.length}`);
    }

    // Date filters
    const today = new Date().toISOString().split('T')[0];
    if (filter === 'today') {
      params.push(today);
      conditions.push(`DATE(v.visit_date) = $${params.length}`);
    } else if (filter === 'upcoming') {
      params.push(today);
      conditions.push(`DATE(v.visit_date) > $${params.length}`);
    } else if (filter === 'past') {
      params.push(today);
      conditions.push(`DATE(v.visit_date) < $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        v.id,
        v.lead_id,
        v.property_id,
        v.assigned_to,
        v.visit_date,
        v.status,
        v.feedback,
        v.outcome_note,
        v.cancellation_reason,
        v.client_interest_level,
        v.completed_at,
        v.created_at,
        v.updated_at,
        json_build_object(
          'id', l.id,
          'full_name', l.full_name,
          'phone', l.phone,
          'location', COALESCE(l.location, l.preferred_location)
        ) as lead,
        json_build_object(
          'id', p.id,
          'title', p.title,
          'location', COALESCE(p.location, p.city),
          'price', p.price,
          'bhk', p.bhk
        ) as property,
        json_build_object(
          'id', e.id,
          'designation', e.designation,
          'profile', json_build_object(
            'full_name', prof.full_name,
            'phone', prof.phone
          )
        ) as assigned_employee
      FROM public.site_visits v
      LEFT JOIN public.leads l ON v.lead_id = l.id
      LEFT JOIN public.properties p ON v.property_id = p.id
      LEFT JOIN public.employees e ON v.assigned_to = e.id
      LEFT JOIN public.profiles prof ON e.user_id = prof.id
      ${whereClause}
      ORDER BY 
        CASE WHEN v.status = 'scheduled' THEN 0 ELSE 1 END,
        v.visit_date ASC
    `;

    const rows = await query<SiteVisit>(sql, params);

    return NextResponse.json({ visits: rows });
  } catch (err: unknown) {
    console.error('Error fetching site visits:', err);
    return NextResponse.json({ error: 'Failed to fetch site visits' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      lead_id,
      leadId,
      property_id,
      propertyId,
      assigned_to,
      assignedTo,
      visit_date,
      visitDate,
      time = '11:00',
      client_interest_level = 'warm',
      notes,
    } = body;

    const targetLeadId = lead_id || leadId;
    const targetPropertyId = property_id || propertyId;
    const targetVisitDate = visit_date || visitDate;

    if (!targetLeadId) {
      return NextResponse.json({ error: 'lead_id is required' }, { status: 400 });
    }
    if (!targetPropertyId) {
      return NextResponse.json({ error: 'property_id is required' }, { status: 400 });
    }
    if (!targetVisitDate) {
      return NextResponse.json({ error: 'visit_date is required' }, { status: 400 });
    }

    // Determine assigned employee
    let targetEmployeeId = assigned_to || assignedTo;
    if (!targetEmployeeId) {
      // Default to lead assigned employee or current employee
      const leadCheck = await query<{ assigned_to: string }>('SELECT assigned_to FROM public.leads WHERE id = $1', [targetLeadId]);
      targetEmployeeId = leadCheck[0]?.assigned_to || auth.employeeId;
    }
    if (!targetEmployeeId && auth.isAdmin) {
      const fallbackEmp = await query<{ id: string }>(
        'SELECT id FROM public.employees WHERE is_active = true ORDER BY created_at ASC LIMIT 1'
      );
      targetEmployeeId = fallbackEmp[0]?.id || null;
    }

    if (!targetEmployeeId) {
      return NextResponse.json({ error: 'Assigned employee is required' }, { status: 400 });
    }

    // Parse date & time into ISO string
    let finalDateTime = targetVisitDate;
    if (typeof targetVisitDate === 'string' && !targetVisitDate.includes('T') && time) {
      finalDateTime = `${targetVisitDate}T${time}:00`;
    }

    const insertSql = `
      INSERT INTO public.site_visits (
        lead_id,
        property_id,
        assigned_to,
        visit_date,
        status,
        client_interest_level,
        feedback
      ) VALUES ($1, $2, $3, $4, 'scheduled', $5, $6)
      RETURNING *
    `;

    const insertedRows = await query<SiteVisit>(insertSql, [
      targetLeadId,
      targetPropertyId,
      targetEmployeeId,
      finalDateTime,
      client_interest_level,
      notes || null,
    ]);

    const visit = insertedRows[0];

    // Log to Lead History
    const propDetails = await query<{ title: string; location: string }>(
      'SELECT title, COALESCE(location, city) as location FROM public.properties WHERE id = $1',
      [targetPropertyId]
    );
    const propName = propDetails[0]?.title || 'Property';

    await query(
      `INSERT INTO public.lead_history (
        lead_id,
        actor_id,
        actor_name,
        action_type,
        title,
        description,
        details
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        targetLeadId,
        auth.userId,
        auth.employeeName,
        'visit',
        `Site Visit Scheduled: ${propName}`,
        `Scheduled for ${new Date(finalDateTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}.`,
        JSON.stringify({ visit_id: visit.id, property_id: targetPropertyId }),
      ]
    );

    return NextResponse.json({ success: true, visit });
  } catch (err: unknown) {
    console.error('Error scheduling site visit:', err);
    return NextResponse.json({ error: 'Failed to schedule site visit' }, { status: 500 });
  }
}
