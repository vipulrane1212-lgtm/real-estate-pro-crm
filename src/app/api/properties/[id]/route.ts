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
        COALESCE(p.videos, '[]'::jsonb) as videos,
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
      videos: Array.isArray(r.videos) ? r.videos : [],
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

    // Role Enforcement: Employees cannot edit properties. Only owner / admin can edit properties.
    if (auth.role === 'employee' || (!auth.isAdmin && auth.role !== 'super_admin')) {
      return NextResponse.json(
        { error: 'Forbidden: Employees cannot edit property listings. Only the business owner can edit properties.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const existingRows = await query<Property>('SELECT * FROM public.properties WHERE id = $1', [id]);
    if (!existingRows || existingRows.length === 0) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const existing = existingRows[0];

    const title = body.title !== undefined ? body.title : existing.title;
    const description = body.description !== undefined ? body.description : existing.description;
    const property_type = body.property_type || body.propertyType || existing.property_type;
    const listing_type = body.listing_type || body.listingType || existing.listing_type;
    const price = body.price !== undefined ? body.price : existing.price;
    const size_sqft = (body.size_sqft !== undefined ? body.size_sqft : body.sizeSqft) !== undefined ? (body.size_sqft ?? body.sizeSqft) : existing.size_sqft;
    const bhk = body.bhk !== undefined ? body.bhk : existing.bhk;
    const bedrooms = body.bedrooms !== undefined ? body.bedrooms : existing.bedrooms;
    const bathrooms = body.bathrooms !== undefined ? body.bathrooms : existing.bathrooms;
    const location = body.location !== undefined ? body.location : existing.location;
    const address = body.address !== undefined ? body.address : existing.address;
    const status = body.status !== undefined ? body.status : existing.status;
    const photos = body.photos !== undefined ? body.photos : existing.photos;
    const videos = body.videos !== undefined ? body.videos : existing.videos;
    const video_url = (body.video_url !== undefined ? body.video_url : body.videoUrl) !== undefined ? (body.video_url ?? body.videoUrl) : existing.video_url;
    const document_url = (body.document_url !== undefined ? body.document_url : body.documentUrl) !== undefined ? (body.document_url ?? body.documentUrl) : existing.document_url;
    const view_360_url = (body.view_360_url !== undefined ? body.view_360_url : body.view360Url) !== undefined ? (body.view_360_url ?? body.view360Url) : existing.view_360_url;
    const owner_name = (body.owner_name !== undefined ? body.owner_name : body.ownerName) !== undefined ? (body.owner_name ?? body.ownerName) : existing.owner_name;
    const owner_phone = (body.owner_phone !== undefined ? body.owner_phone : body.ownerPhone) !== undefined ? (body.owner_phone ?? body.ownerPhone) : existing.owner_phone;
    const amenities = body.amenities !== undefined ? body.amenities : existing.amenities;
    const assigned_agent_id = (body.assigned_agent_id !== undefined ? body.assigned_agent_id : body.assignedAgentId) !== undefined ? (body.assigned_agent_id ?? body.assignedAgentId) : existing.assigned_agent_id;

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
        videos = $14,
        video_url = $15,
        document_url = $16,
        view_360_url = $17,
        owner_name = $18,
        owner_phone = $19,
        amenities = $20,
        assigned_agent_id = $21,
        updated_at = now()
      WHERE id = $22
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
      JSON.stringify(Array.isArray(videos) ? videos : []),
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
    if (!auth || auth.role === 'employee' || (!auth.isAdmin && auth.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden: Only the business owner can delete properties' }, { status: 403 });
    }

    const { id } = await params;
    await query('DELETE FROM public.properties WHERE id = $1', [id]);

    return NextResponse.json({ success: true, message: 'Property deleted successfully' });
  } catch (err: unknown) {
    console.error('Error deleting property:', err);
    return NextResponse.json({ error: 'Failed to delete property' }, { status: 500 });
  }
}

export const PATCH = PUT;
