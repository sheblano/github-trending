import { PrismaClient } from '@prisma/client';
import {
  getUserStarredRepos,
  getRepoReleases,
} from '@github-trending/server/github-client';
import { TIMELINE_EVENT_TYPES } from '@github-trending/shared/models';
import type { GitHubRepo } from '@github-trending/shared/models';

const ONE_HOUR_MS = 60 * 60 * 1000;

export async function reconcileStarredRepos(
  prisma: PrismaClient,
  userId: number,
  token: string
): Promise<void> {
  const githubStars = await getAllStarredRepos(token);
  const githubRepoIds = new Set(githubStars.map((r) => r.id));

  const localFollowed = await prisma.followedRepo.findMany({
    where: { userId },
  });
  const localRepoIds = new Set(localFollowed.map((r) => r.githubRepoId));

  await upsertNewStars(prisma, userId, githubStars, localRepoIds);
  await removeUnstarred(prisma, localFollowed, githubRepoIds);
  await refreshMetadata(prisma, userId, githubStars, localRepoIds);
}

async function upsertNewStars(
  prisma: PrismaClient,
  userId: number,
  githubStars: GitHubRepo[],
  localRepoIds: Set<number>
): Promise<void> {
  const toAdd = githubStars.filter((r) => !localRepoIds.has(r.id));
  for (const repo of toAdd) {
    await prisma.followedRepo.upsert({
      where: {
        userId_githubRepoId: { userId, githubRepoId: repo.id },
      },
      create: {
        userId,
        githubRepoId: repo.id,
        owner: repo.owner.login,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        language: repo.language,
        starsCount: repo.stargazers_count,
        url: repo.html_url,
      },
      update: {
        description: repo.description,
        language: repo.language,
        starsCount: repo.stargazers_count,
      },
    });
  }
}

async function removeUnstarred(
  prisma: PrismaClient,
  localFollowed: { id: number; githubRepoId: number }[],
  githubRepoIds: Set<number>
): Promise<void> {
  const toRemove = localFollowed.filter(
    (r) => !githubRepoIds.has(r.githubRepoId)
  );
  if (toRemove.length > 0) {
    await prisma.followedRepo.deleteMany({
      where: { id: { in: toRemove.map((r) => r.id) } },
    });
  }
}

async function refreshMetadata(
  prisma: PrismaClient,
  userId: number,
  githubStars: GitHubRepo[],
  localRepoIds: Set<number>
): Promise<void> {
  const toRefresh = githubStars.filter((r) => localRepoIds.has(r.id));
  for (const repo of toRefresh) {
    await prisma.followedRepo.updateMany({
      where: { userId, githubRepoId: repo.id },
      data: {
        description: repo.description,
        language: repo.language,
        starsCount: repo.stargazers_count,
      },
    });
  }
}

async function getAllStarredRepos(token: string): Promise<GitHubRepo[]> {
  const allRepos: GitHubRepo[] = [];
  let page = 1;
  while (true) {
    const repos = await getUserStarredRepos(token, page, 100);
    allRepos.push(...repos);
    if (repos.length < 100) break;
    page++;
  }
  return allRepos;
}

export async function syncReleasesForRepo(
  prisma: PrismaClient,
  followedRepoId: number,
  owner: string,
  name: string,
  token?: string
): Promise<void> {
  if (await isRecentlySynced(prisma, followedRepoId)) return;

  const response = await getRepoReleases(owner, name, {
    token,
    etag: (await latestCacheEntry(prisma, followedRepoId))?.etag,
  });

  if (response.notModified) return;

  const followed = await prisma.followedRepo.findUnique({
    where: { id: followedRepoId },
  });

  for (const release of response.data) {
    const isNew = await upsertRelease(
      prisma,
      followedRepoId,
      release,
      response.etag
    );
    if (isNew && followed && release.published_at) {
      await createReleaseEvent(prisma, followed, release);
    }
  }
}

async function isRecentlySynced(
  prisma: PrismaClient,
  followedRepoId: number
): Promise<boolean> {
  const latest = await latestCacheEntry(prisma, followedRepoId);
  return !!latest && Date.now() - latest.fetchedAt.getTime() < ONE_HOUR_MS;
}

async function latestCacheEntry(
  prisma: PrismaClient,
  followedRepoId: number
) {
  return prisma.releaseCache.findFirst({
    where: { repoId: followedRepoId },
    orderBy: { fetchedAt: 'desc' },
  });
}

interface ReleasePayload {
  tag_name: string;
  name: string | null;
  body: string | null;
  published_at: string | null;
  html_url: string;
}

async function upsertRelease(
  prisma: PrismaClient,
  repoId: number,
  release: ReleasePayload,
  etag: string | null
): Promise<boolean> {
  const existing = await prisma.releaseCache.findUnique({
    where: { repoId_tagName: { repoId, tagName: release.tag_name } },
  });

  await prisma.releaseCache.upsert({
    where: { repoId_tagName: { repoId, tagName: release.tag_name } },
    create: {
      repoId,
      tagName: release.tag_name,
      name: release.name,
      body: release.body,
      publishedAt: release.published_at
        ? new Date(release.published_at)
        : null,
      htmlUrl: release.html_url,
      etag,
    },
    update: {
      name: release.name,
      body: release.body,
      publishedAt: release.published_at
        ? new Date(release.published_at)
        : null,
      etag,
      fetchedAt: new Date(),
    },
  });

  return !existing;
}

async function createReleaseEvent(
  prisma: PrismaClient,
  followed: { githubRepoId: number; owner: string; name: string; fullName: string },
  release: ReleasePayload
): Promise<void> {
  await prisma.timelineEvent.create({
    data: {
      githubRepoId: followed.githubRepoId,
      owner: followed.owner,
      name: followed.name,
      fullName: followed.fullName,
      eventType: TIMELINE_EVENT_TYPES.RELEASE_PUBLISHED,
      title: `Release ${release.tag_name}`,
      description: release.name ?? release.tag_name,
      url: release.html_url,
      eventAt: new Date(release.published_at!),
      meta: { tagName: release.tag_name },
    },
  });
}
