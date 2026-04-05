import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/api.service';
import type { GitHubRepo } from '@github-trending/shared/models';

@Component({
  selector: 'app-readme-drawer',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatProgressBarModule, MatTooltipModule],
  template: `
    @if (open()) {
      <div class="backdrop" (click)="close()" aria-hidden="true"></div>
      <aside class="panel" role="dialog" aria-label="README preview">
        <header class="panel-header">
          <h2 class="title">{{ repo()?.full_name }}</h2>
          <span class="spacer"></span>
          @if (repo()) {
            <a
              mat-icon-button
              [href]="repo()!.html_url"
              target="_blank"
              rel="noopener"
              matTooltip="Open on GitHub"
            >
              <mat-icon>open_in_new</mat-icon>
            </a>
          }
          <button mat-icon-button type="button" (click)="close()" aria-label="Close">
            <mat-icon>close</mat-icon>
          </button>
        </header>
        @if (loading()) {
          <mat-progress-bar mode="indeterminate" />
        }
        @if (safeHtml(); as html) {
          <div class="readme-body" [innerHTML]="html"></div>
        }
      </aside>
    }
  `,
  styles: `
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 998;
      background: rgba(0, 0, 0, 0.45);
    }
    .panel {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      z-index: 999;
      width: min(560px, 100vw);
      max-width: 100%;
      background: var(--mat-sys-surface, #fff);
      box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .panel-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 8px 8px 16px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      flex-shrink: 0;
    }
    .title {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .spacer {
      flex: 1;
    }
    .readme-body {
      flex: 1;
      overflow: auto;
      padding: 16px 20px 32px;
      font-size: 14px;
      line-height: 1.6;
    }
    .readme-body ::ng-deep pre {
      overflow: auto;
      padding: 12px;
      border-radius: 6px;
      background: rgba(0, 0, 0, 0.05);
    }
    .readme-body ::ng-deep code {
      font-family: ui-monospace, monospace;
      font-size: 13px;
    }
    .readme-body ::ng-deep img {
      max-width: 100%;
      height: auto;
    }
    .readme-body ::ng-deep table {
      display: block;
      overflow-x: auto;
    }
  `,
})
export class ReadmeDrawerComponent {
  private api = inject(ApiService);
  private sanitizer = inject(DomSanitizer);
  private destroyRef = inject(DestroyRef);

  open = signal(false);
  repo = signal<GitHubRepo | null>(null);
  loading = signal(false);
  safeHtml = signal<SafeHtml | null>(null);

  openRepo(r: GitHubRepo) {
    this.repo.set(r);
    this.open.set(true);
    this.loading.set(true);
    this.safeHtml.set(null);
    this.api
      .getReadme(r.owner.login, r.name)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (res) => {
        const html =
          res.html?.trim() ||
          '<p class="muted">No README found for this repository.</p>';
        this.safeHtml.set(this.sanitizer.bypassSecurityTrustHtml(html));
        this.loading.set(false);
      },
      error: () => {
        this.safeHtml.set(
          this.sanitizer.bypassSecurityTrustHtml(
            '<p class="muted">Could not load README. Try again later.</p>'
          )
        );
        this.loading.set(false);
      },
    });
  }

  close() {
    this.open.set(false);
    this.repo.set(null);
    this.safeHtml.set(null);
  }
}
