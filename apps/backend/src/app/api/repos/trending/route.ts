import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { fetchEnrichedRepos } from '../../../../lib/trending-enrich';
import { getAuthenticatedUserId, decrypt } from '@github-trending/server/auth';
import { recordTrendingSnapshotsIfDue } from '@github-trending/server/timeline';
import type {
  DateRange,
  GitHubRepo,
  RepoSortField,
  SortOrder,
  TrendingViewMode,
} from '@github-trending/shared/models';

const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const language = searchParams.get('language') || null;
  const topicsParam = searchParams.get('topics');
  const topics = topicsParam ? topicsParam.split(',') : [];
  const dateRange = (searchParams.get('dateRange') || 'weekly') as DateRange;
  const searchQuery = searchParams.get('q') || '';
  const sortBy = (searchParams.get('sort') || 'stars') as RepoSortField;
  const order = (searchParams.get('order') || 'desc') as SortOrder;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const perPage = Math.min(parseInt(searchParams.get('perPage') || '30', 10), 100);
  const viewMode = (searchParams.get('viewMode') === 'radar'
    ? 'radar'
    : 'default') as TrendingViewMode;

  let token: string | undefined;
  const userId = await getAuthenticatedUserId(prisma);
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      token = decrypt(user.accessTokenEnc);
    }
  }

  const cacheKey = `${language}:${topics.join(',')}:${dateRange}:${searchQuery}:${sortBy}:${order}:${page}:${perPage}:${viewMode}`;
  if (!token) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }
  }

  const { repos: enriched, totalCount } = await fetchEnrichedRepos({
    prisma,
    language,
    topics,
    dateRange,
    searchQuery,
    sortBy,
    order,
    page,
    perPage,
    token,
  });

  let repos: GitHubRepo[] = enriched;
  if (viewMode === 'radar') {
    repos = [...repos].sort((a, b) => {
      const rb = b.radarScore ?? 0;
      const ra = a.radarScore ?? 0;
      if (rb !== ra) return rb - ra;
      return (b.watchScore ?? 0) - (a.watchScore ?? 0);
    });
    repos = repos.map((r, i) => ({ ...r, radarRank: i + 1 }));
  }

  const response = {
    repos,
    totalCount,
    page,
    perPage,
    viewMode,
  };

  try {
    await recordTrendingSnapshotsIfDue(prisma, repos);
  } catch (e) {
    console.error('recordTrendingSnapshotsIfDue', e);
  }

  if (!token) {
    cache.set(cacheKey, { data: response, timestamp: Date.now() });
  }

  return NextResponse.json(response);
}
