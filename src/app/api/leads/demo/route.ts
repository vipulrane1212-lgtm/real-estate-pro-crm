import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import { generate100DemoLeads } from '@/lib/leads/demo-dataset';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [countRes, sourceRes] = await Promise.all([
      query<{ count: string }>('SELECT COUNT(*)::text as count FROM public.leads WHERE is_demo = true'),
      query<{ source: string; count: string }>(
        'SELECT LOWER(source) as source, COUNT(*)::text as count FROM public.leads WHERE is_demo = true GROUP BY LOWER(source)'
      ),
    ]);

    const count = parseInt(countRes[0]?.count || '0', 10);
    const sources: Record<string, number> = {};
    sourceRes.forEach((r) => {
      sources[r.source] = parseInt(r.count, 10);
    });

    return NextResponse.json({
      isDemoLoaded: count > 0,
      count,
      sources,
    });
  } catch (err: unknown) {
    console.error('Error fetching demo data status:', err);
    return NextResponse.json({ error: 'Failed to fetch demo data status' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin only governance
    if (!auth.isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Only administrators can manage demo data' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    if (!['seed', 'reseed', 'reset'].includes(action)) {
      return NextResponse.json({ error: 'action must be "seed", "reseed", or "reset"' }, { status: 400 });
    }

    // 1. RESET ACTION: Delete ONLY rows where is_demo = true
    if (action === 'reset') {
      const deletedRows = await query<{ id: string }>(
        'DELETE FROM public.leads WHERE is_demo = true RETURNING id'
      );
      const deletedCount = deletedRows.length;

      // Also clean up any orphan demo follow_ups or history if any
      await query('DELETE FROM public.follow_ups WHERE is_demo = true');
      await query('DELETE FROM public.lead_history WHERE is_demo = true');

      // Audit log
      try {
        await query(
          `INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, new_data)
           VALUES ($1, 'reset_demo_data', 'lead', 'demo_reset', $2)`,
          [
            auth.userId,
            JSON.stringify({
              deleted_count: deletedCount,
              admin: auth.employeeName,
              timestamp: new Date().toISOString(),
            }),
          ]
        );
      } catch (auditErr) {
        console.warn('Audit log error on demo reset:', auditErr);
      }

      return NextResponse.json({
        success: true,
        action: 'reset',
        deletedCount,
        message: `Successfully removed ${deletedCount} demo leads. Real production records remain strictly untouched.`,
      });
    }

    // 2. SEED / RESEED ACTION: Ensure exactly 100 demo leads
    if (action === 'seed' || action === 'reseed') {
      // Clean up previous demo leads first to guarantee idempotent seed
      await query('DELETE FROM public.leads WHERE is_demo = true');
      await query('DELETE FROM public.follow_ups WHERE is_demo = true');
      await query('DELETE FROM public.lead_history WHERE is_demo = true');

      // Fetch Rohan's and Admin's employee IDs
      const [rohanRows, adminRows] = await Promise.all([
        query<{ id: string }>(
          `SELECT e.id FROM public.employees e 
           JOIN public.profiles p ON e.user_id = p.id 
           WHERE p.full_name ILIKE '%rohan%' OR p.role = 'employee' 
           ORDER BY e.created_at ASC LIMIT 1`
        ),
        query<{ id: string }>(
          `SELECT e.id FROM public.employees e 
           JOIN public.profiles p ON e.user_id = p.id 
           WHERE p.role IN ('super_admin', 'admin') 
           ORDER BY e.created_at ASC LIMIT 1`
        ),
      ]);

      const rohanId = rohanRows[0]?.id || null;
      const adminId = adminRows[0]?.id || null;

      const demoDataset = generate100DemoLeads();
      let seededCount = 0;

      for (const item of demoDataset) {
        let assignedTo: string | null = null;
        if (item.assignTarget === 'rohan') {
          assignedTo = rohanId;
        } else if (item.assignTarget === 'admin') {
          assignedTo = adminId;
        }

        const insertSql = `
          INSERT INTO public.leads (
            full_name,
            email,
            phone,
            source,
            source_detail,
            is_demo,
            lead_type,
            status,
            budget_min,
            budget_max,
            property_type,
            location,
            preferred_location,
            requirement,
            remarks,
            assigned_to,
            created_by
          ) VALUES ($1, $2, $3, $4, $5, true, $6, $7, $8, $9, $10, $11, $11, $12, $13, $14, $15)
          RETURNING id, full_name, phone
        `;

        const inserted = await query<{ id: string; full_name: string; phone: string }>(insertSql, [
          item.fullName,
          item.email,
          item.phone,
          item.source,
          item.sourceDetail,
          item.leadType,
          item.status,
          item.budgetMin,
          item.budgetMax,
          item.propertyType,
          item.location,
          item.requirement,
          item.remarks,
          assignedTo,
          auth.userId,
        ]);

        if (inserted[0]?.id) {
          seededCount++;
          // Create initial lead_history
          await query(
            `INSERT INTO public.lead_history (lead_id, actor_id, actor_name, action_type, title, description, details, is_demo)
             VALUES ($1, $2, $3, 'created', 'Demo Lead Initialized', $4, $5, true)`,
            [
              inserted[0].id,
              auth.userId,
              auth.employeeName,
              `Demo lead generated from ${item.source} (${item.sourceDetail}). Assigned to: ${item.assignTarget}.`,
              JSON.stringify({ source: item.source, source_detail: item.sourceDetail, target: item.assignTarget }),
            ]
          );
        }
      }

      // Audit log
      try {
        await query(
          `INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, new_data)
           VALUES ($1, 'seed_demo_data', 'lead', 'demo_seed', $2)`,
          [
            auth.userId,
            JSON.stringify({
              seeded_count: seededCount,
              admin: auth.employeeName,
              timestamp: new Date().toISOString(),
            }),
          ]
        );
      } catch (auditErr) {
        console.warn('Audit log error on demo seed:', auditErr);
      }

      // Count sources
      const sourceCountRes = await query<{ source: string; count: string }>(
        'SELECT LOWER(source) as source, COUNT(*)::text as count FROM public.leads WHERE is_demo = true GROUP BY LOWER(source)'
      );
      const sourceCounts: Record<string, number> = {};
      sourceCountRes.forEach((r) => {
        sourceCounts[r.source] = parseInt(r.count, 10);
      });

      return NextResponse.json({
        success: true,
        action: 'seed',
        seededCount,
        insertedCount: seededCount,
        sourceCounts,
        message: `Successfully seeded exactly ${seededCount} demo leads (Meta Ads: 30, Housing: 25, WhatsApp: 15, Google: 12, Instagram: 10, Website: 5, Manual: 3).`,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: unknown) {
    console.error('Error executing demo data operation:', err);
    return NextResponse.json({ error: 'Failed to process demo data operation' }, { status: 500 });
  }
}
