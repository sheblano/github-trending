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
        <mat-card-title>
          <a [href]="repo().html_url" target="_blank" rel="noopener" class="repo-link">
            {{ repo().full_name }}
          </a>
        </mat-card-title>
        <mat-card-subtitle>
          {{ repo().description || 'No description' }}
        </mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>
        <div class="meta-row">
          @if (repo().watchScore != null) {
            <span class="watch-score" [matTooltip]="watchReasonsTooltip()">
              {{ repo().watchScore }}
            </span>
            <mat-chip [class]="'watch-label-chip ' + watchLabelClass()">
              {{ watchLabelDisplay() }}
            </mat-chip>
          }
          @if (radarMode() && repo().radarRank != null) {
            <mat-chip class="radar-rank-chip" matTooltip="Radar rank (this page)">
              #{{ repo().radarRank }}
            </mat-chip>
          }
          @if (repo().language) {
            <mat-chip class="lang-chip">{{ repo().language }}</mat-chip>
          }

          <span class="stat" matTooltip="Stars">
            <mat-icon class="stat-icon">star</mat-icon>
            {{ formatStars(repo().stargazers_count) }}
          </span>

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

          <span class="stat" matTooltip="Forks">
            <mat-icon class="stat-icon">call_split</mat-icon>
            {{ repo().forks_count }}
          </span>

          <span class="stat" matTooltip="Last pushed">
            <mat-icon class="stat-icon">schedule</mat-icon>
            {{ formatDate(repo().pushed_at) }}
          </span>
        </div>

        <div class="health-row">
          @if (radarMode() && (repo().radarReasons?.length ?? 0) > 0) {
            <mat-chip class="radar-reason-chip" [matTooltip]="radarReasonsTooltip()">
              {{ repo().radarReasons![0] }}
            </mat-chip>
          }
          <mat-chip
            [class]="'health-' + commitRecency()"
            class="health-chip"
            matTooltip="Last commit"
          >
            {{ commitRecency() === 'healthy' ? 'Active' : commitRecency() === 'warning' ? 'Slowing' : 'Stale' }}
          </mat-chip>

          <span class="stat" matTooltip="Open issues">
            <mat-icon class="stat-icon">bug_report</mat-icon>
            {{ repo().open_issues_count }}
          </span>

          @if (repo().license) {
            <mat-chip class="license-chip" matTooltip="License">
              {{ repo().license!.spdx_id }}
            </mat-chip>
          } @else {
            <mat-chip class="no-license-chip" matTooltip="No license">
              No License
            </mat-chip>
          }

          @if (repo().archived) {
            <mat-chip class="archived-chip">Archived</mat-chip>
          }
        </div>

        @if (repo().topics.length > 0) {
          <div class="topics-row">
            @for (topic of repo().topics.slice(0, 5); track topic) {
              <mat-chip class="topic-chip">{{ topic }}</mat-chip>
            }
          </div>
        }
      </mat-card-content>

      <mat-card-actions align="end">
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
    .repo-card {
      margin-bottom: 12px;
      transition: box-shadow 0.2s;
    }

    .repo-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .repo-card.archived {
      opacity: 0.7;
    }

    .repo-card.radar-hot {
      border: 2px solid #7b1fa2;
      box-shadow: 0 0 0 1px rgba(123, 31, 162, 0.25);
    }

    .watch-score {
      font-weight: 700;
      font-size: 13px;
      min-width: 28px;
      text-align: center;
      padding: 2px 8px;
      border-radius: 6px;
      background: color-mix(in srgb, var(--mat-sys-primary, #1976d2) 14%, var(--mat-sys-surface, #fff));
      color: var(--mat-sys-primary, #1565c0);
    }

    .watch-label-chip {
      font-size: 11px;
      min-height: 24px;
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
    }

    .repo-link {
      color: inherit;
      text-decoration: none;
      font-weight: 500;
    }

    .repo-link:hover {
      text-decoration: underline;
    }

    .meta-row,
    .health-row,
    .topics-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
    }

    .spark-wrap {
      display: inline-flex;
      align-items: center;
      min-width: 72px;
      min-height: 22px;
    }

    .stat {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant, rgba(0, 0, 0, 0.6));
    }

    .stat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .health-chip,
    .lang-chip,
    .license-chip,
    .no-license-chip,
    .archived-chip,
    .topic-chip {
      font-size: 11px;
      min-height: 24px;
      padding: 0 8px;
    }

    .health-healthy {
      background-color: color-mix(in srgb, #4caf50 18%, var(--mat-sys-surface, #fff)) !important;
      color: color-mix(in srgb, #2e7d32 90%, var(--mat-sys-on-surface, #000));
    }
    .health-warning {
      background-color: color-mix(in srgb, #ff9800 18%, var(--mat-sys-surface, #fff)) !important;
      color: color-mix(in srgb, #e65100 90%, var(--mat-sys-on-surface, #000));
    }
    .health-stale {
      background-color: color-mix(in srgb, #f44336 18%, var(--mat-sys-surface, #fff)) !important;
      color: color-mix(in srgb, #c62828 90%, var(--mat-sys-on-surface, #000));
    }

    .no-license-chip {
      background-color: color-mix(in srgb, #ff9800 18%, var(--mat-sys-surface, #fff)) !important;
      color: color-mix(in srgb, #e65100 90%, var(--mat-sys-on-surface, #000));
    }

    .archived-chip {
      background-color: color-mix(in srgb, #f44336 18%, var(--mat-sys-surface, #fff)) !important;
      color: color-mix(in srgb, #c62828 90%, var(--mat-sys-on-surface, #000));
    }

    .topic-chip {
      background-color: color-mix(in srgb, #2196f3 14%, var(--mat-sys-surface, #fff)) !important;
      color: color-mix(in srgb, #1565c0 90%, var(--mat-sys-on-surface, #000));
    }

    .star-btn,
    .preview-btn {
      min-width: 48px;
      min-height: 48px;
    }
  `,
})
export class RepoCardComponent implements AfterViewInit {
  repo = input.required<GitHubRepo>();
  isStarred = input(false);
  /** Emphasize radar rank and reasons when trending is in radar view. */
  radarMode = input(false);
  starToggle = output<void>();
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
