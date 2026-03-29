import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getAuthenticatedUserId } from '@github-trending/server/auth';

export async function POST() {
  const userId = await getAuthenticatedUserId(prisma);
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { lastDigestSeenAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
