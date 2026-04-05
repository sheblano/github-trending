import type { GitHubRepo, StarHistoryPoint } from '@github-trending/shared/models';

export type WatchLabel = 'strong' | 'watch' | 'cooling' | 'risky';

export interface RepoScoreResult {
  watchScore: number;
  watchLabel: WatchLabel;
  watchReasons: string[];
  /** Combined ranking signal for radar mode (0-100). */
  radarScore: number;
  radarReasons: string[];
}

interface FactorResult {
  points: number;
  reasons: string[];
  radarReasons: string[];
}

function daysSincePush(pushedAt: string): number {
  const t = new Date(pushedAt).getTime();
  return Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24));
}

function logStarBonus(stars: number): number {
  if (stars <= 0) return 0;
  return Math.min(
    22,
    Math.round((Math.log10(stars + 1) / Math.log10(500001)) * 22)
  );
}

function activityFactor(days: number): FactorResult {
  if (days <= 7) {
    return {
      points: 30,
      reasons: ['Very recent activity'],
      radarReasons: ['Recently pushed'],
    };
  }
  if (days <= 30) {
    return { points: 26, reasons: ['Active maintenance'], radarReasons: [] };
  }
  if (days <= 90) {
    return { points: 18, reasons: ['Moderate activity'], radarReasons: [] };
  }
  if (days <= 180) {
    return { points: 12, reasons: ['Slowing activity'], radarReasons: [] };
  }
  return {
    points: 6,
    reasons: ['Stale: long time since last push'],
    radarReasons: [],
  };
}

function licenseFactor(repo: GitHubRepo): FactorResult {
  if (!repo.license?.spdx_id || repo.license.spdx_id === 'NOASSERTION') {
    return {
      points: 4,
      reasons: ['No clear SPDX license'],
      radarReasons: [],
    };
  }
  return { points: 10, reasons: [], radarReasons: [] };
}

function starFactor(stars: number): FactorResult {
  const points = logStarBonus(stars);
  const radarReasons: string[] = [];
  if (stars >= 10000) radarReasons.push('High star count');
  else if (stars >= 1000) radarReasons.push('Popular repo');
  return { points, reasons: [], radarReasons };
}

function issueFactor(issues: number, stars: number): FactorResult {
  const base = Math.max(stars, 1);
  if (issues > base * 0.5 && issues > 50) {
    return {
      points: 4,
      reasons: ['High open issue load vs stars'],
      radarReasons: [],
    };
  }
  if (issues > 200) {
    return { points: 6, reasons: ['Many open issues'], radarReasons: [] };
  }
  return { points: 10, reasons: [], radarReasons: [] };
}

function momentumFactor(
  history: StarHistoryPoint[] | undefined
): FactorResult {
  if (!history || history.length < 2) {
    return { points: 6, reasons: [], radarReasons: [] };
  }
  const first = history[0]!.stars;
  const last = history[history.length - 1]!.stars;
  const delta = last - first;
  if (delta > 0) {
    const ratio = last > 0 ? delta / Math.max(last, 1) : 0;
    const points = Math.min(18, 8 + Math.round(ratio * 40));
    const r =
      delta >= 500
        ? 'Strong star growth (sampled)'
        : delta >= 100
          ? 'Notable star growth'
          : '';
    const reasons = r ? [r] : [];
    return { points, reasons, radarReasons: [...reasons] };
  }
  if (delta < 0) {
    const msg = 'Star growth flat or down in sample';
    return { points: 4, reasons: [msg], radarReasons: [msg] };
  }
  return { points: 8, reasons: [], radarReasons: [] };
}

function labelFromScore(score: number): WatchLabel {
  if (score >= 76) return 'strong';
  if (score >= 52) return 'watch';
  if (score >= 36) return 'cooling';
  return 'risky';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Non-AI watchlist confidence + radar ranking from public repo fields
 * and optional star history.
 */
export function scoreRepo(
  repo: GitHubRepo,
  options?: { starHistory?: StarHistoryPoint[] }
): RepoScoreResult {
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
  const factors = [
    activityFactor(days),
    licenseFactor(repo),
    starFactor(repo.stargazers_count),
    { points: Math.min(8, Math.round(Math.log10(repo.forks_count + 1) * 3)), reasons: [] as string[], radarReasons: [] as string[] },
    issueFactor(repo.open_issues_count, repo.stargazers_count),
    momentumFactor(options?.starHistory),
  ];

  const reasons: string[] = [];
  const radarReasons: string[] = [];
  let total = 0;
  for (const f of factors) {
    total += f.points;
    reasons.push(...f.reasons);
    radarReasons.push(...f.radarReasons);
  }

  const watchScore = clamp(total, 0, 100);
  const watchLabel = labelFromScore(watchScore);

  if (watchLabel === 'strong') {
    if (!reasons.some((r) => r.includes('Strong'))) {
      reasons.unshift('Strong watchlist signals');
    }
  } else if (watchLabel === 'cooling') {
    reasons.unshift('Mixed signals, verify before depending on it');
  } else if (watchLabel === 'risky') {
    reasons.unshift('Weak signals or elevated risk');
  }

  const momScore = factors[factors.length - 1]!.points;
  const starPts = factors[2]!.points;
  const radarScore = clamp(
    Math.round(
      watchScore * 0.45 +
        momScore * 3.2 +
        (days <= 14 ? 18 : days <= 60 ? 10 : 4) +
        Math.min(20, starPts) +
        (repo.topics.length >= 3 ? 4 : 0)
    ),
    0,
    100
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
