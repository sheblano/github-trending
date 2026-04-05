import type { GalaxyDiscoveryNodeDto } from '@github-trending/shared/models';

const LANG_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Rust: '#dea584',
  Go: '#00ADD8',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  Scala: '#c22d40',
  Shell: '#89e051',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  Zig: '#ec915c',
  Elixir: '#6e4a7e',
  Haskell: '#5e5086',
  Lua: '#000080',
  R: '#276DC3',
  Julia: '#a270ba',
  Nix: '#7e7eff',
  Other: '#8b9467',
};

const OVERFLOW_PALETTE = [
  '#e91e63', '#ff5722', '#00bcd4', '#8bc34a', '#9c27b0',
  '#ff9800', '#4caf50', '#2196f3', '#cddc39', '#795548',
];

export function colorForGroup(group: string): string {
  const direct = LANG_COLORS[group];
  if (direct) return direct;
  let h = 0;
  for (let i = 0; i < group.length; i++) {
    h = (h * 31 + group.charCodeAt(i)) >>> 0;
  }
  return OVERFLOW_PALETTE[h % OVERFLOW_PALETTE.length] ?? '#8b9467';
}

const NORMALIZE_PAD = 0.06;

export function normalizeNodes(
  nodes: GalaxyDiscoveryNodeDto[]
): GalaxyDiscoveryNodeDto[] {
  if (nodes.length < 2) return nodes;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const n of nodes) {
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.y > maxY) maxY = n.y;
  }
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  return nodes.map((n) => ({
    ...n,
    x: NORMALIZE_PAD + ((n.x - minX) / rangeX) * (1 - 2 * NORMALIZE_PAD),
    y: NORMALIZE_PAD + ((n.y - minY) / rangeY) * (1 - 2 * NORMALIZE_PAD),
  }));
}

export function nodeRadius(n: GalaxyDiscoveryNodeDto): number {
  return 0.9 + n.sizeNorm * 3.4;
}

export function buildLegend(
  nodes: GalaxyDiscoveryNodeDto[]
): { lang: string; color: string }[] {
  const seen = new Map<string, string>();
  for (const n of nodes) {
    const g = n.colorGroup || 'Other';
    if (!seen.has(g)) seen.set(g, colorForGroup(g));
  }
  return [...seen.entries()].map(([lang, color]) => ({ lang, color }));
}
