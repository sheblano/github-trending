import type { DateRange, RepoSortField, SortOrder } from './repo.model';
import { GitHubRepo } from './repo.model';
import { Release } from './release.model';

export interface TrendingFiltersSnapshot {
  language: string | null;
  topics: string[];
  dateRange: DateRange;
  sortBy: RepoSortField;
  order: SortOrder;
}

export interface TrendingFilterPresetDto {
  id: number;
  name: string;
  filters: TrendingFiltersSnapshot;
}

export interface DigestResponse {
  newReleaseCount: number;
  trendingInYourLangs: Array<{
    id: number;
    fullName: string;
    description: string | null;
    language: string | null;
    stars: number;
    url: string;
  }>;
  hasUnseen: boolean;
}

export interface TrendingResponse {
  repos: GitHubRepo[];
  totalCount: number;
  page: number;
  perPage: number;
}

export interface FollowedRepoDto {
  id: number;
  githubRepoId: number;
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  starsCount: number;
  url: string;
  followedAt: string;
  lastSeenReleaseAt: string | null;
  notes: string | null;
}

export interface StarRequest {
  repoId: number;
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  starsCount: number;
  url: string;
}

export interface NotesUpdateRequest {
  notes: string | null;
}

export interface ReleaseFeedResponse {
  feeds: Array<{
    repoFullName: string;
    repoOwner: string;
    repoName: string;
    releases: Release[];
    hasUnseen: boolean;
  }>;
}

export interface StarHistoryPoint {
  date: string;
  stars: number;
}

export interface StarHistoryResponse {
  owner: string;
  name: string;
  history: StarHistoryPoint[];
}

export interface ApiError {
  message: string;
  statusCode: number;
}
