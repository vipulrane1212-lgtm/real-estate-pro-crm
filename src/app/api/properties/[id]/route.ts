import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import { Property } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const sql = `
      SELECT 
        p.id,
        p.property_code,
        p.title,
        p.description,
        p.property_type,
        p.listing_type,
        p.price,
        p.size_sqft,
        p.bhk,
        p.bedrooms,
        p.bathrooms,
        COALESCE(p.location, p.city) as location,
        p.address,
        p.city,
        p.state,
        p.pincode,
        p.status,
        p.assigned_agent_id,
        COALESCE(p.photos, '[]'::jsonb) as photos,
        p.video_url,
        p.document_url,
        p.view_360_url,
        p.owner_name,
        p.owner_phone,
        COALESCE(p.amenities, '[]'::jsonb) as amenities,
        p.created_at,
        p.updated_at,
        json_build_object(
          'id', e.id,
          'designation', e.designation,
          'profile', json_build_object(
            'full_name', prof.full_name,
            'phone', prof.phone
          )
        ) as assigned_agent
      FROM public.properties p
      LEFT JOIN public.employees e ON p.assigned_agent_id = e.id
      LEFT JOIN public.profiles prof ON e.user_id = prof.id
      WHERE p.id = $1
      LIMIT 1
    `;

    const rows = await query<Property>(sql, [id]);
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const r = rows[0];
    const property = {
      ...r,
      price: Number(r.price),
      size_sqft: r.size_sqft ? Number(r.size_sqft) : null,
      photos: Array.isArray(r.photos) ? r.photos : [],
      amenities: Array.isArray(r.amenities) ? r.amenities : [],
      assigned_agent: r.assigned_agent_id ? r.assigned_agent : null,
    };

    return NextResponse.json({ property });
  } catch (err: unknown) {
    console.error('Error fetching property details:', err);
    return NextResponse.json({ error: 'Failed to fetch property' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const existingRows = await query<Property>('SELECT * FROM public.properties WHERE id = $1', [id]);
    if (!existingRows || existingRows.length === 0) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const existing = existingRows[0];

    const {
      title = existing.title,
      description = existing.description,
      property_type = existing.property_type,
      listing_type = existing.listing_type,
      price = existing.price,
      size_sqft = existing.size_sqft,
      bhk = existing.bhk,
      bedrooms = existing.bedrooms,
      bathrooms = existing.bathrooms,
      location = existing.location,
      address = existing.address,
      status = existing.status,
      photos = existing.photos,
      video_url = existing.video_url,
      document_url = existing.document_url,
      view_360_url = existing.view_360_url,
      owner_name = existing.owner_name,
      owner_phone = existing.owner_phone,
      amenities = existing.amenities,
      assigned_agent_id = existing.assigned_agent_id,
    } = body;

    const updateSql = `
      UPDATE public.properties
      SET
        title = $1,
        description = $2,
        property_type = $3,
        listing_type = $4,
        price = $5,
        size_sqft = $6,
        bhk = $7,
        bedrooms = $8,
        bathrooms = $9,
        location = $10,
        address = $11,
        status = $12,
        photos = $13,
        video_url = $14,
        document_url = $15,
        view_360_url = $16,
        owner_name = $17,
        owner_phone = $18,
        amenities = $19,
        assigned_agent_id = $20,
        updated_at = now()
      WHERE id = $21
      RETURNING *
    `;

    const updatedRows = await query<Property>(updateSql, [
      title.trim(),
      description?.trim() || null,
      property_type,
      listing_type,
      Number(price),
      size_sqft ? Number(size_sqft) : null,
      bhk?.trim() || null,
      bedrooms ? Number(bedrooms) : null,
      bathrooms ? Number(bathrooms) : null,
      location ? location.trim() : null,
      address.trim(),
      status,
      JSON.stringify(Array.isArray(photos) ? photos : []),
      video_url?.trim() || null,
      document_url?.trim() || null,
      view_360_url?.trim() || null,
      owner_name?.trim() || null,
      owner_phone?.trim() || null,
      JSON.stringify(Array.isArray(amenities) ? amenities : []),
      assigned_agent_id || null,
      id,
    ]);

    return NextResponse.json({ property: updatedRows[0] });
  } catch (err: unknown) {
    console.error('Error updating property:', err);
    return NextResponse.json({ error: 'Failed to update property' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext();
    if (!auth || !auth.isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required to delete property' }, { status: 403 });
    }

    const { id } = await params;
    await query('DELETE FROM public.properties WHERE id = $1', [id]);

    return NextResponse.json({ success: true, message: 'Property deleted successfully' });
  } catch (err: unknown) {
    console.error('Error deleting property:', err);
    return NextResponse.json({ error: 'Failed to delete property' }, { status: 500 });
  }
}
