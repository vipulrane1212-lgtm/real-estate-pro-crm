import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { query } from '@/lib/db';
import { ProjectSubmissionRecord, Property, PropertyType } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

function mapProjectType(type: string): PropertyType {
  const lower = type.toLowerCase();
  if (lower.includes('commercial') || lower.includes('shop') || lower.includes('office')) {
    return 'commercial';
  }
  if (lower.includes('plot') || lower.includes('land')) {
    return 'plot_land';
  }
  if (lower.includes('rent')) {
    return 'rental';
  }
  if (lower.includes('resale')) {
    return 'resale';
  }
  return 'new_project';
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const rows = await query<ProjectSubmissionRecord>(
      `SELECT * FROM public.project_submissions WHERE id = $1`,
      [id]
    );

    if (!rows.length) {
      return NextResponse.json({ error: 'Project submission not found' }, { status: 404 });
    }

    return NextResponse.json({ submission: rows[0] });
  } catch (err: unknown) {
    console.error('Error fetching project submission:', err);
    return NextResponse.json({ error: 'Failed to fetch project submission' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, admin_notes } = body;

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be either "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Fetch existing submission
    const existing = await query<ProjectSubmissionRecord>(
      `SELECT * FROM public.project_submissions WHERE id = $1`,
      [id]
    );

    if (!existing.length) {
      return NextResponse.json({ error: 'Project submission not found' }, { status: 404 });
    }

    const sub = existing[0];

    if (action === 'approve') {
      let createdPropId = sub.created_property_id;

      // Create new property if not already created
      if (!createdPropId) {
        const propType = mapProjectType(sub.project_type);
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const propCode = `DK-PRJ-${randomSuffix}`;
        const price = sub.price_min || sub.price_max || 0;

        const propSql = `
          INSERT INTO public.properties (
            property_code,
            title,
            description,
            property_type,
            listing_type,
            price,
            location,
            address,
            city,
            state,
            status,
            photos,
            owner_name,
            owner_phone
          ) VALUES ($1, $2, $3, $4, 'sale', $5, $6, $7, $8, $9, 'available', $10, $11, $12)
          RETURNING *
        `;

        const insertedProp = await query<Property>(propSql, [
          propCode,
          sub.project_name.trim(),
          sub.description || null,
          propType,
          price,
          sub.location.trim(),
          sub.location.trim(),
          'Lucknow',
          'Uttar Pradesh',
          JSON.stringify(sub.photos || []),
          sub.client_name,
          sub.client_phone,
        ]);

        createdPropId = insertedProp[0].id;

        // Audit log for property creation
        try {
          await query(
            `INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, new_data)
             VALUES ($1, 'create', 'property', $2, $3)`,
            [
              session.userId,
              createdPropId,
              JSON.stringify({
                source: 'client_project_submission',
                submission_id: sub.id,
                title: sub.project_name,
                property_code: propCode,
              }),
            ]
          );
        } catch (auditErr) {
          console.warn('Audit log error on approved property:', auditErr);
        }
      }

      // Update submission status to approved
      const updatedSub = await query<ProjectSubmissionRecord>(
        `UPDATE public.project_submissions
         SET status = 'approved',
             admin_notes = COALESCE($1, admin_notes),
             reviewed_by = $2,
             reviewed_at = now(),
             created_property_id = $3,
             updated_at = now()
         WHERE id = $4
         RETURNING *`,
        [admin_notes?.trim() || null, session.userId, createdPropId, id]
      );

      // Audit log for submission approval
      try {
        await query(
          `INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, new_data)
           VALUES ($1, 'approve', 'project_submission', $2, $3)`,
          [
            session.userId,
            sub.id,
            JSON.stringify({
              action: 'approve',
              created_property_id: createdPropId,
              admin_notes: admin_notes || null,
            }),
          ]
        );
      } catch (auditErr) {
        console.warn('Audit log error on approve submission:', auditErr);
      }

      return NextResponse.json({
        success: true,
        submission: updatedSub[0],
        created_property_id: createdPropId,
      });
    } else {
      // action === 'reject'
      const updatedSub = await query<ProjectSubmissionRecord>(
        `UPDATE public.project_submissions
         SET status = 'rejected',
             admin_notes = COALESCE($1, 'Submission rejected by administrator'),
             reviewed_by = $2,
             reviewed_at = now(),
             updated_at = now()
         WHERE id = $3
         RETURNING *`,
        [admin_notes?.trim() || null, session.userId, id]
      );

      // Audit log for submission rejection
      try {
        await query(
          `INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, new_data)
           VALUES ($1, 'reject', 'project_submission', $2, $3)`,
          [
            session.userId,
            sub.id,
            JSON.stringify({
              action: 'reject',
              admin_notes: admin_notes || 'Submission rejected by administrator',
            }),
          ]
        );
      } catch (auditErr) {
        console.warn('Audit log error on reject submission:', auditErr);
      }

      return NextResponse.json({
        success: true,
        submission: updatedSub[0],
      });
    }
  } catch (err: unknown) {
    console.error('Error updating project submission:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update project submission' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !['super_admin', 'admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await query<ProjectSubmissionRecord>(
      `SELECT * FROM public.project_submissions WHERE id = $1`,
      [id]
    );

    if (!existing.length) {
      return NextResponse.json({ error: 'Project submission not found' }, { status: 404 });
    }

    await query(`DELETE FROM public.project_submissions WHERE id = $1`, [id]);

    try {
      await query(
        `INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, new_data)
         VALUES ($1, 'delete', 'project_submission', $2, $3)`,
        [session.userId, id, JSON.stringify({ project_name: existing[0].project_name })]
      );
    } catch (auditErr) {
      console.warn('Audit log error on project submission delete:', auditErr);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Error deleting project submission:', err);
    return NextResponse.json({ error: 'Failed to delete project submission' }, { status: 500 });
  }
}
