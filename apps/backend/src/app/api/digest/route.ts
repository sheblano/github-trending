import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getAuthenticatedUserId, decrypt } from '@github-trending/server/auth';
import { searchRepositories } from '@github-trending/server/github-client';
import { buildSearchQuery, mapSortField } from '@github-trending/shared/utils';
import type { DigestResponse } from '@github-trending/shared/models';

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
  const threshold = user.lastDigestSeenAt ?? new Date(0);

  const followedRepos = await prisma.followedRepo.findMany({
    where: { userId },
    select: { id: true, language: true },
  });

  // Single query instead of one per repo: count repos that have at least one
  // unseen release using a grouped aggregate.
  const unseenGroups = await prisma.releaseCache.groupBy({
    by: ['repoId'],
    where: {
      repoId: { in: followedRepos.map((r) => r.id) },
      publishedAt: { gt: threshold },
    },
    _count: { repoId: true },
  });
  const newReleaseCount = unseenGroups.length;

  // Determine the user's top languages from followed repos.
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

  const langsToSearch = topLangs.length > 0 ? topLangs : ['TypeScript', 'Python', 'Go'];

  // Fetch trending repos for all languages in parallel instead of sequentially.
  const perLangResults = await Promise.all(
    langsToSearch.map(async (lang) => {
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
        return result.items;
      } catch {
        return [];
      }
    })
  );

  const seenIds = new Set<number>();
  const trendingInYourLangs: DigestResponse['trendingInYourLangs'] = [];
  for (const items of perLangResults) {
    for (const item of items) {
      if (trendingInYourLangs.length >= 10) break;
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
    }
    if (trendingInYourLangs.length >= 10) break;
  }

  const hasUnseen = newReleaseCount > 0 || user.lastDigestSeenAt === null;

  return NextResponse.json({
    newReleaseCount,
    trendingInYourLangs,
    hasUnseen,
  } satisfies DigestResponse);
}
