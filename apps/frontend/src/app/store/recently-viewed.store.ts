import { Injectable, computed, signal } from '@angular/core';
import type { GitHubRepo } from '@github-trending/shared/models';

const STORAGE_KEY = 'github-trending-recently-viewed';
const MAX_ITEMS = 8;

export interface RecentlyViewedRepo {
  id: number;
  fullName: string;
  owner: string;
  name: string;
  htmlUrl: string;
  description: string | null;
  language: string | null;
  stargazersCount: number;
  watchScore?: number;
  watchLabel?: GitHubRepo['watchLabel'];
  watchReasons?: string[];
  radarScore?: number;
  radarReasons?: string[];
  viewedAt: string;
}

function readInitial(): RecentlyViewedRepo[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

@Injectable({ providedIn: 'root' })
export class RecentlyViewedStore {
  readonly items = signal<RecentlyViewedRepo[]>(readInitial());
  readonly hasItems = computed(() => this.items().length > 0);

  private persist(items: RecentlyViewedRepo[]): void {
    this.items.set(items);
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore storage failures
    }
  }

  trackRepo(repo: GitHubRepo): void {
    const entry: RecentlyViewedRepo = {
      id: repo.id,
      fullName: repo.full_name,
      owner: repo.owner.login,
      name: repo.name,
      htmlUrl: repo.html_url,
      description: repo.description,
      language: repo.language,
      stargazersCount: repo.stargazers_count,
      watchScore: repo.watchScore,
      watchLabel: repo.watchLabel,
      watchReasons: repo.watchReasons,
      radarScore: repo.radarScore,
      radarReasons: repo.radarReasons,
      viewedAt: new Date().toISOString(),
    };
    const next = [
      entry,
      ...this.items().filter((item) => item.id !== entry.id),
    ].slice(0, MAX_ITEMS);
    this.persist(next);
  }

  clear(): void {
    this.persist([]);
  }
}
