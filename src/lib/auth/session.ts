import { cookies } from 'next/headers';

export interface SessionData {
  userId: string;
  email: string;
  role: 'super_admin' | 'admin' | 'employee';
}

export const SESSION_COOKIE_NAME = 'diksha_crm_session';

export function decodeSessionToken(rawToken: string): SessionData | null {
  if (!rawToken) return null;
  try {
    let clean = rawToken.trim();
    try {
      clean = decodeURIComponent(clean);
    } catch {
      // Ignore if not uri-encoded
    }

    // Try standard base64 first
    try {
      const jsonStr = Buffer.from(clean, 'base64').toString('utf-8');
      const data = JSON.parse(jsonStr) as SessionData;
      if (data && data.userId) return data;
    } catch {
      // fallback to base64url
    }

    // Try base64url
    try {
      const jsonStr = Buffer.from(clean, 'base64url').toString('utf-8');
      const data = JSON.parse(jsonStr) as SessionData;
      if (data && data.userId) return data;
    } catch {
      // fallback
    }

    return null;
  } catch {
    return null;
  }
}

export async function setSession(data: SessionData) {
  const cookieStore = await cookies();
  // Use base64url for safe cookie storage without '+' or '=' padding
  const sessionToken = Buffer.from(JSON.stringify(data)).toString('base64url');
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) return null;
    return decodeSessionToken(sessionCookie.value);
  } catch {
    return null;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export function parseSessionFromHeader(cookieHeader: string | null): SessionData | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  if (!match || !match[1]) return null;
  return decodeSessionToken(match[1]);
}
