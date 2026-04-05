import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const SESSION_COOKIE = 'session_id';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function isSecure(): boolean {
  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] || '';
  return appUrl.startsWith('https://');
}

export async function createSession(
  prisma: PrismaClient,
  userId: number
): Promise<string> {
  const session = await prisma.session.create({
    data: {
      userId,
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
    },
  });
  return session.id;
}

export function setSessionCookieOnResponse(
  response: NextResponse,
  sessionId: string
): void {
  response.cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: isSecure(),
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_MS / 1000,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionUserId(
  prisma: PrismaClient
): Promise<number | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { userId: true, expiresAt: true },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: sessionId } }).catch((err) =>
        console.error('[session] failed to delete expired session:', err)
      );
    }
    return null;
  }

  return session.userId;
}

export async function invalidateSession(prisma: PrismaClient): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    await prisma.session.delete({ where: { id: sessionId } }).catch((err) =>
      console.error('[session] failed to delete session on invalidate:', err)
    );
  }
  await clearSessionCookie();
}
