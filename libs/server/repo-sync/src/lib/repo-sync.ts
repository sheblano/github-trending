import { PrismaClient } from '@prisma/client';
import {
  getUserStarredRepos,
  getRepoReleases,
} from '@github-trending/server/github-client';

export async function reconcileStarredRepos(
  prisma: PrismaClient,
  userId: number,
  token: string
) {
  const githubStars = await getAllStarredRepos(token);
  const githubRepoIds = new Set(githubStars.map((r) => r.id));

  const localFollowed = await prisma.followedRepo.findMany({
    where: { userId },
  });
  const localRepoIds = new Set(localFollowed.map((r) => r.githubRepoId));

  // Add repos starred on GitHub but missing locally
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

  // Remove repos unstarred on GitHub
  const toRemove = localFollowed.filter(
    (r) => !githubRepoIds.has(r.githubRepoId)
  );
  if (toRemove.length > 0) {
    await prisma.followedRepo.deleteMany({
      where: { id: { in: toRemove.map((r) => r.id) } },
    });
  }

  // Refresh metadata for existing repos
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

async function getAllStarredRepos(token: string) {
  const allRepos = [];
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
) {
  const existing = await prisma.releaseCache.findFirst({
    where: { repoId: followedRepoId },
    orderBy: { fetchedAt: 'desc' },
  });

  const ONE_HOUR = 60 * 60 * 1000;
  if (existing && Date.now() - existing.fetchedAt.getTime() < ONE_HOUR) {
    return;
  }

  const response = await getRepoReleases(owner, name, {
    token,
    etag: existing?.etag,
  });

  if (response.notModified) return;

  for (const release of response.data) {
    await prisma.releaseCache.upsert({
      where: {
        repoId_tagName: {
          repoId: followedRepoId,
          tagName: release.tag_name,
        },
      },
      create: {
        repoId: followedRepoId,
        tagName: release.tag_name,
        name: release.name,
        body: release.body,
        publishedAt: release.published_at
          ? new Date(release.published_at)
          : null,
        htmlUrl: release.html_url,
        etag: response.etag,
      },
      update: {
        name: release.name,
        body: release.body,
        publishedAt: release.published_at
          ? new Date(release.published_at)
          : null,
        etag: response.etag,
        fetchedAt: new Date(),
      },
    });
  }
}
