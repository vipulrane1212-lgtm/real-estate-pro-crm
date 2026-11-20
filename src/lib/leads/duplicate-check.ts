import { query } from '@/lib/db';

export interface DuplicateLeadInfo {
  id: string;
  lead_number: number;
  full_name: string;
  phone: string;
  source: string;
  status: string;
  created_at: string;
  assigned_employee_name: string | null;
}

export function normalizePhone(rawPhone: string): { normalized: string; last10: string } {
  if (!rawPhone) return { normalized: '', last10: '' };
  const digits = rawPhone.replace(/\D/g, '');
  const last10 = digits.slice(-10);
  const normalized = last10.length === 10 ? `+91 ${last10.slice(0, 5)} ${last10.slice(5)}` : rawPhone.trim();
  return { normalized, last10 };
}

export async function findDuplicateLead(
  phone: string,
  excludeLeadId?: string
): Promise<DuplicateLeadInfo | null> {
  const { last10 } = normalizePhone(phone);
  if (!last10 || last10.length < 10) return null;

  const sql = `
    SELECT 
      l.id,
      l.lead_number,
      l.full_name,
      l.phone,
      l.source,
      l.status,
      l.created_at,
      p.full_name as assigned_employee_name
    FROM public.leads l
    LEFT JOIN public.employees e ON l.assigned_to = e.id
    LEFT JOIN public.profiles p ON e.user_id = p.id
    WHERE RIGHT(REGEXP_REPLACE(l.phone, '\\D', '', 'g'), 10) = $1
    ${excludeLeadId ? 'AND l.id != $2' : ''}
    ORDER BY l.created_at DESC
    LIMIT 1
  `;

  const params = excludeLeadId ? [last10, excludeLeadId] : [last10];
  const rows = await query<DuplicateLeadInfo>(sql, params);

  return rows.length > 0 ? rows[0] : null;
}
