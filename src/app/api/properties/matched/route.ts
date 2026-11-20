import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import { Lead, Property } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export interface MatchedPropertyResult {
  property: Property;
  score: number;
  reasons: string[];
  whatsAppShareUrl: string;
}

function cleanPhoneForWhatsApp(phone: string): string {
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.length === 10) {
    clean = '91' + clean;
  }
  return clean;
}

function formatCurrencyINR(amount: number): string {
  if (amount >= 10000000) {
    return `${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `${(amount / 100000).toFixed(2)} Lakh`;
  }
  return amount.toLocaleString('en-IN');
}

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('lead_id');

    if (!leadId) {
      return NextResponse.json({ error: 'lead_id is required' }, { status: 400 });
    }

    // 1. Fetch Lead
    const leadRows = await query<Lead>('SELECT * FROM public.leads WHERE id = $1', [leadId]);
    if (!leadRows || leadRows.length === 0) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const lead = leadRows[0];
    const leadLocation = (lead.location || lead.preferred_location || '').toLowerCase().trim();
    const leadType = (lead.lead_type || 'buy').toLowerCase();
    const leadReq = (lead.requirement || '').toLowerCase();
    const budgetMin = lead.budget_min ? Number(lead.budget_min) : null;
    const budgetMax = lead.budget_max ? Number(lead.budget_max) : null;

    // 2. Fetch Active Properties
    const propRows = await query<Property>(`
      SELECT 
        p.*,
        json_build_object(
          'id', e.id,
          'designation', e.designation,
          'profile', json_build_object('full_name', prof.full_name, 'phone', prof.phone)
        ) as assigned_agent
      FROM public.properties p
      LEFT JOIN public.employees e ON p.assigned_agent_id = e.id
      LEFT JOIN public.profiles prof ON e.user_id = prof.id
      WHERE p.status = 'available' OR p.status = 'hold'
    `);

    const matches: MatchedPropertyResult[] = [];

    for (const p of propRows) {
      let score = 0;
      const reasons: string[] = [];

      const propLocation = (p.location || p.city || p.address || '').toLowerCase();
      const propType = (p.property_type || '').toLowerCase();
      const propBhk = (p.bhk || '').toLowerCase();
      const propPrice = Number(p.price);

      // Criteria 1: Location Matching (30 points)
      if (leadLocation && (propLocation.includes(leadLocation) || leadLocation.includes(propLocation))) {
        score += 30;
        reasons.push(`Location matched: ${p.location || p.city}`);
      } else if (leadLocation && p.address.toLowerCase().includes(leadLocation)) {
        score += 20;
        reasons.push(`Address vicinity matched: ${leadLocation}`);
      }

      // Criteria 2: Type Matching (25 points)
      if (leadType === 'buy' && (propType === 'new_project' || propType === 'resale')) {
        score += 25;
        reasons.push(`Listing category matched: ${propType === 'new_project' ? 'New Project' : 'Resale'}`);
      } else if (leadType === 'rent' && propType === 'rental') {
        score += 25;
        reasons.push(`Rental property match`);
      } else if (leadType === 'commercial' && propType === 'commercial') {
        score += 25;
        reasons.push(`Commercial asset match`);
      } else if (leadType === 'sell' && (propType === 'resale' || propType === 'new_project')) {
        score += 20;
        reasons.push(`Sell lead inventory match`);
      }

      // Criteria 3: Budget Matching (+/- 15%) (25 points)
      if (budgetMin !== null || budgetMax !== null) {
        let minAllowed = 0;
        let maxAllowed = Infinity;

        if (budgetMin !== null && budgetMax !== null) {
          minAllowed = budgetMin * 0.85;
          maxAllowed = budgetMax * 1.15;
        } else if (budgetMax !== null) {
          minAllowed = 0;
          maxAllowed = budgetMax * 1.15;
        } else if (budgetMin !== null) {
          minAllowed = budgetMin * 0.85;
          maxAllowed = budgetMin * 1.30;
        }

        if (propPrice >= minAllowed && propPrice <= maxAllowed) {
          score += 25;
          reasons.push(`Price ₹${formatCurrencyINR(propPrice)} fits budget window (+/- 15%)`);
        }
      }

      // Criteria 4: BHK / Requirement Matching (20 points)
      if (leadReq) {
        if (
          (leadReq.includes('1 bhk') && (propBhk.includes('1 bhk') || p.bedrooms === 1)) ||
          (leadReq.includes('2 bhk') && (propBhk.includes('2 bhk') || p.bedrooms === 2)) ||
          (leadReq.includes('3 bhk') && (propBhk.includes('3 bhk') || p.bedrooms === 3)) ||
          (leadReq.includes('4 bhk') && (propBhk.includes('4 bhk') || (p.bedrooms && p.bedrooms >= 4)))
        ) {
          score += 20;
          reasons.push(`BHK specification matched (${p.bhk || p.bedrooms + ' BHK'})`);
        } else if (
          (leadReq.includes('plot') || leadReq.includes('land')) &&
          (propType === 'plot_land' || propBhk.includes('plot'))
        ) {
          score += 20;
          reasons.push(`Plot/Land requirement aligned`);
        } else if (
          (leadReq.includes('shop') || leadReq.includes('office')) &&
          propType === 'commercial'
        ) {
          score += 20;
          reasons.push(`Commercial requirement aligned`);
        }
      }

      // If at least one meaningful match found (score >= 20)
      if (score >= 20) {
        const cleanPhone = cleanPhoneForWhatsApp(lead.phone);
        const amenitiesText = Array.isArray(p.amenities) && p.amenities.length > 0 
          ? p.amenities.slice(0, 4).join(', ') 
          : 'Standard amenities';

        const shareMessage = 
`Namaste ${lead.full_name},

Here is a recommended property matching your requirements from *Diksha Real Estate*:

🏡 *${p.title}*
📍 Location: ${p.location || p.city} (${p.address})
💰 Price: ₹${formatCurrencyINR(propPrice)}
📐 Type / Config: ${p.bhk || p.property_type.toUpperCase()} (${p.size_sqft ? p.size_sqft + ' sq.ft' : 'Standard size'})
✨ Amenities: ${amenitiesText}

Interested in scheduling a site visit? Reply to this message or call our executive.
- Diksha Real Estate`;

        const whatsAppShareUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(shareMessage)}`;

        matches.push({
          property: {
            ...p,
            price: Number(p.price),
            size_sqft: p.size_sqft ? Number(p.size_sqft) : null,
            photos: Array.isArray(p.photos) ? p.photos : [],
            amenities: Array.isArray(p.amenities) ? p.amenities : [],
          },
          score: Math.min(score, 100),
          reasons,
          whatsAppShareUrl,
        });
      }
    }

    // Sort by match score descending
    matches.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      lead: {
        id: lead.id,
        full_name: lead.full_name,
        phone: lead.phone,
        lead_type: lead.lead_type,
        location: lead.location || lead.preferred_location,
        requirement: lead.requirement,
        budget_min: budgetMin,
        budget_max: budgetMax,
      },
      matches,
      totalMatches: matches.length,
    });
  } catch (err: unknown) {
    console.error('Error auto-matching properties:', err);
    return NextResponse.json({ error: 'Failed to compute property matches' }, { status: 500 });
  }
}
