import type { PrismaClient } from '@prisma/client';
import {
  TIMELINE_EVENT_TYPES,
  type TopMoversResponse,
  type TimelineEventDto,
  type HotSnapshotDto,
} from '@github-trending/shared/models';

interface RawTimelineEvent {
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
}

function toEventDto(e: RawTimelineEvent): TimelineEventDto {
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

const HOT_RADAR_THRESHOLD = 55;
const HOT_MAX_RESULTS = 14;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function buildHotNow(
  snapshots: {
    githubRepoId: number;
    fullName: string;
    owner: string;
    name: string;
    starsCount: number;
    radarScore: number | null;
    capturedAt: Date;
    pushedAt: Date | null;
  }[]
): HotSnapshotDto[] {
  const seen = new Set<number>();
  const results: HotSnapshotDto[] = [];

  for (const s of snapshots) {
    if (seen.has(s.githubRepoId)) continue;
    seen.add(s.githubRepoId);

    if (s.radarScore == null || s.radarScore < HOT_RADAR_THRESHOLD) continue;

    const whyHot = [
      `Radar score ${s.radarScore}`,
      'Recent high-signal snapshot',
    ];
    if (s.pushedAt) {
      const ageDays = Math.floor(
        (Date.now() - s.pushedAt.getTime()) / MS_PER_DAY
      );
      if (ageDays <= 7) whyHot.push('Recently pushed');
    }
    if (s.starsCount >= 1000) whyHot.push('Meaningful star base');

    results.push({
      githubRepoId: s.githubRepoId,
      fullName: s.fullName,
      owner: s.owner,
      name: s.name,
      starsCount: s.starsCount,
      radarScore: s.radarScore,
      capturedAt: s.capturedAt.toISOString(),
      whyHot,
    });
    if (results.length >= HOT_MAX_RESULTS) break;
  }
  return results;
}

/**
 * Dashboard sections derived from timeline events and recent snapshots.
 */
export async function aggregateTopMovers(
  prisma: PrismaClient
): Promise<TopMoversResponse> {
  const [starSpikes, enteredRadar, releasePublished, recentSnapshots] =
    await Promise.all([
      prisma.timelineEvent.findMany({
        where: { eventType: TIMELINE_EVENT_TYPES.STAR_SPIKE },
        orderBy: { eventAt: 'desc' },
        take: 18,
      }),
      prisma.timelineEvent.findMany({
        where: { eventType: TIMELINE_EVENT_TYPES.ENTERED_RADAR },
        orderBy: { eventAt: 'desc' },
        take: 18,
      }),
      prisma.timelineEvent.findMany({
        where: { eventType: TIMELINE_EVENT_TYPES.RELEASE_PUBLISHED },
        orderBy: { eventAt: 'desc' },
        take: 18,
      }),
      prisma.repoSnapshot.findMany({
        orderBy: { capturedAt: 'desc' },
        take: 200,
      }),
    ]);

  return {
    starSpikes: starSpikes.map(toEventDto),
    enteredRadar: enteredRadar.map(toEventDto),
    releasePublished: releasePublished.map(toEventDto),
    hotNow: buildHotNow(recentSnapshots),
  };
}
