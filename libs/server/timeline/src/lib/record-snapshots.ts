import type { PrismaClient } from '@prisma/client';
import type { GitHubRepo } from '@github-trending/shared/models';

let lastSnapshotRunAt = 0;

/** Test helper */
export function resetTrendingSnapshotThrottle(): void {
  lastSnapshotRunAt = 0;
}

/**
 * Throttled writes: one batch per interval while trending is fetched.
 * Compares to the latest snapshot per repo to emit star_spike / entered_radar
 * events.
 *
 * Performance: fetches all previous snapshots in a single query, then
 * writes all new snapshots and events in parallel batches.
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

  // Fetch the latest snapshot for every repo in a single query by using a
  // raw GROUP BY on githubRepoId to get the max capturedAt per repo,
  // then join back to get the full row.
  const repoIds = active.map((r) => r.id);

  // Prisma doesn't support GROUP BY with max directly, so we use a two-step
  // approach: fetch all snapshots for these repos ordered by capturedAt desc,
  // then keep only the first occurrence of each repoId (the latest).
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

  // Build a map: repoId -> latest snapshot (first entry per id after desc sort)
  const prevMap = new Map<
    number,
    { starsCount: number; radarScore: number | null; capturedAt: Date }
  >();
  for (const row of allPrev) {
    if (!prevMap.has(row.githubRepoId)) {
      prevMap.set(row.githubRepoId, row);
    }
  }

  // Derive events and collect new snapshot rows.
  const eventCreates: Parameters<typeof prisma.timelineEvent.create>[0]['data'][] = [];
  const snapshotCreates: Parameters<typeof prisma.repoSnapshot.create>[0]['data'][] = [];

  for (const r of active) {
    const prev = prevMap.get(r.id);
    const radarScore = r.radarScore ?? null;
    const pushedAt = r.pushed_at ? new Date(r.pushed_at) : null;

    if (prev) {
      const daysSince = (now - prev.capturedAt.getTime()) / (1000 * 60 * 60 * 24);
      const starDelta = r.stargazers_count - prev.starsCount;
      const base = Math.max(prev.starsCount, 1);

      if (daysSince < 14 && starDelta >= 50 && starDelta / base >= 0.05) {
        eventCreates.push({
          githubRepoId: r.id,
          owner: r.owner.login,
          name: r.name,
          fullName: r.full_name,
          eventType: 'star_spike',
          title: `Star spike: ${r.full_name}`,
          description: `+${starDelta} stars since last snapshot`,
          url: r.html_url,
          eventAt: new Date(),
          meta: { starDelta, prevStars: prev.starsCount, stars: r.stargazers_count },
        });
      }

      if (radarScore != null && radarScore >= 75 && (prev.radarScore ?? 0) < 60) {
        eventCreates.push({
          githubRepoId: r.id,
          owner: r.owner.login,
          name: r.name,
          fullName: r.full_name,
          eventType: 'entered_radar',
          title: `Entered radar: ${r.full_name}`,
          description: 'Strong combined momentum and health signals',
          url: r.html_url,
          eventAt: new Date(),
          meta: { radarScore },
        });
      }
    }

    snapshotCreates.push({
      githubRepoId: r.id,
      owner: r.owner.login,
      name: r.name,
      fullName: r.full_name,
      starsCount: r.stargazers_count,
      forksCount: r.forks_count,
      openIssues: r.open_issues_count,
      radarScore,
      pushedAt,
    });
  }

  // Write all snapshots and events in parallel.
  await Promise.all([
    prisma.repoSnapshot.createMany({ data: snapshotCreates }),
    ...eventCreates.map((data) => prisma.timelineEvent.create({ data })),
  ]);
}
