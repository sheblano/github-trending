import type { GitHubRepo, StarHistoryPoint } from '@github-trending/shared/models';

export type WatchLabel = 'strong' | 'watch' | 'cooling' | 'risky';

export interface RepoScoreResult {
  watchScore: number;
  watchLabel: WatchLabel;
  watchReasons: string[];
  /** Combined ranking signal for radar mode (0–100). */
  radarScore: number;
  radarReasons: string[];
}

function daysSincePush(pushedAt: string): number {
  const t = new Date(pushedAt).getTime();
  return Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24));
}

function logStarBonus(stars: number): number {
  if (stars <= 0) return 0;
  return Math.min(22, Math.round((Math.log10(stars + 1) / Math.log10(500001)) * 22));
}

function momentumFromHistory(history: StarHistoryPoint[] | undefined): {
  score: number;
  reasons: string[];
} {
  if (!history || history.length < 2) {
    return { score: 6, reasons: [] };
  }
  const first = history[0]!.stars;
  const last = history[history.length - 1]!.stars;
  const delta = last - first;
  const reasons: string[] = [];
  let score = 8;
  if (delta > 0) {
    const ratio = last > 0 ? delta / Math.max(last, 1) : 0;
    score = Math.min(18, 8 + Math.round(ratio * 40));
    if (delta >= 500) reasons.push('Strong star growth (sampled)');
    else if (delta >= 100) reasons.push('Notable star growth');
  } else if (delta < 0) {
    score = 4;
    reasons.push('Star growth flat or down in sample');
  }
  return { score, reasons };
}

/**
 * Non-AI watchlist confidence + radar ranking from public repo fields and optional star history.
 */
export function scoreRepo(
  repo: GitHubRepo,
  options?: { starHistory?: StarHistoryPoint[] }
): RepoScoreResult {
  const reasons: string[] = [];
  const radarReasons: string[] = [];

  if (repo.archived) {
    return {
      watchScore: 18,
      watchLabel: 'risky',
      watchReasons: ['Repository is archived'],
      radarScore: 12,
      radarReasons: ['Archived'],
    };
  }

  const days = daysSincePush(repo.pushed_at);
  let activity = 28;
  if (days <= 7) {
    activity = 30;
    reasons.push('Very recent activity');
    radarReasons.push('Recently pushed');
  } else if (days <= 30) {
    activity = 26;
    reasons.push('Active maintenance');
  } else if (days <= 90) {
    activity = 18;
    reasons.push('Moderate activity');
  } else if (days <= 180) {
    activity = 12;
    reasons.push('Slowing activity');
  } else {
    activity = 6;
    reasons.push('Stale: long time since last push');
  }

  let licensePts = 10;
  if (!repo.license?.spdx_id || repo.license.spdx_id === 'NOASSERTION') {
    licensePts = 4;
    reasons.push('No clear SPDX license');
  }

  const starPts = logStarBonus(repo.stargazers_count);
  if (repo.stargazers_count >= 10000) radarReasons.push('High star count');
  else if (repo.stargazers_count >= 1000) radarReasons.push('Popular repo');

  const forksPts = Math.min(8, Math.round(Math.log10(repo.forks_count + 1) * 3));

  let issuePts = 10;
  const issues = repo.open_issues_count;
  const stars = Math.max(repo.stargazers_count, 1);
  if (issues > stars * 0.5 && issues > 50) {
    issuePts = 4;
    reasons.push('High open issue load vs stars');
  } else if (issues > 200) {
    issuePts = 6;
    reasons.push('Many open issues');
  }

  const { score: momScore, reasons: momReasons } = momentumFromHistory(
    options?.starHistory
  );
  reasons.push(...momReasons);
  radarReasons.push(...momReasons);

  const watchScore = Math.max(
    0,
    Math.min(100, activity + licensePts + starPts + forksPts + issuePts + momScore)
  );

  let watchLabel: WatchLabel;
  if (watchScore >= 76) {
    watchLabel = 'strong';
    if (!reasons.some((r) => r.includes('Strong'))) reasons.unshift('Strong watchlist signals');
  } else if (watchScore >= 52) {
    watchLabel = 'watch';
  } else if (watchScore >= 36) {
    watchLabel = 'cooling';
    reasons.unshift('Mixed signals, verify before depending on it');
  } else {
    watchLabel = 'risky';
    reasons.unshift('Weak signals or elevated risk');
  }

  const radarScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        watchScore * 0.45 +
          momScore * 3.2 +
          (days <= 14 ? 18 : days <= 60 ? 10 : 4) +
          Math.min(20, starPts) +
          (repo.topics.length >= 3 ? 4 : 0)
      )
    )
  );

  if (days <= 14) radarReasons.push('Fresh commits');

  return {
    watchScore,
    watchLabel,
    watchReasons: reasons.slice(0, 6),
    radarScore,
    radarReasons: radarReasons.slice(0, 5),
  };
}
