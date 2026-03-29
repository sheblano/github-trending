import type { GitHubRepo } from '@github-trending/shared/models';

export interface GalaxyDiscoveryNode {
  id: number;
  fullName: string;
  owner: string;
  name: string;
  htmlUrl: string;
  description: string | null;
  language: string | null;
  stargazersCount: number;
  /** 0–1 horizontal: momentum / radar strength */
  x: number;
  /** 0–1 vertical: watch confidence blended with maintainer stability */
  y: number;
  /** 0–1 dot scale */
  sizeNorm: number;
  /** Bucket for color (usually primary language) */
  colorGroup: string;
  watchScore?: number;
  radarScore?: number;
  radarHot: boolean;
  visualReasons: string[];
}

function daysSincePush(pushedAt: string): number {
  return Math.floor(
    (Date.now() - new Date(pushedAt).getTime()) / (1000 * 60 * 60 * 24)
  );
}

function jitter(id: number, salt: number): number {
  const n = ((id * 9301 + 49297 + salt * 7919) % 233280) / 233280;
  return (n - 0.5) * 0.12;
}

/**
 * Deterministic 2D layout for scatter / galaxy view (no embeddings).
 */
export function buildGalaxyNode(repo: GitHubRepo): GalaxyDiscoveryNode {
  const radar = repo.radarScore ?? 45;
  const watch = repo.watchScore ?? 50;
  const days = daysSincePush(repo.pushed_at);
  const stability = Math.max(0, 1 - Math.min(days / 200, 1));
  const yBase = 0.55 * (watch / 100) + 0.45 * stability;

  let x = radar / 100 + jitter(repo.id, 0);
  let y = yBase + jitter(repo.id, 1);
  x = Math.min(0.98, Math.max(0.02, x));
  y = Math.min(0.98, Math.max(0.02, y));

  const stars = repo.stargazers_count;
  const sizeNorm = Math.min(
    1,
    Math.log10(stars + 1) / Math.log10(200_001)
  );

  const colorGroup = repo.language?.trim() || 'Other';
  const radarHot = radar >= 72;

  const reasons = new Set<string>();
  for (const r of repo.radarReasons ?? []) reasons.add(r);
  for (const r of repo.watchReasons ?? []) reasons.add(r);
  const visualReasons = [...reasons].slice(0, 5);

  return {
    id: repo.id,
    fullName: repo.full_name,
    owner: repo.owner.login,
    name: repo.name,
    htmlUrl: repo.html_url,
    description: repo.description,
    language: repo.language,
    stargazersCount: stars,
    x,
    y,
    sizeNorm,
    colorGroup,
    watchScore: repo.watchScore,
    radarScore: repo.radarScore,
    radarHot,
    visualReasons,
  };
}

export function buildGalaxyNodes(repos: GitHubRepo[]): GalaxyDiscoveryNode[] {
  return repos.map(buildGalaxyNode);
}
