import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getAuthenticatedUserId } from '@github-trending/server/auth';

export async function GET() {
  const userId = await getAuthenticatedUserId(prisma);
  if (!userId) {
    return NextResponse.json({ user: null });
  }

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
