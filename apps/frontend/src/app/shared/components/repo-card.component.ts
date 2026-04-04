import {
  Component,
  input,
  output,
  inject,
  AfterViewInit,
  DestroyRef,
  ElementRef,
  signal,
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import type { GitHubRepo, StarHistoryPoint } from '@github-trending/shared/models';
import { formatStarCount, getCommitRecency } from '@github-trending/shared/utils';
import { formatRelativeDate } from '@github-trending/shared/utils';
import { ApiService } from '../../core/api.service';
import { AuthStore } from '../../store/auth.store';
import { SparklineComponent } from './sparkline.component';
import { AnimateCountDirective } from '../directives/animate-count.directive';

@Component({
  selector: 'app-repo-card',
  standalone: true,
  imports: [
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    SparklineComponent,
    AnimateCountDirective,
  ],
  template: `
    <mat-card
      class="repo-card"
      [class.archived]="repo().archived"
      [class.radar-hot]="radarMode() && (repo().radarScore ?? 0) >= 72"
    >
      <mat-card-header>
        <img
          mat-card-avatar
          [src]="repo().owner.avatar_url"
          [alt]="repo().owner.login"
          class="owner-avatar"
        />
        <div class="title-wrap">
          <mat-card-title>
            <a
              [href]="repo().html_url"
              target="_blank"
              rel="noopener"
              class="repo-link"
              (click)="repoOpen.emit()"
            >
              {{ repo().full_name }}
            </a>
          </mat-card-title>
          <mat-card-subtitle class="repo-description">
            {{ repo().description || 'No description' }}
          </mat-card-subtitle>
        </div>
        <span
          class="age-chip"
          [matTooltip]="'Created ' + repo().created_at.split('T')[0]"
        >
          <mat-icon class="age-icon">cake</mat-icon>
          {{ formatDate(repo().created_at) }}
        </span>
      </mat-card-header>

      <mat-card-content>
        <div class="meta-row">
          <div class="signal-group">
            @if (repo().watchScore !== null && repo().watchScore !== undefined) {
              <span
                class="watch-score"
                [matTooltip]="watchReasonsTooltip()"
                [appAnimateCount]="repo().watchScore!"
              ></span>
              <mat-chip
                [class]="'watch-label-chip ' + watchLabelClass()"
                [matTooltip]="watchLabelTooltip()"
              >
                {{ watchLabelDisplay() }}
              </mat-chip>
            }
            @if (radarMode() && repo().radarRank !== null && repo().radarRank !== undefined) {
              <mat-chip class="radar-rank-chip" matTooltip="Radar rank (this page)">
                #{{ repo().radarRank }}
              </mat-chip>
            }
            @if (repo().language) {
              <mat-chip class="lang-chip">{{ repo().language }}</mat-chip>
            }
            @if (authStore.isAuthenticated()) {
              <span class="spark-wrap" matTooltip="Star growth (weekly, sampled)">
                @if (starHistoryLoading()) {
                  <mat-progress-spinner diameter="18" mode="indeterminate" />
                } @else if (starHistory(); as h) {
                  @if (h.length > 1) {
                    <app-sparkline [points]="h" />
                  }
                }
              </span>
            }
          </div>

          <div class="badge-group">
            @if (radarMode() && (repo().radarReasons?.length ?? 0) > 0) {
              <span class="badge badge-radar" [matTooltip]="radarReasonsTooltip()">
                {{ repo().radarReasons![0] }}
              </span>
            }
            <span
              class="badge"
              [class.badge-healthy]="commitRecency() === 'healthy'"
              [class.badge-warning]="commitRecency() === 'warning'"
              [class.badge-stale]="commitRecency() === 'stale'"
              matTooltip="Last commit"
            >
              {{ commitRecency() === 'healthy' ? 'Active' : commitRecency() === 'warning' ? 'Slowing' : 'Stale' }}
            </span>
            @if (repo().license) {
              <span class="badge badge-license" [matTooltip]="repo().license!.spdx_id">
                {{ licenseDisplay() }}
              </span>
            } @else {
              <span class="badge badge-no-license" matTooltip="No license">
                No License
              </span>
            }
            @if (repo().archived) {
              <span class="badge badge-archived">Archived</span>
            }
          </div>
        </div>

        <div class="stats-row">
          <span class="stat stat-primary" matTooltip="Stars">
            <mat-icon class="stat-icon">star</mat-icon>
            <span
              [appAnimateCount]="repo().stargazers_count"
              [appAnimateCountFormat]="formatStars"
            ></span>
          </span>
          <span class="stat" matTooltip="Forks">
            <mat-icon class="stat-icon">call_split</mat-icon>
            <span
              [appAnimateCount]="repo().forks_count"
              [appAnimateCountFormat]="formatStars"
            ></span>
          </span>
          <span class="stat" matTooltip="Open issues">
            <mat-icon class="stat-icon">bug_report</mat-icon>
            <span [appAnimateCount]="repo().open_issues_count"></span>
          </span>
          <span class="stat" matTooltip="Last pushed">
            <mat-icon class="stat-icon">schedule</mat-icon>
            {{ formatDate(repo().pushed_at) }}
          </span>
        </div>

        @if (repo().topics.length > 0) {
          <div class="topics-row">
            @for (topic of visibleTopics(); track topic) {
              <span class="badge badge-topic">{{ topic }}</span>
            }
            @if (hiddenTopicCount() > 0) {
              <span
                class="badge badge-topic badge-topic-muted"
                [matTooltip]="hiddenTopicsTooltip()"
              >
                +{{ hiddenTopicCount() }} more
              </span>
            }
          </div>
        }
      </mat-card-content>

      <mat-card-actions align="end">
        <button
          mat-icon-button
          type="button"
          (click)="explainClick.emit(); $event.stopPropagation()"
          matTooltip="Why this is hot"
          class="preview-btn"
        >
          <mat-icon>insights</mat-icon>
        </button>
        <button
          mat-icon-button
          type="button"
          (click)="previewClick.emit(); $event.stopPropagation()"
          matTooltip="Preview README"
          class="preview-btn"
        >
          <mat-icon>article</mat-icon>
        </button>
        <button
          mat-icon-button
          type="button"
          [color]="isStarred() ? 'accent' : undefined"
          (click)="starToggle.emit()"
          [matTooltip]="isStarred() ? 'Unstar' : 'Star'"
          class="star-btn"
        >
          <mat-icon>{{ isStarred() ? 'star' : 'star_border' }}</mat-icon>
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }

    .repo-card {
      height: 100%;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      margin-bottom: 0;
      overflow: hidden;
      transition:
        box-shadow 0.2s,
        transform 0.2s;
    }

    .repo-card mat-card-content {
      flex: 1 1 auto;
      min-height: 0;
    }

    .repo-card mat-card-header {
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 4px;
      position: relative;
    }

    .repo-card mat-card-actions {
      flex-shrink: 0;
      margin-top: auto;
    }

    .repo-card:hover {
      transform: translateY(-1px);
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.14);
    }

    .repo-card.archived {
      opacity: 0.7;
    }

    .repo-card.radar-hot {
      border: 2px solid #7b1fa2;
      box-shadow: 0 0 0 1px rgba(123, 31, 162, 0.25);
    }

    .title-wrap {
      min-width: 0;
    }

    .repo-description {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
      overflow: hidden;
      line-height: 1.45;
      color: var(--mat-sys-on-surface-variant, rgba(0, 0, 0, 0.65));
    }

    .watch-score {
      font-weight: 700;
      font-size: 12px;
      min-width: 30px;
      text-align: center;
      padding: 4px 8px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--mat-sys-primary, #1976d2) 14%, var(--mat-sys-surface, #fff));
      color: var(--mat-sys-primary, #1565c0);
    }

    .watch-label-chip {
      font-size: 11px;
      min-height: 22px;
      padding: 0 8px;
    }

    .watch-label-strong {
      background-color: color-mix(in srgb, #4caf50 18%, var(--mat-sys-surface, #fff)) !important;
      color: color-mix(in srgb, #1b5e20 90%, var(--mat-sys-on-surface, #000));
    }
    .watch-label-watch {
      background-color: color-mix(in srgb, #2196f3 18%, var(--mat-sys-surface, #fff)) !important;
      color: color-mix(in srgb, #0d47a1 90%, var(--mat-sys-on-surface, #000));
    }
    .watch-label-cooling {
      background-color: color-mix(in srgb, #ff9800 18%, var(--mat-sys-surface, #fff)) !important;
      color: color-mix(in srgb, #e65100 90%, var(--mat-sys-on-surface, #000));
    }
    .watch-label-risky {
      background-color: color-mix(in srgb, #f44336 18%, var(--mat-sys-surface, #fff)) !important;
      color: color-mix(in srgb, #b71c1c 90%, var(--mat-sys-on-surface, #000));
    }

    .radar-rank-chip {
      font-size: 11px;
      min-height: 24px;
      font-weight: 600;
      background: color-mix(in srgb, #9c27b0 18%, var(--mat-sys-surface, #fff)) !important;
      color: color-mix(in srgb, #6a1b9a 90%, var(--mat-sys-on-surface, #000));
    }

    .radar-reason-chip {
      font-size: 11px;
      min-height: 24px;
      max-width: 200px;
      background: color-mix(in srgb, #7c4dff 14%, var(--mat-sys-surface, #fff)) !important;
      color: color-mix(in srgb, #4527a0 90%, var(--mat-sys-on-surface, #000));
    }

    .owner-avatar {
      border-radius: 50%;
      margin: 4px 0 0 4px;
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--mat-sys-primary, #1976d2) 8%, transparent);
      flex-shrink: 0;
    }

    .repo-link {
      color: inherit;
      text-decoration: none;
      font-weight: 500;
    }

    .repo-link:hover {
      text-decoration: underline;
    }

    .meta-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 10px;
    }

    .signal-group {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      min-height: 28px;
    }

    .badge-group {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 5px;
      margin-left: auto;
      flex-shrink: 0;
    }

    .stats-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-top: 6px;
      padding-bottom: 4px;
      margin-left: auto;
      justify-content: flex-end;
    }

    .topics-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      margin-top: 8px;
      padding-bottom: 8px;
    }

    .spark-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 64px;
      min-height: 22px;
      margin-left: auto;
    }

    .stat {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant, rgba(0, 0, 0, 0.6));
    }

    .stat-primary {
      font-weight: 600;
      color: var(--mat-sys-on-surface, rgba(0, 0, 0, 0.87));
    }

    .stat-icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
    }

    .lang-chip {
      font-size: 11px;
      min-height: 22px;
      padding: 0 8px;
    }

    /* Lightweight inline badges for the secondary row */
    .badge {
      display: inline-flex;
      align-items: center;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.03em;
      line-height: 1;
      padding: 3px 7px;
      border-radius: 4px;
      border: 1px solid transparent;
      white-space: nowrap;
    }

    .badge-healthy {
      background: color-mix(in srgb, #4caf50 10%, transparent);
      color: color-mix(in srgb, #2e7d32 90%, var(--mat-sys-on-surface, #000));
      border-color: color-mix(in srgb, #4caf50 25%, transparent);
    }
    .badge-warning {
      background: color-mix(in srgb, #ff9800 10%, transparent);
      color: color-mix(in srgb, #e65100 90%, var(--mat-sys-on-surface, #000));
      border-color: color-mix(in srgb, #ff9800 25%, transparent);
    }
    .badge-stale {
      background: color-mix(in srgb, #f44336 10%, transparent);
      color: color-mix(in srgb, #c62828 90%, var(--mat-sys-on-surface, #000));
      border-color: color-mix(in srgb, #f44336 25%, transparent);
    }
    .badge-license {
      background: color-mix(in srgb, var(--mat-sys-on-surface, #000) 5%, transparent);
      color: var(--mat-sys-on-surface-variant, rgba(0, 0, 0, 0.6));
      border-color: color-mix(in srgb, var(--mat-sys-on-surface, #000) 12%, transparent);
    }
    .badge-no-license {
      background: color-mix(in srgb, #ff9800 10%, transparent);
      color: color-mix(in srgb, #e65100 90%, var(--mat-sys-on-surface, #000));
      border-color: color-mix(in srgb, #ff9800 25%, transparent);
    }
    .badge-archived {
      background: color-mix(in srgb, #f44336 10%, transparent);
      color: color-mix(in srgb, #c62828 90%, var(--mat-sys-on-surface, #000));
      border-color: color-mix(in srgb, #f44336 25%, transparent);
    }
    .badge-radar {
      background: color-mix(in srgb, #7c4dff 8%, transparent);
      color: color-mix(in srgb, #4527a0 90%, var(--mat-sys-on-surface, #000));
      border-color: color-mix(in srgb, #7c4dff 20%, transparent);
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .badge-topic {
      background: color-mix(in srgb, #2196f3 8%, transparent);
      color: color-mix(in srgb, #1565c0 85%, var(--mat-sys-on-surface, #000));
      border-color: color-mix(in srgb, #2196f3 18%, transparent);
    }
    .badge-topic-muted {
      background: color-mix(in srgb, var(--mat-sys-on-surface, #000) 4%, transparent);
      color: var(--mat-sys-on-surface-variant, rgba(0, 0, 0, 0.55));
      border-color: color-mix(in srgb, var(--mat-sys-on-surface, #000) 10%, transparent);
    }

    .age-chip {
      position: absolute;
      top: 0;
      right: 0;
      display: inline-flex;
      align-items: center;
      font-size: 9px;
      font-weight: 500;
      padding: 2px 6px;
      border-radius: 4px;
      background: color-mix(in srgb, var(--mat-sys-tertiary, #795548) 10%, var(--mat-sys-surface, #fff));
      color: var(--mat-sys-on-surface-variant, rgba(0, 0, 0, 0.55));
      letter-spacing: 0.02em;
      line-height: 1;
      white-space: nowrap;
    }

    .age-icon {
      font-size: 11px;
      width: 11px;
      height: 11px;
      margin-right: 2px;
    }

    .repo-card mat-card-actions {
      border-top: 1px solid var(--mat-sys-outline-variant, rgba(0, 0, 0, 0.08));
      padding-top: 6px;
    }

    .star-btn,
    .preview-btn {
      min-width: 40px;
      min-height: 40px;
    }
  `,
})
export class RepoCardComponent implements AfterViewInit {
  repo = input.required<GitHubRepo>();
  isStarred = input(false);
  /** Emphasize radar rank and reasons when trending is in radar view. */
  radarMode = input(false);
  repoOpen = output<void>();
  starToggle = output<void>();
  explainClick = output<void>();
  previewClick = output<void>();

  authStore = inject(AuthStore);
  private api = inject(ApiService);
  private el = inject(ElementRef);
  private destroyRef = inject(DestroyRef);

  starHistory = signal<StarHistoryPoint[] | null>(null);
  starHistoryLoading = signal(false);

  formatStars = formatStarCount;
  formatDate = formatRelativeDate;

  commitRecency() {
    return getCommitRecency(this.repo().pushed_at);
  }

  watchReasonsTooltip(): string {
    const r = this.repo().watchReasons;
    return r?.length ? r.join(' · ') : 'Watchlist confidence';
  }

  radarReasonsTooltip(): string {
    const r = this.repo().radarReasons;
    return r?.length ? r.join(' · ') : 'Radar signals';
  }

  watchLabelClass(): string {
    const l = this.repo().watchLabel;
    if (!l) return '';
    return `watch-label-${l}`;
  }

  watchLabelDisplay(): string {
    const l = this.repo().watchLabel;
    if (!l) return '';
    const map: Record<string, string> = {
      strong: 'Strong',
      watch: 'Watch',
      cooling: 'Cooling',
      risky: 'Risky',
    };
    return map[l] ?? l;
  }

  watchLabelTooltip(): string {
    const l = this.repo().watchLabel;
    const score = this.repo().watchScore;
    const reasons = this.watchReasonsTooltip();

    switch (l) {
      case 'strong':
        return `Strong: healthy watchlist candidate with good maintenance and signal${
          score != null ? ` (score ${score})` : ''
        }. ${reasons}`;
      case 'watch':
        return `Watch: promising, but still worth monitoring before relying on it${
          score != null ? ` (score ${score})` : ''
        }. ${reasons}`;
      case 'cooling':
        return `Cooling: mixed or weakening signals; double-check maintenance and momentum${
          score != null ? ` (score ${score})` : ''
        }. ${reasons}`;
      case 'risky':
        return `Risky: weaker signals or elevated risk such as stale activity, archive status, license, or issue load${
          score != null ? ` (score ${score})` : ''
        }. ${reasons}`;
      default:
        return reasons;
    }
  }

  licenseDisplay(): string {
    const id = this.repo().license?.spdx_id;
    if (!id || id === 'NOASSERTION') return 'Custom';
    return id;
  }

  visibleTopics(): string[] {
    return this.repo().topics.slice(0, 2);
  }

  hiddenTopicCount(): number {
    return Math.max(0, this.repo().topics.length - 2);
  }

  hiddenTopicsTooltip(): string {
    return this.repo().topics.slice(2).join(', ');
  }

  ngAfterViewInit() {
    const host = this.el.nativeElement as HTMLElement;
    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        obs.disconnect();
        if (!this.authStore.isAuthenticated()) {
          return;
        }
        const r = this.repo();
        this.starHistoryLoading.set(true);
        this.api.getStarHistory(r.owner.login, r.name).subscribe({
          next: (res) => {
            this.starHistory.set(res.history ?? []);
            this.starHistoryLoading.set(false);
          },
          error: () => {
            this.starHistory.set([]);
            this.starHistoryLoading.set(false);
          },
        });
      },
      { root: null, rootMargin: '120px', threshold: 0.01 }
    );
    obs.observe(host);
    this.destroyRef.onDestroy(() => obs.disconnect());
  }
}
