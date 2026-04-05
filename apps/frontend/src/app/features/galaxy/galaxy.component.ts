import {
  Component,
  inject,
  OnInit,
  signal,
  computed,
  HostListener,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { ReadmeDrawerComponent } from '../../shared/components/readme-drawer.component';
import { LANGUAGES, formatStarCount } from '@github-trending/shared/utils';
import type {
  DateRange,
  GalaxyDiscoveryNodeDto,
  GitHubRepo,
} from '@github-trending/shared/models';
import {
  colorForGroup,
  normalizeNodes,
  nodeRadius,
  buildLegend,
} from './galaxy-layout.utils';

@Component({
  selector: 'app-galaxy',
  standalone: true,
  imports: [
    MatButtonToggleModule,
    MatChipsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatTooltipModule,
    ReadmeDrawerComponent,
    RouterLink,
  ],
  template: `
    <app-readme-drawer #readmeRef />
    <section class="galaxy-hero">
      <div class="hero-copy">
        <h1>Galaxy discovery</h1>
        <p>
          Each dot is a trending repo. Position encodes momentum (horizontal) and
          confidence vs stability (vertical). Size reflects stars. Color is language.
        </p>
      </div>
      <div class="hero-controls">
        <mat-button-toggle-group
          [value]="dateRange()"
          (change)="setDateRange($event.value)"
        >
          <mat-button-toggle value="daily">Today</mat-button-toggle>
          <mat-button-toggle value="weekly">Week</mat-button-toggle>
          <mat-button-toggle value="monthly">Month</mat-button-toggle>
        </mat-button-toggle-group>
      </div>
    </section>

    <div class="lang-row">
      <span class="lang-label">Language</span>
      <mat-chip-set>
        <mat-chip
          [highlighted]="language() === null"
          (click)="setLanguage(null)"
        >
          All
        </mat-chip>
        @for (lang of quickLangs; track lang.value) {
          <mat-chip
            [highlighted]="language() === lang.value"
            (click)="setLanguage(lang.value)"
          >
            {{ lang.label }}
          </mat-chip>
        }
      </mat-chip-set>
    </div>

    @if (loading()) {
      <div class="loading-wrap">
        <mat-progress-spinner diameter="48" mode="indeterminate" />
      </div>
    } @else {
      <div class="galaxy-split" [class.has-selection]="selected()">
        <div class="canvas-wrap">
          <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
          <svg
            class="galaxy-svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
            (click)="onSvgClick($event)"
          >
            <defs>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <rect class="grid-bg" x="0" y="0" width="100" height="100" rx="1" />
            <line class="axis" x1="50" y1="2" x2="50" y2="98" />
            <line class="axis" x1="2" y1="50" x2="98" y2="50" />
            <text class="axis-label" x="96" y="52" text-anchor="end">momentum →</text>
            <text class="axis-label" x="50" y="10" text-anchor="middle">↑ signal</text>
            @for (n of nodes(); track n.id) {
              <circle
                [attr.cx]="n.x * 100"
                [attr.cy]="(1 - n.y) * 100"
                [attr.r]="radius(n)"
                [attr.fill]="colorForGroup(n.colorGroup)"
                [class.hot]="n.radarHot"
                [class.dim]="dimOthers() && selected()?.id !== n.id"
                [attr.filter]="n.radarHot ? 'url(#glow)' : null"
                (click)="select($event, n)"
                (mouseenter)="hovered.set(n)"
                (mouseleave)="hovered.set(null)"
              >
                <title>{{ n.fullName }}: ★ {{ formatStars(n.stargazersCount) }}</title>
              </circle>
            }
          </svg>
          @if (hovered(); as h) {
            <div class="hover-chip">
              <strong>{{ h.fullName }}</strong>
              @if (h.visualReasons[0]) {
                <span class="reason">{{ h.visualReasons[0] }}</span>
              }
            </div>
          }
        </div>

        @if (selected(); as s) {
          <mat-card class="detail-card">
            <mat-card-header>
              <mat-card-title>
                <a [href]="s.htmlUrl" target="_blank" rel="noopener">{{ s.fullName }}</a>
              </mat-card-title>
              <mat-card-subtitle>
                {{ s.language || 'Unknown' }} · ★ {{ formatStars(s.stargazersCount) }}
                @if (s.radarHot) {
                  <span class="hot-pill">Hot</span>
                }
              </mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p class="desc">{{ s.description || 'No description' }}</p>
              @if (s.visualReasons.length) {
                <ul class="reasons">
                  @for (r of s.visualReasons; track r) {
                    <li>{{ r }}</li>
                  }
                </ul>
              }
              <div class="scores">
                @if (s.radarScore !== null && s.radarScore !== undefined) {
                  <span>Radar {{ s.radarScore }}</span>
                }
                @if (s.watchScore !== null && s.watchScore !== undefined) {
                  <span>Watch {{ s.watchScore }}</span>
                }
              </div>
            </mat-card-content>
            <mat-card-actions align="end">
              <button mat-button type="button" (click)="openReadme(s)">
                <mat-icon>article</mat-icon>
                README
              </button>
              <button mat-stroked-button type="button" (click)="clearSelection()">
                Close
              </button>
            </mat-card-actions>
          </mat-card>
        }
      </div>
    }

    @if (legendEntries().length > 0) {
      <div class="legend-row">
        @for (entry of legendEntries(); track entry.lang) {
          <span class="legend-item">
            <span class="legend-dot" [style.background]="entry.color"></span>
            {{ entry.lang }}
          </span>
        }
      </div>
    }

    <p class="hint">
      Tip: open <a routerLink="/trending">Trending</a> for full filters and list view.
    </p>
  `,
  styles: `
    :host {
      display: block;
    }
    .galaxy-hero {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 20px;
      padding: 20px 22px;
      border-radius: 16px;
      background: linear-gradient(
        135deg,
        rgba(124, 77, 255, 0.14),
        rgba(0, 176, 255, 0.1)
      );
      border: 1px solid var(--mat-sys-outline-variant, rgba(0, 0, 0, 0.12));
    }
    .hero-copy h1 {
      margin: 0 0 8px;
      font-size: 1.75rem;
      font-weight: 600;
      letter-spacing: -0.03em;
    }
    .hero-copy p {
      margin: 0;
      max-width: 520px;
      font-size: 14px;
      opacity: 0.85;
      line-height: 1.5;
    }
    .lang-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
    }
    .lang-label {
      font-size: 13px;
      font-weight: 500;
      opacity: 0.7;
    }
    .loading-wrap {
      display: flex;
      justify-content: center;
      padding: 64px;
    }
    .galaxy-split {
      display: grid;
      gap: 16px;
      grid-template-columns: 1fr;
    }
    @media (min-width: 900px) {
      .galaxy-split.has-selection {
        grid-template-columns: 1fr minmax(280px, 340px);
      }
    }
    .canvas-wrap {
      position: relative;
      min-height: 420px;
    }
    .galaxy-svg {
      width: 100%;
      height: 100%;
      min-height: 420px;
      display: block;
      cursor: crosshair;
    }
    .grid-bg {
      fill: var(--mat-sys-surface-container-low, rgba(0, 0, 0, 0.04));
      stroke: var(--mat-sys-outline-variant, rgba(0, 0, 0, 0.12));
      stroke-width: 0.15;
    }
    .axis {
      stroke: var(--mat-sys-outline-variant, rgba(0, 0, 0, 0.15));
      stroke-width: 0.08;
      stroke-dasharray: 0.8 0.8;
      opacity: 0.6;
    }
    .axis-label {
      fill: var(--mat-sys-on-surface-variant, rgba(0, 0, 0, 0.5));
      font-size: 2.2px;
    }
    circle {
      stroke: var(--mat-sys-outline-variant, rgba(128,128,128,0.3));
      stroke-width: 0.06;
      cursor: pointer;
      transition:
        opacity 0.15s ease,
        transform 0.15s ease;
    }
    circle.hot {
      stroke: rgba(255, 255, 255, 0.5);
    }
    circle.dim {
      opacity: 0.22;
    }
    .hover-chip {
      position: absolute;
      left: 12px;
      bottom: 12px;
      max-width: min(360px, 90%);
      padding: 10px 12px;
      border-radius: 10px;
      background: color-mix(in srgb, var(--mat-sys-surface, #fff) 92%, transparent);
      border: 1px solid var(--mat-sys-outline-variant, rgba(0, 0, 0, 0.12));
      font-size: 13px;
      pointer-events: none;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
    }
    .hover-chip .reason {
      display: block;
      margin-top: 4px;
      opacity: 0.8;
      font-size: 12px;
    }
    .detail-card {
      align-self: start;
    }
    .detail-card .desc {
      font-size: 14px;
      line-height: 1.45;
    }
    .reasons {
      margin: 8px 0 0;
      padding-left: 18px;
      font-size: 13px;
      opacity: 0.9;
    }
    .scores {
      display: flex;
      gap: 12px;
      margin-top: 12px;
      font-size: 13px;
      font-weight: 500;
    }
    .hot-pill {
      margin-left: 8px;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      background: rgba(124, 77, 255, 0.25);
    }
    .legend-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 14px;
      margin-top: 14px;
      padding: 10px 14px;
      border-radius: 10px;
      background: var(--mat-sys-surface-container-low, rgba(0,0,0,0.04));
      border: 1px solid var(--mat-sys-outline-variant, rgba(0,0,0,0.1));
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      opacity: 0.85;
    }
    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
      border: 1px solid rgba(0,0,0,0.15);
    }
    .hint {
      margin-top: 16px;
      font-size: 13px;
      opacity: 0.65;
    }
    .hint a {
      color: var(--mat-sys-primary, #7c4dff);
    }
  `,
})
export class GalaxyComponent implements OnInit {
  private api = inject(ApiService);
  private readmeRef = viewChild<ReadmeDrawerComponent>('readmeRef');

  nodes = signal<GalaxyDiscoveryNodeDto[]>([]);
  loading = signal(true);
  dateRange = signal<DateRange>('weekly');
  language = signal<string | null>(null);
  selected = signal<GalaxyDiscoveryNodeDto | null>(null);
  hovered = signal<GalaxyDiscoveryNodeDto | null>(null);

  quickLangs = LANGUAGES.filter((l) =>
    ['TypeScript', 'Python', 'Rust', 'Go', 'JavaScript'].includes(l.label)
  );

  formatStars = formatStarCount;
  colorForGroup = colorForGroup;
  radius = nodeRadius;

  dimOthers = computed(() => this.selected() !== null);

  ngOnInit(): void {
    this.load();
  }

  setDateRange(r: DateRange): void {
    this.dateRange.set(r);
    this.load();
  }

  setLanguage(lang: string | null): void {
    this.language.set(lang);
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.selected.set(null);
    try {
      const res = await firstValueFrom(
        this.api.getDiscovery({
          language: this.language(),
          dateRange: this.dateRange(),
          perPage: 60,
          sort: 'stars',
          order: 'desc',
          page: 1,
        })
      );
      this.nodes.set(normalizeNodes(res.nodes ?? []));
    } catch {
      this.nodes.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  legendEntries = computed(() => buildLegend(this.nodes()));

  select(ev: MouseEvent, n: GalaxyDiscoveryNodeDto): void {
    ev.stopPropagation();
    this.selected.update((s) => (s?.id === n.id ? null : n));
  }

  onSvgClick(ev: MouseEvent): void {
    const t = ev.target as Element | null;
    if (t?.tagName?.toLowerCase() === 'circle') return;
    this.selected.set(null);
  }

  clearSelection(): void {
    this.selected.set(null);
  }

  openReadme(s: GalaxyDiscoveryNodeDto): void {
    const repo = {
      id: s.id,
      name: s.name,
      full_name: s.fullName,
      owner: { login: s.owner, avatar_url: '' },
      html_url: s.htmlUrl,
      description: s.description,
      language: s.language,
      stargazers_count: s.stargazersCount,
      forks_count: 0,
      open_issues_count: 0,
      pushed_at: new Date().toISOString(),
      created_at: '',
      updated_at: '',
      topics: [],
      license: null,
      archived: false,
    } as GitHubRepo;
    this.readmeRef()?.openRepo(repo);
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.selected.set(null);
  }
}
