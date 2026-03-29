import { Component, computed, input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import type { StarHistoryPoint } from '@github-trending/shared/models';

@Component({
  selector: 'app-sparkline',
  standalone: true,
  imports: [MatTooltipModule],
  template: `
    <svg
      class="spark-svg"
      [attr.viewBox]="'0 0 ' + width + ' ' + height"
      preserveAspectRatio="none"
      [matTooltip]="tooltipText()"
      matTooltipPosition="above"
    >
      <defs>
        <linearGradient [attr.id]="gradId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="currentColor" stop-opacity="0.2" />
          <stop offset="100%" stop-color="currentColor" stop-opacity="0" />
        </linearGradient>
      </defs>
      @if (fillPoints()) {
        <polygon [attr.points]="fillPoints()!" [attr.fill]="'url(#' + gradId + ')'" />
      }
      @if (linePoints()) {
        <polyline
          [attr.points]="linePoints()!"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          vector-effect="non-scaling-stroke"
        />
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      vertical-align: middle;
      color: var(--mat-sys-primary, #1976d2);
    }
    .spark-svg {
      width: 72px;
      height: 22px;
    }
  `,
})
export class SparklineComponent {
  points = input.required<StarHistoryPoint[]>();
  width = 72;
  height = 22;
  gradId = 'spark-grad-' + Math.random().toString(36).slice(2, 9);

  private normalized = computed(() => {
    const pts = this.points();
    if (pts.length < 2) return null;
    const stars = pts.map((p) => p.stars);
    const minS = Math.min(...stars);
    const maxS = Math.max(...stars);
    const range = maxS - minS || 1;
    const pad = 2;
    const w = this.width - pad * 2;
    const h = this.height - pad * 2;
    return pts.map((p, i) => {
      const x = pad + (pts.length === 1 ? w / 2 : (i / (pts.length - 1)) * w);
      const yNorm = (p.stars - minS) / range;
      const y = pad + h - yNorm * h;
      return { x, y, date: p.date, stars: p.stars };
    });
  });

  linePoints = computed(() => {
    const n = this.normalized();
    if (!n?.length) return null;
    return n.map((p) => `${p.x},${p.y}`).join(' ');
  });

  fillPoints = computed(() => {
    const n = this.normalized();
    if (!n?.length) return null;
    const line = n.map((p) => `${p.x},${p.y}`).join(' ');
    const last = n[n.length - 1];
    const first = n[0];
    return `${first.x},${this.height} ${line} ${last.x},${this.height}`;
  });

  tooltipText = computed(() => {
    const pts = this.points();
    if (!pts.length) return '';
    const last = pts[pts.length - 1];
    return `Stars ~${last.stars} (by week, ending ${last.date})`;
  });
}
