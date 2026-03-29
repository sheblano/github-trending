import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getAuthenticatedUserId, decrypt } from '@github-trending/server/auth';
import { syncReleasesForRepo } from '@github-trending/server/repo-sync';

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
  const perPage = Math.min(30, Math.max(1, parseInt(searchParams.get('perPage') ?? '10', 10)));
  const skip = (page - 1) * perPage;

  const token = decrypt(user.accessTokenEnc);

  const totalRepos = await prisma.followedRepo.count({ where: { userId } });

  // Return cached DB data immediately; sync in the background.
  // On the very first load (no cached releases at all), wait for the first batch.
  const cachedCount = await prisma.releaseCache.count({
    where: { repo: { userId } },
  });

  const syncInBackground = () => {
    prisma.followedRepo
      .findMany({ where: { userId }, select: { id: true, owner: true, name: true } })
      .then(async (repos) => {
        const CONCURRENCY = 5;
        for (let i = 0; i < repos.length; i += CONCURRENCY) {
          await Promise.all(
            repos.slice(i, i + CONCURRENCY).map((r) =>
              syncReleasesForRepo(prisma, r.id, r.owner, r.name, token).catch(() => {})
            )
          );
        }
      })
      .catch(() => {});
  };

  if (cachedCount === 0 && totalRepos > 0) {
    // First ever load: wait for one batch so the tab isn't blank.
    const firstBatch = await prisma.followedRepo.findMany({
      where: { userId },
      take: 5,
      select: { id: true, owner: true, name: true },
    });
    await Promise.all(
      firstBatch.map((r) =>
        syncReleasesForRepo(prisma, r.id, r.owner, r.name, token).catch(() => {})
      )
    );
    // Sync the rest in background.
    syncInBackground();
  } else {
    syncInBackground();
  }

  // Fetch the paginated repos and their cached releases.
  const followedRepos = await prisma.followedRepo.findMany({
    where: { userId },
    orderBy: { followedAt: 'desc' },
    skip,
    take: perPage,
  });

  const feeds = await Promise.all(
    followedRepos.map(async (repo) => {
      const releases = await prisma.releaseCache.findMany({
        where: { repoId: repo.id },
        orderBy: { publishedAt: 'desc' },
        take: 10,
      });

      const hasUnseen = releases.some((r) => {
        if (!r.publishedAt) return false;
        const threshold = repo.lastSeenReleaseAt || repo.followedAt;
        return r.publishedAt > threshold;
      });

      return {
        repoFullName: repo.fullName,
        repoOwner: repo.owner,
        repoName: repo.name,
        releases: releases.map((r) => ({
          id: r.id,
          tagName: r.tagName,
          name: r.name,
          body: r.body,
          publishedAt: r.publishedAt?.toISOString() ?? null,
          htmlUrl: r.htmlUrl,
        })),
        hasUnseen,
      };
    })
  );

  return NextResponse.json({ feeds, totalCount: totalRepos, page, perPage });
}
