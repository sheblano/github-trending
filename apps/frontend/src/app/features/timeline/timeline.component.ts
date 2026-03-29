import { Component, inject, OnInit, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { formatRelativeDate } from '@github-trending/shared/utils';
import type { TimelineEventDto } from '@github-trending/shared/models';

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    FormsModule,
  ],
  template: `
    <div class="timeline-header">
      <h1>Timeline</h1>
      <p class="subtitle">
        Signals captured across all trending repos: star spikes, radar entries, and new releases.
        These are not filtered to your starred repos; they reflect activity across everything currently trending.
      </p>

      <div class="filters">
        <mat-form-field appearance="outline" class="filter-repo">
          <mat-label>Repo (owner/name)</mat-label>
          <input matInput [(ngModel)]="repoFilter" placeholder="e.g. vercel/next.js" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="filter-type">
          <mat-label>Event type</mat-label>
          <mat-select [(ngModel)]="typeFilter">
            <mat-option value="">All</mat-option>
            <mat-option value="release_published">Release</mat-option>
            <mat-option value="star_spike">Star spike</mat-option>
            <mat-option value="entered_radar">Entered radar</mat-option>
          </mat-select>
        </mat-form-field>
        <button mat-flat-button color="primary" type="button" (click)="load()">
          Apply
        </button>
      </div>
    </div>

    @if (loading()) {
      <div class="loading">
        <mat-progress-spinner diameter="40" mode="indeterminate" />
      </div>
    } @else if (events().length === 0) {
      <div class="empty">
        <mat-icon>timeline</mat-icon>
        <p>No events yet. Browse trending (and sync releases) to populate the timeline.</p>
      </div>
    } @else {
      <ul class="event-list">
        @for (e of events(); track e.id) {
          <li class="event-item">
            <div class="event-icon-wrap">
              <mat-icon class="event-icon">{{ iconFor(e.eventType) }}</mat-icon>
            </div>
            <div class="event-body">
              <div class="event-title-row">
                <span class="event-title">{{ e.title }}</span>
                <span class="event-time">{{ formatDate(e.eventAt) }}</span>
              </div>
              <a
                class="repo-link"
                [href]="repoHref(e)"
                target="_blank"
                rel="noopener"
              >
                {{ e.fullName }}
              </a>
              @if (e.description) {
                <p class="event-desc">{{ e.description }}</p>
              }
              @if (e.url) {
                <a class="event-url" [href]="e.url" target="_blank" rel="noopener">
                  Open link
                </a>
              }
            </div>
          </li>
        }
      </ul>
    }
  `,
  styles: `
    .timeline-header {
      margin-bottom: 20px;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 1.5rem;
      color: var(--mat-sys-on-surface);
    }
    .subtitle {
      margin: 0 0 16px;
      color: var(--mat-sys-on-surface-variant);
      font-size: 14px;
      max-width: 640px;
      line-height: 1.5;
    }
    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
    }
    .filter-repo {
      flex: 1;
      min-width: 200px;
    }
    .filter-type {
      width: 180px;
    }
    .loading,
    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 16px;
      color: var(--mat-sys-on-surface-variant);
    }
    .empty mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 8px;
      opacity: 0.5;
    }
    .event-list {
      list-style: none;
      margin: 0;
      padding: 0;
      border-top: 1px solid var(--mat-sys-outline-variant);
    }
    .event-item {
      display: flex;
      gap: 12px;
      padding: 16px 0;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .event-icon-wrap {
      flex-shrink: 0;
    }
    .event-icon {
      color: var(--mat-sys-primary);
    }
    .event-body {
      min-width: 0;
      flex: 1;
    }
    .event-title-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: baseline;
      justify-content: space-between;
    }
    .event-title {
      font-weight: 600;
      font-size: 15px;
      color: var(--mat-sys-on-surface);
    }
    .event-time {
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant);
      white-space: nowrap;
    }
    .repo-link {
      display: inline-block;
      margin-top: 4px;
      font-size: 13px;
      color: var(--mat-sys-primary);
      text-decoration: none;
    }
    .repo-link:hover {
      text-decoration: underline;
    }
    .event-desc {
      margin: 8px 0 0;
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant);
      line-height: 1.45;
    }
    .event-url {
      display: inline-block;
      margin-top: 6px;
      font-size: 12px;
      color: var(--mat-sys-primary);
    }
  `,
})
export class TimelineComponent implements OnInit {
  private api = inject(ApiService);

  events = signal<TimelineEventDto[]>([]);
  loading = signal(false);
  repoFilter = '';
  typeFilter = '';

  formatDate = formatRelativeDate;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api
      .getTimeline({
        repo: this.repoFilter.trim() || undefined,
        eventType: this.typeFilter || undefined,
        limit: 150,
      })
      .subscribe({
        next: (res) => {
          this.events.set(res.events ?? []);
          this.loading.set(false);
        },
        error: () => {
          this.events.set([]);
          this.loading.set(false);
        },
      });
  }

  iconFor(type: string): string {
    switch (type) {
      case 'release_published':
        return 'new_releases';
      case 'star_spike':
        return 'trending_up';
      case 'entered_radar':
        return 'radar';
      default:
        return 'event';
    }
  }

  repoHref(e: TimelineEventDto): string {
    return `https://github.com/${e.fullName}`;
  }
}
