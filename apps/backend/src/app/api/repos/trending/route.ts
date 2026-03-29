import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { searchRepositories } from '@github-trending/server/github-client';
import { getSessionUserId, decrypt } from '@github-trending/server/auth';
import { buildSearchQuery, mapSortField } from '@github-trending/shared/utils';
import type { DateRange, RepoSortField, SortOrder } from '@github-trending/shared/models';

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

  const query = buildSearchQuery({ language, topics, dateRange, searchQuery });
  const sort = mapSortField(sortBy);

  // Try to use authenticated token for better rate limits
  let token: string | undefined;
  const userId = await getSessionUserId(prisma);
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      token = decrypt(user.accessTokenEnc);
    }
  }

  // Cache for unauthenticated requests
  const cacheKey = `${query}:${sort}:${order}:${page}:${perPage}`;
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

  const response = {
    repos: result.items,
    totalCount: result.total_count,
    page,
    perPage,
  };

  if (!token) {
    cache.set(cacheKey, { data: response, timestamp: Date.now() });
  }

  return NextResponse.json(response);
}
