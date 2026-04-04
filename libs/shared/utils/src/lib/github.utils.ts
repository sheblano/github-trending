import { DateRange, RepoSortField, HealthStatus, TopicMatchMode } from '@github-trending/shared/models';
import { getDateThreshold } from './date.utils';

export function buildSearchQuery(params: {
  language?: string | null;
  topics?: string[];
  topicMatchMode?: TopicMatchMode;
  dateRange?: DateRange;
  searchQuery?: string;
}): string {
  const parts: string[] = [];

  if (params.searchQuery) {
    parts.push(params.searchQuery);
  }

  if (params.language) {
    parts.push(`language:${params.language}`);
  }

  if (params.topics?.length) {
    const mode = params.topicMatchMode ?? 'and';
    if (mode === 'or' && params.topics.length > 1) {
      const topicParts = params.topics.map((t) => `topic:${t}`);
      parts.push(topicParts.join(' OR '));
    } else {
      for (const topic of params.topics) {
        parts.push(`topic:${topic}`);
      }
    }
  }

  if (params.dateRange) {
    const threshold = getDateThreshold(params.dateRange);
    parts.push(`created:>${threshold}`);
  }

  return parts.length > 0 ? parts.join(' ') : 'stars:>1';
}

export function mapSortField(field: RepoSortField): string {
  switch (field) {
    case 'stars':
      return 'stars';
    case 'forks':
      return 'forks';
    case 'updated':
      return 'updated';
  }
}

export function getCommitRecency(pushedAt: string): HealthStatus {
  const days = daysSinceDate(pushedAt);
  if (days < 30) return 'healthy';
  if (days < 180) return 'warning';
  return 'stale';
}

function daysSinceDate(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatStarCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}
