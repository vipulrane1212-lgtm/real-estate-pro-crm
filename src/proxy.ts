import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { parseSessionFromHeader, decodeSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/forgot-password');
  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/employees') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/leads') ||
    pathname.startsWith('/properties') ||
    pathname.startsWith('/follow-ups') ||
    pathname.startsWith('/site-visits') ||
    pathname.startsWith('/documents') ||
    pathname.startsWith('/calls') ||
    pathname.startsWith('/whatsapp') ||
    pathname.startsWith('/brokerage') ||
    pathname.startsWith('/accounts') ||
    pathname.startsWith('/reports');

  // Check Local Session Cookie first (from parsed request cookies or raw header)
  const cookieVal = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  let localSession = cookieVal ? decodeSessionToken(cookieVal) : null;
  if (!localSession) {
    localSession = parseSessionFromHeader(request.headers.get('cookie'));
  }
  let isAuthenticated = !!localSession?.userId;

  // If no local session cookie, check Supabase auth
  if (!isAuthenticated) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder')) {
      try {
        const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) =>
                request.cookies.set(name, value)
              );
              response = NextResponse.next({
                request: {
                  headers: request.headers,
                },
              });
              cookiesToSet.forEach(({ name, value, options }) =>
                response.cookies.set(name, value, options as CookieOptions)
              );
            },
          },
        });

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          isAuthenticated = true;
        }
      } catch {
        // Fallback gracefully if Supabase service is not reachable
      }
    }
  }

  // Handle Root Route Redirect
  if (pathname === '/') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // If not authenticated and accessing protected route
  if (!isAuthenticated && isProtectedRoute) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If already authenticated and accessing auth page
  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
