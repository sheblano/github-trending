export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  pushed_at: string;
  created_at: string;
  updated_at: string;
  topics: string[];
  license: {
    spdx_id: string;
    name: string;
  } | null;
  archived: boolean;
  /** Watchlist confidence (from trending/radar scoring). */
  watchScore?: number;
  watchLabel?: 'strong' | 'watch' | 'cooling' | 'risky';
  watchReasons?: string[];
  /** Radar ranking signal (0–100). */
  radarScore?: number;
  radarRank?: number;
  radarReasons?: string[];
}

export interface RepoSearchResult {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubRepo[];
}

export interface RepoFilters {
  language: string | null;
  topics: string[];
  dateRange: DateRange;
  searchQuery: string;
  sortBy: RepoSortField;
  order: SortOrder;
  page: number;
  perPage: number;
}

export type DateRange = 'daily' | 'weekly' | 'monthly';
export type RepoSortField = 'stars' | 'forks' | 'updated';
export type SortOrder = 'asc' | 'desc';

export type HealthStatus = 'healthy' | 'warning' | 'stale';

export interface RepoHealthMetrics {
  commitRecency: HealthStatus;
  daysSinceLastPush: number;
  openIssuesCount: number;
  license: string | null;
  archived: boolean;
}
