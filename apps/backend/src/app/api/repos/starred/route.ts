import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getAuthenticatedUserId, decrypt } from '@github-trending/server/auth';
import { reconcileStarredRepos } from '@github-trending/server/repo-sync';

export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId(prisma);
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const perPage = Math.min(50, Math.max(1, parseInt(searchParams.get('perPage') ?? '20', 10)));
  const skip = (page - 1) * perPage;

  const token = decrypt(user.accessTokenEnc);

  // If nothing in DB yet, wait for the first sync so the page isn't empty.
  // Otherwise return cached data immediately and sync in the background.
  const existingCount = await prisma.followedRepo.count({ where: { userId } });
  if (existingCount === 0) {
    await reconcileStarredRepos(prisma, userId, token);
  } else {
    reconcileStarredRepos(prisma, userId, token).catch((err) =>
      console.error('[starred] background reconcile failed:', err)
    );
  }

  const [starred, totalCount] = await Promise.all([
    prisma.followedRepo.findMany({
      where: { userId },
      orderBy: { followedAt: 'desc' },
      skip,
      take: perPage,
    }),
    prisma.followedRepo.count({ where: { userId } }),
  ]);

  return NextResponse.json({ starred, totalCount, page, perPage });
}
