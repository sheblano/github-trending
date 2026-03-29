import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getAuthenticatedUserId, decrypt } from '@github-trending/server/auth';
import { syncReleasesForRepo } from '@github-trending/server/repo-sync';

export async function GET() {
  const userId = await getAuthenticatedUserId(prisma);
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 });
  }

  const token = decrypt(user.accessTokenEnc);

  const followedRepos = await prisma.followedRepo.findMany({
    where: { userId },
  });

  // Sync releases in parallel (limited concurrency)
  const CONCURRENCY = 5;
  for (let i = 0; i < followedRepos.length; i += CONCURRENCY) {
    const batch = followedRepos.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map((repo: { id: number; owner: string; name: string }) =>
        syncReleasesForRepo(prisma, repo.id, repo.owner, repo.name, token).catch(
          () => {}
        )
      )
    );
  }

  const feeds = await Promise.all(
    followedRepos.map(async (repo: {
      id: number;
      fullName: string;
      owner: string;
      name: string;
      lastSeenReleaseAt: Date | null;
      followedAt: Date;
    }) => {
      const releases = await prisma.releaseCache.findMany({
        where: { repoId: repo.id },
        orderBy: { publishedAt: 'desc' },
        take: 10,
      });

      const hasUnseen = releases.some((r: { publishedAt: Date | null }) => {
        if (!r.publishedAt) return false;
        const threshold = repo.lastSeenReleaseAt || repo.followedAt;
        return r.publishedAt > threshold;
      });

      return {
        repoFullName: repo.fullName,
        repoOwner: repo.owner,
        repoName: repo.name,
        releases: releases.map((r: {
          id: number;
          tagName: string;
          name: string | null;
          body: string | null;
          publishedAt: Date | null;
          htmlUrl: string;
        }) => ({
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

  return NextResponse.json({ feeds });
}
