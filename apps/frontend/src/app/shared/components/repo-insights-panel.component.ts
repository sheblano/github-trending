import { Component, input, output } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';

export interface RepoInsightsPanelData {
  fullName: string;
  htmlUrl: string;
  description?: string | null;
  language?: string | null;
  watchScore?: number;
  radarScore?: number;
  reasons: string[];
  badge?: string;
  context?: string;
}

@Component({
  selector: 'app-repo-insights-panel',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatChipsModule],
  template: `
    <mat-card class="insights-card">
      <mat-card-header>
        <mat-card-title>
          <a [href]="data().htmlUrl" target="_blank" rel="noopener">{{ data().fullName }}</a>
        </mat-card-title>
        <mat-card-subtitle>
          {{ data().language || 'Unknown language' }}
          @if (data().badge) {
            · <span class="badge">{{ data().badge }}</span>
          }
        </mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        @if (data().description) {
          <p class="desc">{{ data().description }}</p>
        }
        @if (data().context) {
          <p class="context">{{ data().context }}</p>
        }
        <div class="scores">
          @if (data().radarScore !== null && data().radarScore !== undefined) {
            <mat-chip>Radar {{ data().radarScore }}</mat-chip>
          }
          @if (data().watchScore !== null && data().watchScore !== undefined) {
            <mat-chip>Health {{ data().watchScore }}</mat-chip>
          }
        </div>
        @if (data().reasons.length) {
          <div class="reasons-wrap">
            <div class="reasons-title">Why this is hot</div>
            <ul class="reasons">
              @for (reason of data().reasons; track reason) {
                <li>{{ reason }}</li>
              }
            </ul>
          </div>
        }
      </mat-card-content>
      <mat-card-actions align="end">
        <button mat-button type="button" (click)="readmeClick.emit()">
          <mat-icon>article</mat-icon>
          README
        </button>
        <button mat-stroked-button type="button" (click)="closeClick.emit()">
          Close
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: `
    .insights-card a {
      color: inherit;
      text-decoration: none;
    }
    .insights-card a:hover {
      text-decoration: underline;
    }
    .desc, .context {
      margin: 0 0 10px;
      line-height: 1.5;
      opacity: 0.9;
    }
    .context {
      font-size: 13px;
      opacity: 0.72;
    }
    .badge {
      font-weight: 600;
    }
    .scores {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }
    .reasons-title {
      font-weight: 600;
      margin-bottom: 6px;
    }
    .reasons {
      margin: 0;
      padding-left: 18px;
    }
    .reasons li {
      margin-bottom: 4px;
    }
  `,
})
export class RepoInsightsPanelComponent {
  data = input.required<RepoInsightsPanelData>();
  readmeClick = output<void>();
  closeClick = output<void>();
}
