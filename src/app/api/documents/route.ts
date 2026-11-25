import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import { DocumentRecord } from '@/lib/supabase/types';
import { shouldIncludeDemo, getDemoCondition } from '@/lib/db/demo-filter';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('lead_id');
    const propertyId = searchParams.get('property_id');
    const dealId = searchParams.get('deal_id');
    const documentType = searchParams.get('document_type');
    const expiring = searchParams.get('expiring');
    const search = searchParams.get('search');

    const conditions: string[] = [];
    const params: unknown[] = [];

    const includeDemo = shouldIncludeDemo(request);
    const demoCond = getDemoCondition('d', includeDemo);
    if (demoCond) {
      conditions.push(demoCond);
    }

    // Role-based visibility
    if (!auth.isAdmin) {
      if (!auth.employeeId) {
        return NextResponse.json({ documents: [] });
      }
      params.push(auth.userId);
      const uIdx = params.length;
      params.push(auth.employeeId);
      const eIdx = params.length;

      conditions.push(`(
        d.uploaded_by = $${uIdx} OR 
        l.assigned_to = $${eIdx} OR 
        dl.employee_id = $${eIdx}
      )`);
    }

    if (leadId) {
      params.push(leadId);
      conditions.push(`d.lead_id = $${params.length}`);
    }

    if (propertyId) {
      params.push(propertyId);
      conditions.push(`d.property_id = $${params.length}`);
    }

    if (dealId) {
      params.push(dealId);
      conditions.push(`d.deal_id = $${params.length}`);
    }

    if (documentType && documentType !== 'all') {
      params.push(documentType);
      conditions.push(`d.document_type = $${params.length}`);
    }

    if (expiring === 'true') {
      conditions.push(`(d.expiry_date IS NOT NULL AND d.expiry_date >= CURRENT_DATE AND d.expiry_date <= (CURRENT_DATE + INTERVAL '30 days'))`);
    }

    if (search) {
      params.push(`%${search}%`);
      const sIdx = params.length;
      conditions.push(`(
        d.title ILIKE $${sIdx} OR 
        l.full_name ILIKE $${sIdx} OR 
        p.title ILIKE $${sIdx} OR 
        d.document_type ILIKE $${sIdx}
      )`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        d.id,
        d.title,
        d.document_type,
        d.file_url,
        d.file_type,
        d.file_size,
        d.bucket_name,
        d.lead_id,
        d.property_id,
        d.deal_id,
        d.uploaded_by,
        d.expiry_date,
        d.created_at,
        d.updated_at,
        json_build_object(
          'id', prof.id,
          'full_name', prof.full_name
        ) as uploader,
        json_build_object(
          'id', l.id,
          'full_name', l.full_name,
          'phone', l.phone
        ) as lead,
        json_build_object(
          'id', p.id,
          'title', p.title
        ) as property,
        json_build_object(
          'id', dl.id,
          'deal_number', dl.deal_number
        ) as deal
      FROM public.documents d
      LEFT JOIN public.profiles prof ON d.uploaded_by = prof.id
      LEFT JOIN public.leads l ON d.lead_id = l.id
      LEFT JOIN public.properties p ON d.property_id = p.id
      LEFT JOIN public.deals dl ON d.deal_id = dl.id
      ${whereClause}
      ORDER BY d.created_at DESC
    `;

    const rows = await query<DocumentRecord>(sql, params);

    return NextResponse.json({ documents: rows });
  } catch (err: unknown) {
    console.error('Error fetching documents:', err);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
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
      title,
      document_type = 'other',
      file_url,
      file_type,
      file_size,
      lead_id,
      property_id,
      deal_id,
      expiry_date,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Document title is required' }, { status: 400 });
    }
    if (!file_url || !file_url.trim()) {
      return NextResponse.json({ error: 'File URL is required' }, { status: 400 });
    }

    const sql = `
      INSERT INTO public.documents (
        title,
        document_type,
        file_url,
        file_type,
        file_size,
        bucket_name,
        lead_id,
        property_id,
        deal_id,
        uploaded_by,
        expiry_date
      ) VALUES ($1, $2, $3, $4, $5, 'documents', $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const rows = await query<DocumentRecord>(sql, [
      title.trim(),
      document_type,
      file_url.trim(),
      file_type || null,
      file_size || null,
      lead_id || null,
      property_id || null,
      deal_id || null,
      auth.userId,
      expiry_date || null,
    ]);

    const createdDoc = rows[0];

    // If attached to a lead, log in lead timeline history
    if (lead_id) {
      await query(
        `INSERT INTO public.lead_history (
          lead_id,
          actor_id,
          actor_name,
          action_type,
          title,
          description,
          details
        ) VALUES ($1, $2, $3, 'document', $4, $5, $6)`,
        [
          lead_id,
          auth.userId,
          auth.employeeName,
          `Document Uploaded: ${title.trim()}`,
          `${document_type.toUpperCase()} document uploaded by ${auth.employeeName}`,
          JSON.stringify({ document_id: createdDoc.id, document_type, file_url }),
        ]
      );
    }

    return NextResponse.json({ success: true, document: createdDoc }, { status: 201 });
  } catch (err: unknown) {
    console.error('Error creating document:', err);
    return NextResponse.json({ error: 'Failed to record document' }, { status: 500 });
  }
}
