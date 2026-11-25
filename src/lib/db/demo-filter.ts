/**
 * Helper to determine if demo data should be included in database queries.
 * Inspects query params (?include_demo=true/false), header (x-include-demo),
 * or the global cookie (diksha_demo_mode=true/false).
 */
export function shouldIncludeDemo(request: Request): boolean {
  try {
    const url = new URL(request.url);
    const includeDemoParam = url.searchParams.get('include_demo') || url.searchParams.get('show_demo');
    if (includeDemoParam !== null) {
      return includeDemoParam === 'true' || includeDemoParam === '1';
    }

    const demoParam = url.searchParams.get('demo');
    if (demoParam === 'real') return false;
    if (demoParam === 'only') return true;

    const headerVal = request.headers.get('x-include-demo');
    if (headerVal !== null) {
      return headerVal === 'true' || headerVal === '1';
    }

    const cookieHeader = request.headers.get('cookie') || '';
    if (cookieHeader.includes('diksha_demo_mode=false')) {
      return false;
    }
    if (cookieHeader.includes('diksha_demo_mode=true')) {
      return true;
    }
  } catch {
    // fallback
  }

  // Default to true for showcase
  return true;
}

/**
 * Returns SQL condition string to filter out demo rows when demo mode is off.
 * If includeDemo is true, returns empty string.
 */
export function getDemoCondition(alias?: string, includeDemo: boolean = true): string {
  if (includeDemo) {
    return '';
  }
  const prefix = alias ? `${alias}.` : '';
  return `(${prefix}is_demo IS FALSE OR ${prefix}is_demo IS NULL)`;
}
