import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { searchRepositories } from '@github-trending/server/github-client';
import { getSessionUserId, decrypt } from '@github-trending/server/auth';
import { scoreRepo } from '@github-trending/server/repo-scoring';
import { recordTrendingSnapshotsIfDue } from '@github-trending/server/timeline';
import { buildSearchQuery, mapSortField } from '@github-trending/shared/utils';
import type {
  DateRange,
  GitHubRepo,
  RepoSortField,
  SortOrder,
  StarHistoryPoint,
  TrendingViewMode,
} from '@github-trending/shared/models';

const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

async function loadStarHistoryMap(
  repos: GitHubRepo[]
): Promise<Map<string, StarHistoryPoint[]>> {
  if (repos.length === 0) return new Map();
  const rows = await prisma.starHistoryCache.findMany({
    where: {
      OR: repos.map((r) => ({
        owner: r.owner.login,
        name: r.name,
      })),
    },
  });
  const m = new Map<string, StarHistoryPoint[]>();
  for (const row of rows) {
    const key = `${row.owner}/${row.name}`;
    const raw = row.data as unknown;
    if (Array.isArray(raw)) {
      m.set(key, raw as StarHistoryPoint[]);
    }
  }
  return m;
}

function enrichRepo(
  repo: GitHubRepo,
  history: StarHistoryPoint[] | undefined
): GitHubRepo {
  const scored = scoreRepo(repo, { starHistory: history });
  return {
    ...repo,
    watchScore: scored.watchScore,
    watchLabel: scored.watchLabel,
    watchReasons: scored.watchReasons,
    radarScore: scored.radarScore,
    radarReasons: scored.radarReasons,
  };
}

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

  const query = buildSearchQuery({ language, topics, dateRange, searchQuery });
  const sort = mapSortField(sortBy);

  let token: string | undefined;
  const userId = await getSessionUserId(prisma);
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      token = decrypt(user.accessTokenEnc);
    }
  }

  const cacheKey = `${query}:${sort}:${order}:${page}:${perPage}:${viewMode}`;
  if (!token) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }
  }

  const result = await searchRepositories({
    query,
    sort,
    order,
    page,
    perPage,
    token,
  });

  const historyMap = await loadStarHistoryMap(result.items);
  let repos: GitHubRepo[] = result.items.map((repo) => {
    const key = `${repo.owner.login}/${repo.name}`;
    return enrichRepo(repo, historyMap.get(key));
  });

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
    totalCount: result.total_count,
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
