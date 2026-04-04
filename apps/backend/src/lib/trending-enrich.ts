import type { PrismaClient } from '@prisma/client';
import { scoreRepo } from '@github-trending/server/repo-scoring';
import { searchRepositories } from '@github-trending/server/github-client';
import { buildSearchQuery, mapSortField } from '@github-trending/shared/utils';
import type {
  DateRange,
  GitHubRepo,
  RepoSortField,
  SortOrder,
  StarHistoryPoint,
  TopicMatchMode,
} from '@github-trending/shared/models';

export async function loadStarHistoryMap(
  prisma: PrismaClient,
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

export function enrichRepo(
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

export interface FetchTrendingParams {
  prisma: PrismaClient;
  language: string | null;
  topics: string[];
  topicMatchMode?: TopicMatchMode;
  dateRange: DateRange;
  searchQuery: string;
  sortBy: RepoSortField;
  order: SortOrder;
  page: number;
  perPage: number;
  token?: string;
}

export async function fetchEnrichedRepos(
  p: FetchTrendingParams
): Promise<{ repos: GitHubRepo[]; totalCount: number }> {
  const query = buildSearchQuery({
    language: p.language,
    topics: p.topics,
    topicMatchMode: p.topicMatchMode,
    dateRange: p.dateRange,
    searchQuery: p.searchQuery,
  });
  const sort = mapSortField(p.sortBy);
  const result = await searchRepositories({
    query,
    sort,
    order: p.order,
    page: p.page,
    perPage: p.perPage,
    token: p.token,
  });
  const historyMap = await loadStarHistoryMap(p.prisma, result.items);
  const repos = result.items.map((repo) => {
    const key = `${repo.owner.login}/${repo.name}`;
    return enrichRepo(repo, historyMap.get(key));
  });
  return { repos, totalCount: result.total_count };
}
