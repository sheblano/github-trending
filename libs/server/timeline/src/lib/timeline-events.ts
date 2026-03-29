import type { PrismaClient } from '@prisma/client';

export interface TimelineQuery {
  repo?: string;
  eventType?: string;
  since?: Date;
  limit?: number;
}

/**
 * Load persisted timeline events with optional filters (full name `owner/name` for repo).
 */
export async function listTimelineEvents(
  prisma: PrismaClient,
  q: TimelineQuery
) {
  const limit = Math.min(Math.max(q.limit ?? 100, 1), 200);
  const where: {
    fullName?: string;
    eventType?: string;
    eventAt?: { gte: Date };
  } = {};

  if (q.repo?.trim()) {
    where.fullName = q.repo.trim();
  }
  if (q.eventType?.trim()) {
    where.eventType = q.eventType.trim();
  }
  if (q.since) {
    where.eventAt = { gte: q.since };
  }

  return prisma.timelineEvent.findMany({
    where,
    orderBy: { eventAt: 'desc' },
    take: limit,
  });
}
