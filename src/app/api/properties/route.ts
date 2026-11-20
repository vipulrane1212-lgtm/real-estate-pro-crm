import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import { Property } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const type = searchParams.get('type') || '';
    const status = searchParams.get('status') || '';
    const location = searchParams.get('location') || '';
    const bhk = searchParams.get('bhk') || '';
    const minPrice = searchParams.get('min_price');
    const maxPrice = searchParams.get('max_price');

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (type && type !== 'all') {
      params.push(type);
      conditions.push(`p.property_type = $${params.length}`);
    }

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`p.status = $${params.length}`);
    }

    if (location && location !== 'all') {
      params.push(`%${location}%`);
      conditions.push(`(p.location ILIKE $${params.length} OR p.city ILIKE $${params.length} OR p.address ILIKE $${params.length})`);
    }

    if (bhk && bhk !== 'all') {
      params.push(`%${bhk}%`);
      conditions.push(`(p.bhk ILIKE $${params.length} OR p.title ILIKE $${params.length})`);
    }

    if (minPrice) {
      params.push(Number(minPrice));
      conditions.push(`p.price >= $${params.length}`);
    }

    if (maxPrice) {
      params.push(Number(maxPrice));
      conditions.push(`p.price <= $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      const searchIndex = params.length;
      conditions.push(
        `(p.title ILIKE $${searchIndex} OR p.property_code ILIKE $${searchIndex} OR p.location ILIKE $${searchIndex} OR p.address ILIKE $${searchIndex} OR p.bhk ILIKE $${searchIndex} OR p.owner_name ILIKE $${searchIndex})`
      );
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

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
      ${whereClause}
      ORDER BY p.created_at DESC
    `;

    const rows = await query<Property>(sql, params);

    const properties = rows.map((r) => ({
      ...r,
      price: Number(r.price),
      size_sqft: r.size_sqft ? Number(r.size_sqft) : null,
      photos: Array.isArray(r.photos) ? r.photos : [],
      videos: Array.isArray(r.videos) ? r.videos : [],
      amenities: Array.isArray(r.amenities) ? r.amenities : [],
      assigned_agent: r.assigned_agent_id ? r.assigned_agent : null,
    }));

    return NextResponse.json({ properties });
  } catch (err: unknown) {
    console.error('Error fetching properties:', err);
    return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const title = body.title;
    const property_type = body.property_type || body.propertyType;
    const price = body.price;
    const location = body.location;
    const address = body.address;
    const bhk = body.bhk;
    const size_sqft = body.size_sqft ?? body.sizeSqft;
    const bedrooms = body.bedrooms;
    const bathrooms = body.bathrooms;
    const listing_type = body.listing_type || body.listingType || 'sale';
    const status = body.status || 'available';
    const photos = body.photos || [];
    const videos = body.videos || [];
    const video_url = body.video_url || body.videoUrl;
    const document_url = body.document_url || body.documentUrl;
    const view_360_url = body.view_360_url || body.view360Url;
    const owner_name = body.owner_name || body.ownerName;
    const owner_phone = body.owner_phone || body.ownerPhone;
    const description = body.description;
    const amenities = body.amenities || [];
    const assigned_agent_id = body.assigned_agent_id || body.assignedAgentId;

    // Validation
    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Property title is required' }, { status: 400 });
    }

    if (!property_type) {
      return NextResponse.json({ error: 'Property type is required' }, { status: 400 });
    }

    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      return NextResponse.json({ error: 'A valid property price is required' }, { status: 400 });
    }

    if (!location || !address) {
      return NextResponse.json({ error: 'Location and address are required' }, { status: 400 });
    }

    // Auto-generate unique property code (e.g. DK-PROP-XXXX)
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const property_code = body.property_code || `DK-${property_type.substring(0, 3).toUpperCase()}-${randomSuffix}`;

    const insertSql = `
      INSERT INTO public.properties (
        property_code,
        title,
        description,
        property_type,
        listing_type,
        price,
        size_sqft,
        bhk,
        bedrooms,
        bathrooms,
        location,
        address,
        city,
        state,
        status,
        photos,
        videos,
        video_url,
        document_url,
        view_360_url,
        owner_name,
        owner_phone,
        amenities,
        assigned_agent_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      RETURNING *
    `;

    const inserted = await query<Property>(insertSql, [
      property_code,
      title.trim(),
      description?.trim() || null,
      property_type,
      listing_type,
      Number(price),
      size_sqft ? Number(size_sqft) : null,
      bhk?.trim() || null,
      bedrooms ? Number(bedrooms) : null,
      bathrooms ? Number(bathrooms) : null,
      location.trim(),
      address.trim(),
      body.city?.trim() || location.trim(),
      body.state?.trim() || 'Uttar Pradesh',
      status || 'available',
      JSON.stringify(Array.isArray(photos) ? photos : []),
      JSON.stringify(Array.isArray(videos) ? videos : []),
      video_url?.trim() || null,
      document_url?.trim() || null,
      view_360_url?.trim() || null,
      owner_name?.trim() || null,
      owner_phone?.trim() || null,
      JSON.stringify(Array.isArray(amenities) ? amenities : []),
      assigned_agent_id || auth.employeeId || null,
    ]);

    return NextResponse.json({ property: inserted[0] }, { status: 201 });
  } catch (err: unknown) {
    console.error('Error creating property:', err);
    return NextResponse.json({ error: 'Failed to create property listing' }, { status: 500 });
  }
}
