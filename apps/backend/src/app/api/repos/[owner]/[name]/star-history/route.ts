import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../../../../lib/prisma';
import { getSessionUserId, decrypt } from '@github-trending/server/auth';
import {
  getRepoPublicInfo,
  getStargazersPage,
} from '@github-trending/server/github-client';
import type { StarHistoryPoint } from '@github-trending/shared/models';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const PER_PAGE = 100;
const MAX_PAGES = 10;

function floorToWeek(ts: number): number {
  return Math.floor(ts / WEEK_MS) * WEEK_MS;
}

function buildHistory(
  timestamps: number[],
  totalStars: number
): StarHistoryPoint[] {
  if (timestamps.length === 0 || totalStars === 0) {
    return [];
  }
  timestamps.sort((a, b) => a - b);
  const start = floorToWeek(timestamps[0]);
  const end = Date.now();
  const maxSample = timestamps.filter((t) => t <= end).length;
  if (maxSample === 0) {
    return [];
  }

  const points: StarHistoryPoint[] = [];
  for (let w = start; w <= end; w += WEEK_MS) {
    const cum = timestamps.filter((t) => t <= w).length;
    const stars = Math.max(0, Math.round((cum / maxSample) * totalStars));
    points.push({
      date: new Date(w).toISOString().slice(0, 10),
      stars,
    });
  }
  const last = points[points.length - 1];
  if (last && last.stars !== totalStars) {
    last.stars = totalStars;
  }
  return points;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ owner: string; name: string }> }
) {
  const { owner, name } = await params;

  const userId = await getSessionUserId(prisma);
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 });
  }
  const token = decrypt(user.accessTokenEnc);

  const cached = await prisma.starHistoryCache.findUnique({
    where: {
      owner_name: { owner, name },
    },
  });
  if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
    return NextResponse.json({
      owner,
      name,
      history: cached.data as unknown as StarHistoryPoint[],
    });
  }

  try {
    const info = await getRepoPublicInfo(owner, name, token);
    const totalStars = info.stargazers_count;
    if (totalStars === 0) {
      const empty: StarHistoryPoint[] = [];
      await prisma.starHistoryCache.upsert({
        where: { owner_name: { owner, name } },
        create: {
          owner,
          name,
          data: empty as unknown as Prisma.InputJsonValue,
        },
        update: {
          data: empty as unknown as Prisma.InputJsonValue,
          fetchedAt: new Date(),
        },
      });
      return NextResponse.json({ owner, name, history: empty });
    }

    const totalPages = Math.max(1, Math.ceil(totalStars / PER_PAGE));
    let pages: number[];
    if (totalPages <= MAX_PAGES) {
      pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      const set = new Set<number>([1, totalPages]);
      for (let i = 0; i < 8; i++) {
        const p = 1 + Math.round((i / 7) * (totalPages - 1));
        set.add(Math.min(totalPages, Math.max(1, p)));
      }
      pages = [...set].sort((a, b) => a - b);
    }

    const timestamps: number[] = [];
    for (const p of pages) {
      const rows = await getStargazersPage(owner, name, p, PER_PAGE, token);
      for (const row of rows) {
        timestamps.push(new Date(row.starred_at).getTime());
      }
    }

    const history = buildHistory(timestamps, totalStars);

    await prisma.starHistoryCache.upsert({
      where: { owner_name: { owner, name } },
      create: {
        owner,
        name,
        data: history as unknown as Prisma.InputJsonValue,
      },
      update: {
        data: history as unknown as Prisma.InputJsonValue,
        fetchedAt: new Date(),
      },
    });

    return NextResponse.json({ owner, name, history });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load star history';
    return NextResponse.json({ owner, name, history: [], message }, { status: 502 });
  }
}
