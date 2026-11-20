import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface ImportRow {
  fullName: string;
  phone: string;
  email?: string;
  budgetMin?: number;
  budgetMax?: number;
  location?: string;
  requirement?: string;
  source?: string;
  leadType?: string;
  status?: string;
  remarks?: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export async function GET() {
  const csvTemplate = `full_name,phone,email,budget_min,budget_max,location,requirement,source,lead_type,status,remarks
"Rajesh Kumar","9876543210","rajesh@example.com",6000000,9000000,"Gomti Nagar","3 BHK","walk_in","buy","new","Looking for ready to move apartment"
"Priya Sharma","9812345678","priya@example.com",35000,45000,"Indira Nagar","2 BHK","instagram","rent","new","Near metro station"
"Amit Verma","9988776655","amit@example.com",15000000,20000000,"Vibhuti Khand","Commercial Office","google","commercial","contacted","For IT consulting firm"`;

  return new NextResponse(csvTemplate, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="leads_import_template.csv"',
    },
  });
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    let parsedRows: ImportRow[] = [];

    if (contentType.includes('application/json')) {
      const body = await request.json();
      if (!Array.isArray(body.leads)) {
        return NextResponse.json({ error: 'Payload must include an array of leads' }, { status: 400 });
      }
      parsedRows = body.leads.map((item: Record<string, unknown>) => ({
        fullName: String(item.full_name || item.fullName || item['Client Name'] || item.name || '').trim(),
        phone: String(item.phone || item.mobile || item['Mobile'] || item['Phone'] || '').trim(),
        email: String(item.email || item['Email'] || '').trim() || undefined,
        budgetMin: Number(item.budget_min || item.budgetMin || item['Budget Min'] || item['Min Budget']) || undefined,
        budgetMax: Number(item.budget_max || item.budgetMax || item['Budget Max'] || item['Max Budget']) || undefined,
        location: String(item.location || item['Location'] || item['Area'] || '').trim() || undefined,
        requirement: String(item.requirement || item['Requirement'] || item['BHK'] || '').trim() || undefined,
        source: String(item.source || item['Source'] || item['Lead Source'] || 'website').toLowerCase().trim(),
        leadType: String(item.lead_type || item.leadType || item['Type'] || 'buy').toLowerCase().trim(),
        status: String(item.status || item['Status'] || 'new').toLowerCase().trim(),
        remarks: String(item.remarks || item.notes || item['Remarks'] || item['Notes'] || '').trim() || undefined,
      }));
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'No CSV file uploaded' }, { status: 400 });
      }

      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        return NextResponse.json({ error: 'CSV file must have a header row and at least 1 data row' }, { status: 400 });
      }

      const header = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
      const colMap: Record<string, number> = {};
      header.forEach((h, idx) => {
        colMap[h] = idx;
      });

      const getCol = (cols: string[], ...aliases: string[]): string => {
        for (const alias of aliases) {
          const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (colMap[cleanAlias] !== undefined) {
            return cols[colMap[cleanAlias]] || '';
          }
        }
        return '';
      };

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        if (cols.every((c) => !c)) continue;

        parsedRows.push({
          fullName: getCol(cols, 'clientname', 'fullname', 'name'),
          phone: getCol(cols, 'mobile', 'phone', 'contact'),
          email: getCol(cols, 'email', 'emailaddress') || undefined,
          budgetMin: Number(getCol(cols, 'budgetmin', 'minbudget')) || undefined,
          budgetMax: Number(getCol(cols, 'budgetmax', 'maxbudget')) || undefined,
          location: getCol(cols, 'location', 'area', 'city') || undefined,
          requirement: getCol(cols, 'requirement', 'bhk', 'config') || undefined,
          source: getCol(cols, 'source', 'leadsource') || 'website',
          leadType: getCol(cols, 'type', 'leadtype') || 'buy',
          status: getCol(cols, 'status') || 'new',
          remarks: getCol(cols, 'remarks', 'notes', 'comment') || undefined,
        });
      }
    }

    if (parsedRows.length === 0) {
      return NextResponse.json({ error: 'No leads found to import' }, { status: 400 });
    }

    const errors: { row: number; error: string; data?: unknown }[] = [];
    let successCount = 0;

    for (let index = 0; index < parsedRows.length; index++) {
      const row = parsedRows[index];
      const rowNum = index + 1;

      if (!row.fullName) {
        errors.push({ row: rowNum, error: 'Missing client name', data: row });
        continue;
      }

      const cleanPhone = row.phone.replace(/[^0-9+]/g, '');
      if (!cleanPhone || cleanPhone.length < 8) {
        errors.push({ row: rowNum, error: `Invalid mobile number: "${row.phone}"`, data: row });
        continue;
      }

      // Sanitize status and types
      const validStatuses = ['new', 'contacted', 'follow_up', 'site_visit', 'negotiation', 'closed_won', 'closed_lost'];
      let sanitizedStatus = row.status?.replace(/\s+/g, '_') || 'new';
      if (!validStatuses.includes(sanitizedStatus)) sanitizedStatus = 'new';

      const validSources = ['walk_in', 'reference', 'instagram', 'google', 'website', 'other'];
      let sanitizedSource = row.source?.replace(/\s+/g, '_') || 'website';
      if (!validSources.includes(sanitizedSource)) sanitizedSource = 'website';

      const validTypes = ['buy', 'sell', 'rent', 'commercial'];
      let sanitizedType = row.leadType || 'buy';
      if (!validTypes.includes(sanitizedType)) sanitizedType = 'buy';

      const assignedEmployeeId = auth.isAdmin ? null : auth.employeeId;

      try {
        const insertRes = await query<{ id: string }>(
          `INSERT INTO public.leads (
            full_name,
            phone,
            email,
            lead_type,
            status,
            source,
            budget_min,
            budget_max,
            location,
            preferred_location,
            requirement,
            remarks,
            assigned_to,
            created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING id`,
          [
            row.fullName,
            cleanPhone,
            row.email || null,
            sanitizedType,
            sanitizedStatus,
            sanitizedSource,
            row.budgetMin || null,
            row.budgetMax || null,
            row.location || null,
            row.location || null,
            row.requirement || null,
            row.remarks || null,
            assignedEmployeeId,
            auth.userId,
          ]
        );

        if (insertRes[0]?.id) {
          successCount++;
          await query(
            `INSERT INTO public.lead_history (lead_id, actor_id, actor_name, action_type, title, description)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              insertRes[0].id,
              auth.userId,
              auth.employeeName,
              'created',
              'Lead Imported via CSV',
              `Batch imported: ${row.fullName} (${cleanPhone}).`,
            ]
          );
        }
      } catch (insertErr: unknown) {
        errors.push({ row: rowNum, error: (insertErr as Error).message || 'Database error', data: row });
      }
    }

    return NextResponse.json({
      success: true,
      importedCount: successCount,
      totalProcessed: parsedRows.length,
      errors,
    });
  } catch (err: unknown) {
    console.error('Error importing leads:', err);
    return NextResponse.json({ error: 'Failed to process lead import' }, { status: 500 });
  }
}
