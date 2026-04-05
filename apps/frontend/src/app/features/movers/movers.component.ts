import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from '../../core/api.service';
import { ReadmeDrawerComponent } from '../../shared/components/readme-drawer.component';
import { openInsightsDialog } from '../../shared/helpers/insights-dialog.helper';
import { formatRelativeDate } from '@github-trending/shared/utils';
import type {
  HotSnapshotDto,
  TimelineEventDto,
  TopMoversResponse,
} from '@github-trending/shared/models';

@Component({
  selector: 'app-movers',
  standalone: true,
  imports: [
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    RouterLink,
    ReadmeDrawerComponent,
  ],
  template: `
    <app-readme-drawer #readmeDrawer />
    <section class="movers-hero">
      <div>
        <h1>Top movers</h1>
        <p>
          Breakouts from your instance: star spikes, repos entering radar, fresh
          releases, and high-signal snapshots. Data grows as you browse trending.
        </p>
      </div>
      <a mat-stroked-button routerLink="/galaxy">
        <mat-icon>bubble_chart</mat-icon>
        Open galaxy
      </a>
    </section>

    @if (loading()) {
      <div class="loading">
        <mat-progress-spinner diameter="40" mode="indeterminate" />
      </div>
    } @else if (data(); as d) {
      <div class="sections">
        @if (d.hotNow.length) {
          <section class="block">
            <h2>
              <mat-icon>whatshot</mat-icon>
              Hot right now
            </h2>
            <p class="sub">Recent snapshots with strong radar scores</p>
            <div class="card-grid">
              @for (h of d.hotNow; track h.githubRepoId + h.capturedAt) {
                <mat-card class="mover-card" (click)="selectHotSnapshot(h)">
                  <mat-card-title>
                    <a
                      [href]="githubUrl(h.fullName)"
                      target="_blank"
                      rel="noopener"
                      (click)="$event.stopPropagation()"
                    >
                      {{ h.fullName }}
                    </a>
                  </mat-card-title>
                  <mat-card-subtitle>
                    ★ {{ h.starsCount.toLocaleString() }}
                    @if (h.radarScore !== null && h.radarScore !== undefined) {
                      <mat-chip class="score-chip">Radar {{ h.radarScore }}</mat-chip>
                    }
                  </mat-card-subtitle>
                  <mat-card-content>
                    <span class="meta">{{ formatDate(h.capturedAt) }}</span>
                  </mat-card-content>
                </mat-card>
              }
            </div>
          </section>
        }

        <section class="block">
          <h2>
            <mat-icon>trending_up</mat-icon>
            Star spikes
          </h2>
          @if (d.starSpikes.length === 0) {
            <p class="empty">No spikes recorded yet. Browse trending to capture snapshots.</p>
          } @else {
            <div class="event-list">
              @for (e of d.starSpikes; track e.id) {
                <mat-card class="event-card" (click)="selectEvent(e)">
                  <mat-card-title>{{ e.title }}</mat-card-title>
                  <mat-card-subtitle>{{ e.fullName }} · {{ formatDate(e.eventAt) }}</mat-card-subtitle>
                  @if (e.description) {
                    <mat-card-content>{{ e.description }}</mat-card-content>
                  }
                  @if (e.url) {
                    <mat-card-actions align="end">
                      <a mat-button [href]="e.url" target="_blank" rel="noopener" (click)="$event.stopPropagation()">Open</a>
                    </mat-card-actions>
                  }
                </mat-card>
              }
            </div>
          }
        </section>

        <section class="block">
          <h2>
            <mat-icon>radar</mat-icon>
            Entered radar
          </h2>
          @if (d.enteredRadar.length === 0) {
            <p class="empty">No radar entries yet.</p>
          } @else {
            <div class="event-list">
              @for (e of d.enteredRadar; track e.id) {
                <mat-card class="event-card" (click)="selectEvent(e)">
                  <mat-card-title>{{ e.title }}</mat-card-title>
                  <mat-card-subtitle>{{ e.fullName }} · {{ formatDate(e.eventAt) }}</mat-card-subtitle>
                  @if (e.url) {
                    <mat-card-actions align="end">
                      <a mat-button [href]="e.url" target="_blank" rel="noopener" (click)="$event.stopPropagation()">Repo</a>
                    </mat-card-actions>
                  }
                </mat-card>
              }
            </div>
          }
        </section>

        <section class="block">
          <h2>
            <mat-icon>new_releases</mat-icon>
            Fresh releases
          </h2>
          @if (d.releasePublished.length === 0) {
            <p class="empty">No release events yet. Star repos and sync releases.</p>
          } @else {
            <div class="event-list">
              @for (e of d.releasePublished; track e.id) {
                <mat-card class="event-card" (click)="selectEvent(e)">
                  <mat-card-title>{{ e.title }}</mat-card-title>
                  <mat-card-subtitle>{{ e.fullName }} · {{ formatDate(e.eventAt) }}</mat-card-subtitle>
                  @if (e.description) {
                    <mat-card-content>{{ e.description }}</mat-card-content>
                  }
                  @if (e.url) {
                    <mat-card-actions align="end">
                      <a mat-button [href]="e.url" target="_blank" rel="noopener" (click)="$event.stopPropagation()">Release</a>
                    </mat-card-actions>
                  }
                </mat-card>
              }
            </div>
          }
        </section>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .movers-hero {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 28px;
      padding: 22px;
      border-radius: 16px;
      background: linear-gradient(
        125deg,
        rgba(0, 176, 255, 0.12),
        rgba(124, 77, 255, 0.12)
      );
      border: 1px solid var(--mat-sys-outline-variant, rgba(0, 0, 0, 0.12));
    }
    .movers-hero h1 {
      margin: 0 0 8px;
      font-size: 1.75rem;
      font-weight: 600;
    }
    .movers-hero p {
      margin: 0;
      max-width: 560px;
      font-size: 14px;
      opacity: 0.85;
      line-height: 1.5;
    }
    .loading {
      display: flex;
      justify-content: center;
      padding: 48px;
    }
    .block {
      margin-bottom: 36px;
    }
    .block h2 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 6px;
      font-size: 1.25rem;
    }
    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 12px;
    }
    .mover-card,
    .event-card {
      cursor: pointer;
    }
    .mover-card mat-card-title {
      font-size: 15px;
    }
    .mover-card mat-card-title a {
      color: var(--mat-sys-on-surface);
      text-decoration: none;
    }
    .mover-card mat-card-title a:hover {
      color: var(--mat-sys-primary);
      text-decoration: underline;
    }
    .score-chip {
      margin-left: 8px;
      font-size: 11px;
      min-height: 22px;
    }
    .meta {
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant);
    }
    .sub {
      margin: 0 0 14px;
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant);
    }
    .empty {
      font-size: 14px;
      color: var(--mat-sys-on-surface-variant);
    }
    .event-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .event-card mat-card-title {
      font-size: 15px;
    }
    .event-card mat-card-subtitle {
      font-size: 13px;
    }
  `,
})
export class MoversComponent implements OnInit {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);
  data = signal<TopMoversResponse | null>(null);
  loading = signal(true);
  formatDate = formatRelativeDate;

  readmeDrawer = viewChild(ReadmeDrawerComponent);

  ngOnInit(): void {
    this.load();
  }

  githubUrl(fullName: string): string {
    return `https://github.com/${fullName}`;
  }

  selectHotSnapshot(h: HotSnapshotDto): void {
    openInsightsDialog(
      this.dialog,
      {
        fullName: h.fullName,
        htmlUrl: this.githubUrl(h.fullName),
        radarScore: h.radarScore ?? undefined,
        reasons: h.whyHot,
        badge: 'Top movers',
        context: `Captured ${this.formatDate(h.capturedAt)} from the recent movers snapshot.`,
      },
      this.readmeDrawer()
    );
  }

  selectEvent(e: TimelineEventDto): void {
    const meta = e.meta ?? {};
    const reasons: string[] = [];
    if (e.description) reasons.push(e.description);
    if (e.eventType === 'star_spike' && typeof meta['starDelta'] === 'number') {
      reasons.push(`Gained ${meta['starDelta']} stars between recorded snapshots.`);
    }
    if (e.eventType === 'entered_radar' && typeof meta['radarScore'] === 'number') {
      reasons.push(`Crossed the radar threshold with score ${meta['radarScore']}.`);
    }
    if (e.eventType === 'release_published' && typeof meta['tagName'] === 'string') {
      reasons.push(`Published release ${meta['tagName']}.`);
    }
    openInsightsDialog(
      this.dialog,
      {
        fullName: e.fullName,
        htmlUrl: this.githubUrl(e.fullName),
        reasons,
        badge: e.eventType.replace('_', ' '),
        context: `Event recorded ${this.formatDate(e.eventAt)} on the movers timeline.`,
      },
      this.readmeDrawer()
    );
  }

  load(): void {
    this.loading.set(true);
    this.api.getMovers().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.data.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.data.set({
          starSpikes: [],
          enteredRadar: [],
          releasePublished: [],
          hotNow: [],
        });
        this.loading.set(false);
      },
    });
  }
}
