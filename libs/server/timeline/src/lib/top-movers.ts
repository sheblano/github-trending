import type { PrismaClient } from '@prisma/client';

function toEventRow(e: {
  id: number;
  githubRepoId: number;
  owner: string;
  name: string;
  fullName: string;
  eventType: string;
  title: string;
  description: string | null;
  url: string | null;
  eventAt: Date;
  meta: unknown;
}) {
  return {
    id: e.id,
    githubRepoId: e.githubRepoId,
    owner: e.owner,
    name: e.name,
    fullName: e.fullName,
    eventType: e.eventType,
    title: e.title,
    description: e.description,
    url: e.url,
    eventAt: e.eventAt.toISOString(),
    meta: e.meta as Record<string, unknown> | null,
  };
}

/**
 * Dashboard sections derived from timeline events and recent snapshots.
 */
export async function aggregateTopMovers(prisma: PrismaClient) {
  const [starSpikes, enteredRadar, releasePublished, recentSnapshots] =
    await Promise.all([
      prisma.timelineEvent.findMany({
        where: { eventType: 'star_spike' },
        orderBy: { eventAt: 'desc' },
        take: 18,
      }),
      prisma.timelineEvent.findMany({
        where: { eventType: 'entered_radar' },
        orderBy: { eventAt: 'desc' },
        take: 18,
      }),
      prisma.timelineEvent.findMany({
        where: { eventType: 'release_published' },
        orderBy: { eventAt: 'desc' },
        take: 18,
      }),
      prisma.repoSnapshot.findMany({
        orderBy: { capturedAt: 'desc' },
        take: 200,
      }),
    ]);

  const seen = new Set<number>();
  const hotNow: Array<{
    githubRepoId: number;
    fullName: string;
    owner: string;
    name: string;
    starsCount: number;
    radarScore: number | null;
    capturedAt: string;
  }> = [];

  for (const s of recentSnapshots) {
    if (seen.has(s.githubRepoId)) continue;
    seen.add(s.githubRepoId);
    if (s.radarScore != null && s.radarScore >= 55) {
      hotNow.push({
        githubRepoId: s.githubRepoId,
        fullName: s.fullName,
        owner: s.owner,
        name: s.name,
        starsCount: s.starsCount,
        radarScore: s.radarScore,
        capturedAt: s.capturedAt.toISOString(),
      });
      if (hotNow.length >= 14) break;
    }
  }

  return {
    starSpikes: starSpikes.map(toEventRow),
    enteredRadar: enteredRadar.map(toEventRow),
    releasePublished: releasePublished.map(toEventRow),
    hotNow,
  };
}
