import type { PrismaClient } from '@prisma/client';
import type { GitHubRepo } from '@github-trending/shared/models';

let lastSnapshotRunAt = 0;

/** Test helper */
export function resetTrendingSnapshotThrottle(): void {
  lastSnapshotRunAt = 0;
}

/**
 * Throttled writes: one batch per interval while trending is fetched.
 * Compares to latest snapshot per repo to emit star_spike / entered_radar events.
 */
export async function recordTrendingSnapshotsIfDue(
  prisma: PrismaClient,
  repos: GitHubRepo[],
  intervalMs = 60 * 60 * 1000
): Promise<void> {
  const now = Date.now();
  if (now - lastSnapshotRunAt < intervalMs) return;
  lastSnapshotRunAt = now;

  for (const r of repos) {
    if (r.archived) continue;

    const pushedAt = r.pushed_at ? new Date(r.pushed_at) : null;
    const radarScore = r.radarScore ?? null;

    const prev = await prisma.repoSnapshot.findFirst({
      where: { githubRepoId: r.id },
      orderBy: { capturedAt: 'desc' },
    });

    if (prev) {
      const daysSince =
        (now - prev.capturedAt.getTime()) / (1000 * 60 * 60 * 24);
      const starDelta = r.stargazers_count - prev.starsCount;
      const base = Math.max(prev.starsCount, 1);
      if (
        daysSince < 14 &&
        starDelta >= 50 &&
        starDelta / base >= 0.05
      ) {
        await prisma.timelineEvent.create({
          data: {
            githubRepoId: r.id,
            owner: r.owner.login,
            name: r.name,
            fullName: r.full_name,
            eventType: 'star_spike',
            title: `Star spike: ${r.full_name}`,
            description: `+${starDelta} stars since last snapshot`,
            url: r.html_url,
            eventAt: new Date(),
            meta: {
              starDelta,
              prevStars: prev.starsCount,
              stars: r.stargazers_count,
            },
          },
        });
      }

      if (
        radarScore != null &&
        radarScore >= 75 &&
        (prev.radarScore ?? 0) < 60
      ) {
        await prisma.timelineEvent.create({
          data: {
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
          },
        });
      }
    }

    await prisma.repoSnapshot.create({
      data: {
        githubRepoId: r.id,
        owner: r.owner.login,
        name: r.name,
        fullName: r.full_name,
        starsCount: r.stargazers_count,
        forksCount: r.forks_count,
        openIssues: r.open_issues_count,
        radarScore,
        pushedAt,
      },
    });
  }
}
