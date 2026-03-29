import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getSessionUserId, decrypt } from '@github-trending/server/auth';
import { reconcileStarredRepos } from '@github-trending/server/repo-sync';

export async function GET() {
  const userId = await getSessionUserId(prisma);
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 });
  }

  const token = decrypt(user.accessTokenEnc);
  await reconcileStarredRepos(prisma, userId, token);

  const starred = await prisma.followedRepo.findMany({
    where: { userId },
    orderBy: { followedAt: 'desc' },
  });

  return NextResponse.json({ starred });
}
