import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getSessionUserId } from '@github-trending/server/auth';

export async function GET() {
  const userId = await getSessionUserId(prisma);
  if (!userId) {
    console.log('[AUTH] GET /api/auth/me → no session');
    return NextResponse.json({ user: null });
  }
  console.log('[AUTH] GET /api/auth/me → userId:', userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      githubId: true,
      username: true,
      avatarUrl: true,
    },
  });

  return NextResponse.json({ user });
}
