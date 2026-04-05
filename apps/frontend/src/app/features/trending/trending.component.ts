import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  AfterViewInit,
  signal,
  effect,
  ElementRef,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { EMPTY, Subject } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
} from 'rxjs/operators';
import { TrendingStore } from '../../store/trending.store';
import { AuthStore } from '../../store/auth.store';
import { ApiService } from '../../core/api.service';
import { RepoCardComponent } from '../../shared/components/repo-card.component';
import { ReadmeDrawerComponent } from '../../shared/components/readme-drawer.component';
import { SavePresetDialogComponent } from '../../shared/components/save-preset-dialog.component';
import { openInsightsDialog } from '../../shared/helpers/insights-dialog.helper';
import { PresetsStore } from '../../store/presets.store';
import {
  RecentlyViewedStore,
  type RecentlyViewedRepo,
} from '../../store/recently-viewed.store';
import { LANGUAGES } from '@github-trending/shared/utils';
import { TOPICS } from '@github-trending/shared/utils';
import type {
  DateRange,
  RepoSortField,
  SortOrder,
  GitHubRepo,
  TrendingFilterPresetDto,
  TrendingViewMode,
  TopicMatchMode,
} from '@github-trending/shared/models';

@Component({
  selector: 'app-trending',
  standalone: true,
  imports: [
    FormsModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatSelectModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    RepoCardComponent,
    ReadmeDrawerComponent,
  ],
  template: `
    <app-readme-drawer #readmeDrawer />
    @if (store.loading()) {
      <mat-progress-bar mode="indeterminate"></mat-progress-bar>
    }

    <div class="filters-section">
      <mat-form-field appearance="outline" class="search-field">
        <mat-label>Search repositories</mat-label>
        <input
          matInput
          [ngModel]="searchValue"
          (ngModelChange)="onSearchChange($event)"
          placeholder="e.g. machine learning, cli tool..."
        />
        <mat-icon matPrefix>search</mat-icon>
      </mat-form-field>

      <div class="preset-row chip-row" [class.scrollable]="isMobile()">
        <span class="filter-label">Presets:</span>
        <div class="preset-chips">
          @for (p of presetsStore.presets(); track p.id) {
            <span class="preset-wrap">
              <mat-chip (click)="applyPreset(p)">{{ p.name }}</mat-chip>
              <button
                mat-icon-button
                type="button"
                class="preset-remove"
                (click)="removePreset($event, p)"
                matTooltip="Remove preset"
              >
                <mat-icon>close</mat-icon>
              </button>
            </span>
          }
        </div>
        <button
          mat-stroked-button
          type="button"
          (click)="openSavePresetDialog()"
          matTooltip="Save current filters as a preset"
        >
          <mat-icon>bookmark_add</mat-icon>
          Save current
        </button>
      </div>

      <div class="chip-row" [class.scrollable]="isMobile()">
        <span class="filter-label">Language:</span>
        <mat-chip-set>
          <mat-chip
            [highlighted]="store.language() === null"
            (click)="selectLanguage(null)"
          >
            All
          </mat-chip>
          @for (lang of languages; track lang.value) {
            <mat-chip
              [highlighted]="store.language() === lang.value"
              (click)="selectLanguage(lang.value)"
            >
              {{ lang.label }}
            </mat-chip>
          }
        </mat-chip-set>
      </div>

      <div class="chip-row" [class.scrollable]="isMobile()">
        <span class="filter-label">Topics:</span>
        <mat-chip-set>
          @for (topic of topics; track topic.value) {
            <mat-chip
              [highlighted]="store.topics().includes(topic.value)"
              (click)="toggleTopic(topic.value)"
            >
              {{ topic.label }}
            </mat-chip>
          }
        </mat-chip-set>
        @if (store.topics().length > 1) {
          <mat-button-toggle-group
            class="topic-match-toggle"
            [value]="store.topicMatchMode()"
            (change)="setTopicMatchMode($event.value)"
          >
            <mat-button-toggle value="or">Any</mat-button-toggle>
            <mat-button-toggle value="and">All</mat-button-toggle>
          </mat-button-toggle-group>
        }
      </div>

      <div class="controls-row">
        <mat-button-toggle-group
          [value]="store.dateRange()"
          (change)="setDateRange($event.value)"
        >
          <mat-button-toggle value="daily">Today</mat-button-toggle>
          <mat-button-toggle value="weekly">This Week</mat-button-toggle>
          <mat-button-toggle value="monthly">This Month</mat-button-toggle>
        </mat-button-toggle-group>

        @if (isMobile()) {
          <mat-form-field appearance="outline" class="sort-select">
            <mat-label>Sort</mat-label>
            <mat-select [value]="store.sortBy()" (selectionChange)="setSortBy($event.value)">
              <mat-option value="stars">Stars</mat-option>
              <mat-option value="forks">Forks</mat-option>
              <mat-option value="updated">Updated</mat-option>
            </mat-select>
          </mat-form-field>
        } @else {
          <mat-button-toggle-group
            [value]="store.sortBy()"
            (change)="setSortBy($event.value)"
          >
            <mat-button-toggle value="stars">Stars</mat-button-toggle>
            <mat-button-toggle value="forks">Forks</mat-button-toggle>
            <mat-button-toggle value="updated">Updated</mat-button-toggle>
          </mat-button-toggle-group>
        }

        <button
          mat-icon-button
          (click)="toggleOrder()"
          [matTooltip]="store.order() === 'desc' ? 'Descending' : 'Ascending'"
        >
          <mat-icon>
            {{ store.order() === 'desc' ? 'arrow_downward' : 'arrow_upward' }}
          </mat-icon>
        </button>

        <mat-button-toggle-group
          [value]="store.viewMode()"
          (change)="setViewMode($event.value)"
          matTooltip="Default uses GitHub sort; Radar ranks by momentum and health signals"
        >
          <mat-button-toggle value="default">Default</mat-button-toggle>
          <mat-button-toggle value="radar">Radar</mat-button-toggle>
        </mat-button-toggle-group>
      </div>
    </div>

    @if (recentStore.hasItems()) {
      <section class="recent-section">
        <div class="recent-header">
          <div>
            <h3>Recently viewed</h3>
            <p>Quickly jump back into repos you were evaluating.</p>
          </div>
          <button mat-button type="button" (click)="recentStore.clear()">
            Clear
          </button>
        </div>
        <div class="recent-grid">
          @for (item of recentStore.items(); track item.id) {
            <button
              type="button"
              class="recent-card"
              (click)="showInsightsForRecent(item)"
            >
              <span class="recent-name">{{ item.fullName }}</span>
              <span class="recent-meta">
                @if (item.language) {
                  {{ item.language }} ·
                }
                ★ {{ formatStars(item.stargazersCount) }}
              </span>
            </button>
          }
        </div>
      </section>
    }

    <div class="trending-scroll" #scrollRoot>
      <div class="repo-grid" [class.mobile]="isMobile()">
        @for (repo of store.repos(); track repo.id) {
          <app-repo-card
            [repo]="repo"
            [isStarred]="store.starredRepoIds().has(repo.id)"
            [radarMode]="store.viewMode() === 'radar'"
            (repoOpen)="trackViewed(repo)"
            (starToggle)="toggleStar(repo)"
            (explainClick)="showInsightsForRepo(repo)"
            (previewClick)="openReadme(readmeDrawer, repo)"
          />
        }
      </div>

      @if (!store.loading() && store.repos().length === 0) {
        <div class="empty-state">
          <mat-icon class="empty-icon">search_off</mat-icon>
          <p>No repositories found. Try adjusting your filters.</p>
        </div>
      }

      @if (store.hasMore()) {
        <div class="sentinel" #loadMoreSentinel aria-hidden="true"></div>
      }

      @if (store.loadingMore()) {
        <div class="load-more-spinner">
          <mat-progress-spinner mode="indeterminate" diameter="36" />
        </div>
      }
    </div>
  `,
  styles: `
    .filters-section {
      margin-bottom: 16px;
    }

    .search-field {
      width: 100%;
    }

    .preset-row {
      flex-wrap: wrap;
      align-items: center;
    }

    .preset-chips {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
      flex: 1;
      min-width: 0;
    }

    .preset-wrap {
      display: inline-flex;
      align-items: center;
    }

    .preset-remove {
      width: 32px;
      height: 32px;
      margin-left: -4px;
    }

    .chip-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }

    .topic-match-toggle {
      flex-shrink: 0;
      margin-left: 4px;
      --mat-standard-button-toggle-height: 28px;
      font-size: 12px;
    }

    .chip-row.scrollable {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      padding-bottom: 4px;
    }

    .chip-row.scrollable::-webkit-scrollbar {
      display: none;
    }

    .filter-label {
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      color: var(--mat-sys-on-surface-variant, rgba(0, 0, 0, 0.6));
    }

    .controls-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
      margin-bottom: 16px;
    }

    .recent-section {
      margin-bottom: 16px;
      padding: 16px;
      border-radius: 14px;
      border: 1px solid var(--mat-sys-outline-variant, rgba(0, 0, 0, 0.12));
      background: color-mix(in srgb, var(--mat-sys-primary, #1976d2) 4%, var(--mat-sys-surface, #fff));
    }

    .recent-header {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .recent-header h3 {
      margin: 0 0 4px;
      font-size: 1rem;
    }

    .recent-header p {
      margin: 0;
      opacity: 0.72;
      font-size: 13px;
    }

    .recent-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 10px;
    }

    .recent-card {
      text-align: left;
      border: 1px solid var(--mat-sys-outline-variant, rgba(0, 0, 0, 0.12));
      background: transparent;
      border-radius: 12px;
      padding: 12px;
      cursor: pointer;
      color: inherit;
    }

    .recent-card:hover {
      background: color-mix(in srgb, var(--mat-sys-primary, #1976d2) 7%, transparent);
    }

    .recent-name,
    .recent-meta {
      display: block;
    }

    .recent-name {
      font-weight: 600;
      margin-bottom: 4px;
    }

    .recent-meta {
      font-size: 12px;
      opacity: 0.72;
    }

    .sort-select {
      width: 120px;
    }

    .trending-scroll {
      max-height: calc(100vh - 220px);
      overflow-y: auto;
      overflow-x: hidden;
    }

    .repo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 12px;
      align-items: stretch;
    }

    .repo-grid.mobile {
      grid-template-columns: 1fr;
    }

    .empty-state {
      text-align: center;
      padding: 48px 16px;
      color: var(--mat-sys-on-surface-variant, rgba(0, 0, 0, 0.5));
    }

    .empty-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      opacity: 0.4;
    }

    .sentinel {
      height: 1px;
      margin-top: 8px;
    }

    .load-more-spinner {
      display: flex;
      justify-content: center;
      padding: 16px;
    }

    @media (max-width: 599px) {
      .controls-row {
        flex-direction: column;
        align-items: stretch;
      }

      .trending-scroll {
        max-height: calc(100vh - 280px);
      }
    }
  `,
})
export class TrendingComponent implements OnInit, AfterViewInit, OnDestroy {
  store = inject(TrendingStore);
  presetsStore = inject(PresetsStore);
  recentStore = inject(RecentlyViewedStore);
  private authStore = inject(AuthStore);
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private searchSubject = new Subject<string>();
  private bp = inject(BreakpointObserver);
  isMobile = signal(false);
  searchValue = '';

  scrollRoot = viewChild<ElementRef<HTMLElement>>('scrollRoot');
  sentinel = viewChild<ElementRef<HTMLElement>>('loadMoreSentinel');
  readmeDrawer = viewChild(ReadmeDrawerComponent);

  private intersectionObserver?: IntersectionObserver;

  languages = LANGUAGES;
  topics = TOPICS;
  constructor() {
    this.bp
      .observe([Breakpoints.Handset])
      .pipe(takeUntilDestroyed())
      .subscribe((r) => {
        this.isMobile.set(r.matches);
      });

    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed()
      )
      .subscribe((q) => {
        this.scrollTrendingTop();
        this.store.setSearchQuery(q);
        this.store.loadRepos();
      });

    toObservable(this.authStore.isAuthenticated)
      .pipe(
        switchMap((authed) => (authed ? this.api.getStarred() : EMPTY)),
        takeUntilDestroyed()
      )
      .subscribe((res) => {
        this.store.loadStarredIds(
          res.starred.map((r) => r.githubRepoId)
        );
      });

    effect(() => {
      this.authStore.isAuthenticated();
      void this.presetsStore.load();
    });

    effect(() => {
      this.store.repos();
      this.store.hasMore();
      queueMicrotask(() => this.setupIntersectionObserver());
    });
  }

  ngOnInit() {
    void this.presetsStore.load();
    this.store.loadRepos();
  }

  ngAfterViewInit() {
    queueMicrotask(() => this.setupIntersectionObserver());
  }

  ngOnDestroy() {
    this.intersectionObserver?.disconnect();
  }

  private setupIntersectionObserver() {
    this.intersectionObserver?.disconnect();
    const el = this.sentinel()?.nativeElement;
    const root = this.scrollRoot()?.nativeElement;
    if (!el || !root) {
      return;
    }
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void this.store.loadMore();
        }
      },
      { root, rootMargin: '400px', threshold: 0 }
    );
    this.intersectionObserver.observe(el);
  }

  private scrollTrendingTop() {
    this.scrollRoot()?.nativeElement?.scrollTo({ top: 0, behavior: 'auto' });
  }

  formatStars(value: number): string {
    return Intl.NumberFormat().format(value);
  }

  onSearchChange(value: string) {
    this.searchValue = value;
    this.searchSubject.next(value);
  }

  selectLanguage(lang: string | null) {
    this.scrollTrendingTop();
    this.store.setLanguage(lang);
    this.store.loadRepos();
  }

  toggleTopic(topic: string) {
    this.scrollTrendingTop();
    const current = this.store.topics();
    const updated = current.includes(topic)
      ? current.filter((t) => t !== topic)
      : [...current, topic];
    this.store.setTopics(updated);
    this.store.loadRepos();
  }

  setTopicMatchMode(mode: TopicMatchMode) {
    this.scrollTrendingTop();
    this.store.setTopicMatchMode(mode);
    this.store.loadRepos();
  }

  setDateRange(range: DateRange) {
    this.scrollTrendingTop();
    this.store.setDateRange(range);
    this.store.loadRepos();
  }

  setSortBy(sort: RepoSortField) {
    this.scrollTrendingTop();
    this.store.setSort(sort, this.store.order());
    this.store.loadRepos();
  }

  toggleOrder() {
    this.scrollTrendingTop();
    const newOrder: SortOrder = this.store.order() === 'desc' ? 'asc' : 'desc';
    this.store.setSort(this.store.sortBy(), newOrder);
    this.store.loadRepos();
  }

  setViewMode(mode: TrendingViewMode) {
    this.scrollTrendingTop();
    this.store.setViewMode(mode);
    this.store.loadRepos();
  }

  applyPreset(p: TrendingFilterPresetDto) {
    this.scrollTrendingTop();
    this.searchSubject.next('');
    this.searchValue = '';
    this.store.applyPreset(p);
    this.store.loadRepos();
  }

  removePreset(event: Event, p: TrendingFilterPresetDto) {
    event.stopPropagation();
    void this.presetsStore.deletePreset(p.id);
  }

  openSavePresetDialog() {
    this.dialog
      .open(SavePresetDialogComponent, {
        width: '360px',
        data: {},
      })
      .afterClosed()
      .pipe(takeUntilDestroyed())
      .subscribe((name) => {
        if (!name?.trim()) return;
        void this.presetsStore.savePreset(name.trim(), {
          language: this.store.language(),
          topics: [...this.store.topics()],
          topicMatchMode: this.store.topicMatchMode(),
          dateRange: this.store.dateRange(),
          sortBy: this.store.sortBy(),
          order: this.store.order(),
        });
      });
  }

  trackViewed(repo: GitHubRepo) {
    this.recentStore.trackRepo(repo);
  }

  openReadme(drawer: ReadmeDrawerComponent, repo: GitHubRepo) {
    this.trackViewed(repo);
    drawer.openRepo(repo);
  }

  showInsightsForRepo(repo: GitHubRepo) {
    this.trackViewed(repo);
    openInsightsDialog(
      this.dialog,
      {
        fullName: repo.full_name,
        htmlUrl: repo.html_url,
        description: repo.description,
        language: repo.language,
        watchScore: repo.watchScore,
        radarScore: repo.radarScore,
        badge: this.store.viewMode() === 'radar' ? 'Radar view' : undefined,
        reasons: [
          ...(repo.radarReasons ?? []),
          ...((repo.watchReasons ?? []).filter((r) => !(repo.radarReasons ?? []).includes(r))),
        ],
        context:
          this.store.viewMode() === 'radar'
            ? 'This repo is being ranked by momentum and health signals instead of the default GitHub order.'
            : 'These are the health and momentum signals behind the current repo score.',
      },
      this.readmeDrawer()
    );
  }

  showInsightsForRecent(item: RecentlyViewedRepo) {
    openInsightsDialog(
      this.dialog,
      {
        fullName: item.fullName,
        htmlUrl: item.htmlUrl,
        description: item.description,
        language: item.language,
        watchScore: item.watchScore,
        radarScore: item.radarScore,
        badge: 'Recently viewed',
        reasons: [
          ...(item.radarReasons ?? []),
          ...((item.watchReasons ?? []).filter((r) => !(item.radarReasons ?? []).includes(r))),
        ],
        context: `Viewed ${new Date(item.viewedAt).toLocaleString()}.`,
      },
      this.readmeDrawer()
    );
  }

  toggleStar(repo: GitHubRepo) {
    if (!this.authStore.isAuthenticated()) {
      this.authStore.login(window.location.pathname);
      return;
    }

    if (this.store.starredRepoIds().has(repo.id)) {
      this.api
        .unstarRepo(repo.owner.login, repo.name)
        .pipe(takeUntilDestroyed())
        .subscribe(() => {
          this.store.markUnstarred(repo.id);
        });
    } else {
      this.api
        .starRepo({
          repoId: repo.id,
          owner: repo.owner.login,
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          language: repo.language,
          starsCount: repo.stargazers_count,
          url: repo.html_url,
        })
        .pipe(takeUntilDestroyed())
        .subscribe(() => {
          this.store.markStarred(repo.id);
        });
    }
  }
}
