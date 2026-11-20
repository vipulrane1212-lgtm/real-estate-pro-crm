import { cookies } from 'next/headers';

export interface SessionData {
  userId: string;
  email: string;
  role: 'super_admin' | 'admin' | 'employee';
}

const SESSION_COOKIE_NAME = 'diksha_crm_session';

export async function setSession(data: SessionData) {
  const cookieStore = await cookies();
  const sessionToken = Buffer.from(JSON.stringify(data)).toString('base64');
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

    const decoded = Buffer.from(sessionCookie.value, 'base64').toString('utf-8');
    return JSON.parse(decoded) as SessionData;
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
  try {
    const decoded = Buffer.from(match[1], 'base64').toString('utf-8');
    return JSON.parse(decoded) as SessionData;
  } catch {
    return null;
  }
}
