import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  signal,
  ElementRef,
  viewChild,
  AfterViewInit,
  DestroyRef,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { StarredStore } from '../../store/starred.store';
import { TrendingStore } from '../../store/trending.store';
import { formatRelativeDate, formatStarCount } from '@github-trending/shared/utils';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-starred',
  standalone: true,
  imports: [
    FormsModule,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    MatTooltipModule,
    MatBadgeModule,
  ],
  template: `
    @if (store.loading() || store.releasesLoading()) {
      <mat-progress-bar mode="indeterminate"></mat-progress-bar>
    }

    <mat-tab-group
      [selectedIndex]="selectedTab()"
      (selectedIndexChange)="onTabChange($event)"
    >
      <!-- ── Starred Repos tab ───────────────────────────────── -->
      <mat-tab label="Starred Repos">
        <div class="tab-content">
          @if (store.starredRepos().length === 0 && !store.loading()) {
            <div class="empty-state">
              <mat-icon class="empty-icon">star_border</mat-icon>
              <p>No starred repos yet. Star some repos from the Trending page!</p>
            </div>
          }

          @for (repo of store.starredRepos(); track repo.id) {
            <mat-card class="starred-card">
              <mat-card-header>
                <mat-card-title>
                  <a [href]="repo.url" target="_blank" rel="noopener" class="repo-link">
                    {{ repo.fullName }}
                  </a>
                </mat-card-title>
                <mat-card-subtitle>
                  {{ repo.description || 'No description' }}
                </mat-card-subtitle>
              </mat-card-header>

              <mat-card-content>
                <div class="meta-row">
                  @if (repo.language) {
                    <mat-chip>{{ repo.language }}</mat-chip>
                  }
                  <span class="stat">
                    <mat-icon class="stat-icon">star</mat-icon>
                    {{ formatStars(repo.starsCount) }}
                  </span>
                  <span class="stat">
                    <mat-icon class="stat-icon">calendar_today</mat-icon>
                    Followed {{ formatDate(repo.followedAt) }}
                  </span>
                </div>

                <mat-form-field appearance="outline" class="notes-field">
                  <mat-label>Personal notes</mat-label>
                  <textarea
                    matInput
                    [ngModel]="repo.notes || ''"
                    (blur)="saveNotes(repo.id, $event)"
                    placeholder="Why did you star this? What to try..."
                    rows="2"
                  ></textarea>
                </mat-form-field>
              </mat-card-content>

              <mat-card-actions align="end">
                <button mat-button color="warn" (click)="unstar(repo.owner, repo.name)">
                  <mat-icon>star</mat-icon>
                  Unstar
                </button>
              </mat-card-actions>
            </mat-card>
          }

          <!-- Sentinel: triggers loadMoreStarred when visible -->
          <div #starredSentinel class="scroll-sentinel">
            @if (store.loadingMore()) {
              <mat-progress-spinner diameter="32" mode="indeterminate" />
            } @else if (!store.starredHasMore() && store.starredRepos().length > 0) {
              <span class="end-label">All {{ store.starredRepos().length }} repos loaded</span>
            }
          </div>
        </div>
      </mat-tab>

      <!-- ── Release Notes tab ───────────────────────────────── -->
      <mat-tab>
        <ng-template mat-tab-label>
          Release Notes
          @if (unseenCount() > 0) {
            <span class="unseen-badge">{{ unseenCount() }}</span>
          }
        </ng-template>
        <div class="tab-content">
          @if (store.releaseFeeds().length === 0 && !store.releasesLoading()) {
            <div class="empty-state">
              <mat-icon class="empty-icon">new_releases</mat-icon>
              <p>No release notes yet. Star some repos to track their releases.</p>
            </div>
          }

          <mat-accordion multi>
            @for (feed of store.releaseFeeds(); track feed.repoFullName) {
              <mat-expansion-panel [expanded]="!isMobile() || feed.hasUnseen">
                <mat-expansion-panel-header>
                  <mat-panel-title>
                    {{ feed.repoFullName }}
                    @if (feed.hasUnseen) {
                      <mat-icon class="unseen-dot" matTooltip="New releases">fiber_new</mat-icon>
                    }
                  </mat-panel-title>
                  <mat-panel-description>
                    {{ feed.releases.length }} release(s)
                  </mat-panel-description>
                </mat-expansion-panel-header>

                @for (release of feed.releases; track release.tagName) {
                  <mat-card class="release-card">
                    <mat-card-header>
                      <mat-card-title>
                        <a [href]="release.htmlUrl" target="_blank" rel="noopener" class="repo-link">
                          {{ release.name || release.tagName }}
                        </a>
                      </mat-card-title>
                      <mat-card-subtitle>
                        {{ release.tagName }}
                        @if (release.publishedAt) {
                          &middot; {{ formatDate(release.publishedAt) }}
                        }
                      </mat-card-subtitle>
                    </mat-card-header>
                    @if (release.body) {
                      <mat-card-content>
                        <div class="release-body" [innerHTML]="sanitizeMarkdown(release.body)"></div>
                      </mat-card-content>
                    }
                  </mat-card>
                }
              </mat-expansion-panel>
            }
          </mat-accordion>

          <!-- Sentinel: triggers loadMoreReleases when visible -->
          <div #releasesSentinel class="scroll-sentinel">
            @if (store.releasesLoadingMore()) {
              <mat-progress-spinner diameter="32" mode="indeterminate" />
            } @else if (!store.releasesHasMore() && store.releaseFeeds().length > 0) {
              <span class="end-label">All {{ store.releaseFeeds().length }} repos shown</span>
            }
          </div>
        </div>
      </mat-tab>
    </mat-tab-group>
  `,
  styles: `
    .tab-content {
      padding: 16px 0;
    }

    .starred-card,
    .release-card {
      margin-bottom: 12px;
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
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }

    .stat {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant, rgba(0,0,0,0.6));
    }

    .stat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .notes-field {
      width: 100%;
    }

    .empty-state {
      text-align: center;
      padding: 48px 16px;
      color: var(--mat-sys-on-surface-variant, rgba(0,0,0,0.5));
    }

    .empty-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      opacity: 0.4;
    }

    .unseen-badge {
      background: #f44336;
      color: white;
      border-radius: 10px;
      padding: 2px 8px;
      font-size: 11px;
      margin-left: 8px;
    }

    .unseen-dot {
      color: #f44336;
      font-size: 18px;
      margin-left: 8px;
    }

    .release-body {
      max-height: 300px;
      overflow-y: auto;
      font-size: 14px;
      line-height: 1.6;
      padding: 8px 0;
    }

    .release-body pre {
      background: var(--mat-sys-surface-container, rgba(0, 0, 0, 0.05));
      padding: 12px;
      border-radius: 4px;
      overflow-x: auto;
    }

    .release-body code {
      font-family: monospace;
      font-size: 13px;
    }

    .scroll-sentinel {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 48px;
      padding: 16px 0;
    }

    .end-label {
      font-size: 13px;
      opacity: 0.5;
    }
  `,
})
export class StarredComponent implements OnInit, AfterViewInit, OnDestroy {
  store = inject(StarredStore);
  private trendingStore = inject(TrendingStore);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  isMobile = signal(false);
  selectedTab = signal(0);

  formatStars = formatStarCount;
  formatDate = formatRelativeDate;

  starredSentinel = viewChild<ElementRef<HTMLDivElement>>('starredSentinel');
  releasesSentinel = viewChild<ElementRef<HTMLDivElement>>('releasesSentinel');

  private observers: IntersectionObserver[] = [];

  constructor() {
    const bp = inject(BreakpointObserver);
    bp.observe([Breakpoints.Handset])
      .pipe(takeUntilDestroyed())
      .subscribe((r) => {
        this.isMobile.set(r.matches);
      });
  }

  ngOnInit() {
    this.store.loadStarred();
    this.route.queryParams
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((q) => {
        if (q['tab'] === 'releases') {
          this.selectedTab.set(1);
          this.store.loadReleases();
        }
      });
  }

  ngAfterViewInit() {
    this.attachSentinel(
      this.starredSentinel()?.nativeElement,
      () => this.store.loadMoreStarred()
    );
    this.attachSentinel(
      this.releasesSentinel()?.nativeElement,
      () => this.store.loadMoreReleases()
    );
  }

  ngOnDestroy() {
    this.observers.forEach((o) => o.disconnect());
  }

  private attachSentinel(el: HTMLElement | undefined, onVisible: () => void) {
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onVisible();
      },
      { rootMargin: '120px' }
    );
    obs.observe(el);
    this.observers.push(obs);
  }

  onTabChange(index: number) {
    this.selectedTab.set(index);
    if (index === 1 && this.store.releasesPage() === 0) {
      this.store.loadReleases();
    }
  }

  unseenCount() {
    return this.store.releaseFeeds().filter((f) => f.hasUnseen).length;
  }

  saveNotes(repoId: number, event: Event) {
    const value = (event.target as HTMLTextAreaElement).value;
    this.store.updateNotes(repoId, value || null);
  }

  unstar(owner: string, name: string) {
    this.store.unstar(owner, name);
    const repo = this.store
      .starredRepos()
      .find((r) => r.owner === owner && r.name === name);
    if (repo) {
      this.trendingStore.markUnstarred(repo.githubRepoId);
    }
  }

  sanitizeMarkdown(body: string): string {
    return body
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  }
}
