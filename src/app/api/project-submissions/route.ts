import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { query } from '@/lib/db';
import { ProjectSubmissionRecord } from '@/lib/supabase/types';
import { shouldIncludeDemo, getDemoCondition } from '@/lib/db/demo-filter';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    const includeDemo = shouldIncludeDemo(request);
    const demoCond = getDemoCondition('ps', includeDemo);
    if (demoCond) {
      conditions.push(demoCond);
    }

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`ps.status = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const idx = params.length;
      conditions.push(
        `(LOWER(ps.project_name) LIKE $${idx} OR LOWER(ps.location) LIKE $${idx} OR LOWER(ps.client_name) LIKE $${idx} OR LOWER(ps.client_phone) LIKE $${idx})`
      );
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        ps.id,
        ps.project_name,
        ps.project_type,
        ps.location,
        ps.price_range,
        ps.price_min,
        ps.price_max,
        ps.description,
        ps.photos,
        ps.client_name,
        ps.client_phone,
        ps.client_email,
        ps.status,
        ps.admin_notes,
        ps.reviewed_by,
        ps.reviewed_at,
        ps.created_property_id,
        ps.created_at,
        ps.updated_at,
        p.title as created_property_title,
        p.property_code as created_property_code
      FROM public.project_submissions ps
      LEFT JOIN public.properties p ON ps.created_property_id = p.id
      ${whereClause}
      ORDER BY ps.created_at DESC
    `;

    const rows = await query<ProjectSubmissionRecord & {
      created_property_title?: string | null;
      created_property_code?: string | null;
    }>(sql, params);

    // Compute status counts for badges
    const countsRes = await query<{
      total: string;
      pending: string;
      approved: string;
      rejected: string;
    }>(`
      SELECT 
        COUNT(*)::text as total,
        COUNT(*) FILTER (WHERE status = 'pending')::text as pending,
        COUNT(*) FILTER (WHERE status = 'approved')::text as approved,
        COUNT(*) FILTER (WHERE status = 'rejected')::text as rejected
      FROM public.project_submissions
    `);

    const counts = {
      total: parseInt(countsRes[0]?.total || '0', 10),
      pending: parseInt(countsRes[0]?.pending || '0', 10),
      approved: parseInt(countsRes[0]?.approved || '0', 10),
      rejected: parseInt(countsRes[0]?.rejected || '0', 10),
    };

    const submissions = rows.map((r) => ({
      ...r,
      price_min: r.price_min ? Number(r.price_min) : null,
      price_max: r.price_max ? Number(r.price_max) : null,
      photos: Array.isArray(r.photos) ? r.photos : [],
      created_property: r.created_property_id ? {
        id: r.created_property_id,
        title: r.created_property_title || '',
        property_code: r.created_property_code || '',
      } : null,
    }));

    return NextResponse.json({ submissions, counts });
  } catch (err: unknown) {
    console.error('Error fetching project submissions:', err);
    return NextResponse.json({ error: 'Failed to fetch project submissions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      project_name,
      project_type,
      location,
      price_range,
      price_min,
      price_max,
      description,
      photos = [],
      client_name,
      client_phone,
      client_email,
    } = body;

    // Validation
    if (!project_name || typeof project_name !== 'string' || !project_name.trim()) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    if (!project_type || typeof project_type !== 'string' || !project_type.trim()) {
      return NextResponse.json({ error: 'Project type is required' }, { status: 400 });
    }

    if (!location || typeof location !== 'string' || !location.trim()) {
      return NextResponse.json({ error: 'Location is required' }, { status: 400 });
    }

    if (!client_name || typeof client_name !== 'string' || !client_name.trim()) {
      return NextResponse.json({ error: 'Client contact name is required' }, { status: 400 });
    }

    if (!client_phone || typeof client_phone !== 'string' || !client_phone.trim()) {
      return NextResponse.json({ error: 'Client contact phone is required' }, { status: 400 });
    }

    // Ensure photos is an array of strings (max 5)
    const sanitizedPhotos = Array.isArray(photos) ? photos.slice(0, 5) : [];

    const insertSql = `
      INSERT INTO public.project_submissions (
        project_name,
        project_type,
        location,
        price_range,
        price_min,
        price_max,
        description,
        photos,
        client_name,
        client_phone,
        client_email,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
      RETURNING *
    `;

    const inserted = await query<ProjectSubmissionRecord>(insertSql, [
      project_name.trim(),
      project_type.trim(),
      location.trim(),
      price_range?.trim() || null,
      price_min ? Number(price_min) : null,
      price_max ? Number(price_max) : null,
      description?.trim() || null,
      sanitizedPhotos,
      client_name.trim(),
      client_phone.trim(),
      client_email?.trim() || null,
    ]);

    const submission = inserted[0];

    // Audit log
    const session = await getSession();
    try {
      await query(
        `INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, new_data)
         VALUES ($1, 'create', 'project_submission', $2, $3)`,
        [
          session?.userId || null,
          submission.id,
          JSON.stringify({
            project_name: submission.project_name,
            client_name: submission.client_name,
            client_phone: submission.client_phone,
          }),
        ]
      );
    } catch (auditErr) {
      console.warn('Audit log error on project submission:', auditErr);
    }

    return NextResponse.json({ success: true, submission }, { status: 201 });
  } catch (err: unknown) {
    console.error('Error creating project submission:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to submit project' },
      { status: 500 }
    );
  }
}
