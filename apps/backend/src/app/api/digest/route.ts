import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getSessionUserId, decrypt } from '@github-trending/server/auth';
import { searchRepositories } from '@github-trending/server/github-client';
import { buildSearchQuery, mapSortField } from '@github-trending/shared/utils';
import type { DigestResponse } from '@github-trending/shared/models';

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

  const followedRepos = await prisma.followedRepo.findMany({
    where: { userId },
  });

  const threshold = user.lastDigestSeenAt ?? new Date(0);

  let newReleaseCount = 0;
  for (const repo of followedRepos) {
    const hasNew = await prisma.releaseCache.findFirst({
      where: {
        repoId: repo.id,
        publishedAt: { gt: threshold },
      },
    });
    if (hasNew) {
      newReleaseCount++;
    }
  }

  const langCounts = new Map<string, number>();
  for (const r of followedRepos) {
    if (r.language) {
      langCounts.set(r.language, (langCounts.get(r.language) ?? 0) + 1);
    }
  }
  const topLangs = [...langCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([lang]) => lang);

  const seenIds = new Set<number>();
  const trendingInYourLangs: DigestResponse['trendingInYourLangs'] = [];

  const langsToSearch =
    topLangs.length > 0 ? topLangs : ['TypeScript', 'Python', 'Go'];

  for (const lang of langsToSearch) {
    if (trendingInYourLangs.length >= 10) break;
    const query = buildSearchQuery({
      language: lang,
      topics: [],
      dateRange: 'weekly',
      searchQuery: '',
    });
    try {
      const result = await searchRepositories({
        query,
        sort: mapSortField('stars'),
        order: 'desc',
        page: 1,
        perPage: 5,
        token,
      });
      for (const item of result.items) {
        if (seenIds.has(item.id)) continue;
        seenIds.add(item.id);
        trendingInYourLangs.push({
          id: item.id,
          fullName: item.full_name,
          description: item.description,
          language: item.language,
          stars: item.stargazers_count,
          url: item.html_url,
        });
        if (trendingInYourLangs.length >= 10) break;
      }
    } catch {
      // skip language on error
    }
  }

  const hasUnseen =
    newReleaseCount > 0 || user.lastDigestSeenAt === null;

  const body: DigestResponse = {
    newReleaseCount,
    trendingInYourLangs,
    hasUnseen,
  };

  return NextResponse.json(body);
}
