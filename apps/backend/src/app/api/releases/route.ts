import { NextResponse } from 'next/server';
import type { PrismaClient } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { getAuthenticatedUserId, decrypt } from '@github-trending/server/auth';
import { syncReleasesForRepo } from '@github-trending/server/repo-sync';

const SYNC_CONCURRENCY = 5;

async function syncAllFollowedRepos(
  db: PrismaClient,
  userId: number,
  token: string
): Promise<void> {
  try {
    const repos = await db.followedRepo.findMany({
      where: { userId },
      select: { id: true, owner: true, name: true },
    });
    for (let i = 0; i < repos.length; i += SYNC_CONCURRENCY) {
      await Promise.all(
        repos.slice(i, i + SYNC_CONCURRENCY).map((r) =>
          syncReleasesForRepo(db, r.id, r.owner, r.name, token).catch((err) =>
            console.error(`[releases] sync failed for ${r.owner}/${r.name}:`, err)
          )
        )
      );
    }
  } catch (err) {
    console.error('[releases] background sync failed:', err);
  }
}

async function ensureInitialSync(
  db: PrismaClient,
  userId: number,
  token: string
): Promise<void> {
  const firstBatch = await db.followedRepo.findMany({
    where: { userId },
    take: 5,
    select: { id: true, owner: true, name: true },
  });
  await Promise.all(
    firstBatch.map((r) =>
      syncReleasesForRepo(db, r.id, r.owner, r.name, token).catch((err) =>
        console.error(`[releases] first-batch sync failed for ${r.owner}/${r.name}:`, err)
      )
    )
  );
}

interface ReleaseFeed {
  repoFullName: string;
  repoOwner: string;
  repoName: string;
  releases: {
    id: number;
    tagName: string;
    name: string | null;
    body: string | null;
    publishedAt: string | null;
    htmlUrl: string;
  }[];
  hasUnseen: boolean;
}

async function buildReleaseFeeds(
  db: PrismaClient,
  userId: number,
  skip: number,
  take: number
): Promise<ReleaseFeed[]> {
  const followedRepos = await db.followedRepo.findMany({
    where: { userId },
    orderBy: { followedAt: 'desc' },
    skip,
    take,
  });

  return Promise.all(
    followedRepos.map(async (repo) => {
      const releases = await db.releaseCache.findMany({
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
}

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

  const cachedCount = await prisma.releaseCache.count({
    where: { repo: { userId } },
  });

  if (cachedCount === 0 && totalRepos > 0) {
    await ensureInitialSync(prisma, userId, token);
  }
  syncAllFollowedRepos(prisma, userId, token);

  const feeds = await buildReleaseFeeds(prisma, userId, skip, perPage);

  return NextResponse.json({ feeds, totalCount: totalRepos, page, perPage });
}
