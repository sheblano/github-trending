import type { PrismaClient } from '@prisma/client';
import type { GitHubRepo } from '@github-trending/shared/models';
import { TIMELINE_EVENT_TYPES } from '@github-trending/shared/models';

type EventCreateData =
  Parameters<PrismaClient['timelineEvent']['create']>[0]['data'];
type SnapshotCreateData =
  Parameters<PrismaClient['repoSnapshot']['create']>[0]['data'];

interface PrevSnapshot {
  starsCount: number;
  radarScore: number | null;
  capturedAt: Date;
}

let lastSnapshotRunAt = 0;

/** Test helper */
export function resetTrendingSnapshotThrottle(): void {
  lastSnapshotRunAt = 0;
}

async function fetchLatestSnapshots(
  prisma: PrismaClient,
  repoIds: number[]
): Promise<Map<number, PrevSnapshot>> {
  const allPrev = await prisma.repoSnapshot.findMany({
    where: { githubRepoId: { in: repoIds } },
    orderBy: { capturedAt: 'desc' },
    select: {
      githubRepoId: true,
      starsCount: true,
      radarScore: true,
      capturedAt: true,
    },
  });

  const prevMap = new Map<number, PrevSnapshot>();
  for (const row of allPrev) {
    if (!prevMap.has(row.githubRepoId)) {
      prevMap.set(row.githubRepoId, row);
    }
  }
  return prevMap;
}

function detectStarSpike(
  repo: GitHubRepo,
  prev: PrevSnapshot,
  now: number
): EventCreateData | null {
  const daysSince =
    (now - prev.capturedAt.getTime()) / (1000 * 60 * 60 * 24);
  const starDelta = repo.stargazers_count - prev.starsCount;
  const base = Math.max(prev.starsCount, 1);

  if (daysSince >= 14 || starDelta < 50 || starDelta / base < 0.05) {
    return null;
  }

  return {
    githubRepoId: repo.id,
    owner: repo.owner.login,
    name: repo.name,
    fullName: repo.full_name,
    eventType: TIMELINE_EVENT_TYPES.STAR_SPIKE,
    title: `Star spike: ${repo.full_name}`,
    description: `+${starDelta} stars since last snapshot`,
    url: repo.html_url,
    eventAt: new Date(),
    meta: {
      starDelta,
      prevStars: prev.starsCount,
      stars: repo.stargazers_count,
    },
  };
}

function detectEnteredRadar(
  repo: GitHubRepo,
  prev: PrevSnapshot,
  radarScore: number | null
): EventCreateData | null {
  if (
    radarScore == null ||
    radarScore < 75 ||
    (prev.radarScore ?? 0) >= 60
  ) {
    return null;
  }

  return {
    githubRepoId: repo.id,
    owner: repo.owner.login,
    name: repo.name,
    fullName: repo.full_name,
    eventType: TIMELINE_EVENT_TYPES.ENTERED_RADAR,
    title: `Entered radar: ${repo.full_name}`,
    description: 'Strong combined momentum and health signals',
    url: repo.html_url,
    eventAt: new Date(),
    meta: { radarScore },
  };
}

function buildSnapshotRow(repo: GitHubRepo): SnapshotCreateData {
  return {
    githubRepoId: repo.id,
    owner: repo.owner.login,
    name: repo.name,
    fullName: repo.full_name,
    starsCount: repo.stargazers_count,
    forksCount: repo.forks_count,
    openIssues: repo.open_issues_count,
    radarScore: repo.radarScore ?? null,
    pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
  };
}

/**
 * Throttled writes: one batch per interval while trending is fetched.
 * Compares to the latest snapshot per repo to emit star_spike / entered_radar
 * events.
 */
export async function recordTrendingSnapshotsIfDue(
  prisma: PrismaClient,
  repos: GitHubRepo[],
  intervalMs = 60 * 60 * 1000
): Promise<void> {
  const now = Date.now();
  if (now - lastSnapshotRunAt < intervalMs) return;
  lastSnapshotRunAt = now;

  const active = repos.filter((r) => !r.archived);
  if (active.length === 0) return;

  const prevMap = await fetchLatestSnapshots(
    prisma,
    active.map((r) => r.id)
  );

  const eventCreates: EventCreateData[] = [];
  const snapshotCreates: SnapshotCreateData[] = [];

  for (const r of active) {
    const prev = prevMap.get(r.id);
    if (prev) {
      const spike = detectStarSpike(r, prev, now);
      if (spike) eventCreates.push(spike);

      const radar = detectEnteredRadar(r, prev, r.radarScore ?? null);
      if (radar) eventCreates.push(radar);
    }
    snapshotCreates.push(buildSnapshotRow(r));
  }

  await Promise.all([
    prisma.repoSnapshot.createMany({ data: snapshotCreates }),
    ...eventCreates.map((data) => prisma.timelineEvent.create({ data })),
  ]);
}
