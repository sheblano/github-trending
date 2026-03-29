import { Component, inject, effect } from '@angular/core';
import {
  RouterOutlet,
  RouterLink,
  RouterLinkActive,
  Router,
} from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { AuthStore } from '../../store/auth.store';
import { DigestStore } from '../../store/digest.store';
import { ThemeStore } from '../../store/theme.store';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSidenavModule,
    MatDividerModule,
    MatTooltipModule,
  ],
  template: `
    <mat-toolbar color="primary" class="toolbar">
      <span class="logo" routerLink="/trending">
        <img src="/logo-mark.svg" alt="" class="logo-img" width="32" height="32" />
        <span class="logo-text">
          <span class="logo-title">Trending Explorer</span>
          <span class="logo-sub">GitHub discovery</span>
        </span>
      </span>

      <span class="spacer"></span>

      @if (!isMobile) {
        <nav class="nav-links">
          <a mat-button routerLink="/trending" routerLinkActive="active-link">
            <mat-icon>explore</mat-icon>
            Trending
          </a>
          <a mat-button routerLink="/galaxy" routerLinkActive="active-link">
            <mat-icon>bubble_chart</mat-icon>
            Galaxy
          </a>
          <a mat-button routerLink="/movers" routerLinkActive="active-link">
            <mat-icon>rocket_launch</mat-icon>
            Movers
          </a>
          <a mat-button routerLink="/starred" routerLinkActive="active-link">
            <mat-icon>star</mat-icon>
            Starred
          </a>
          <a mat-button routerLink="/timeline" routerLinkActive="active-link">
            <mat-icon>timeline</mat-icon>
            Timeline
          </a>
        </nav>
      }

      <button
        mat-icon-button
        type="button"
        (click)="themeStore.toggle()"
        [matTooltip]="themeStore.mode() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
        class="theme-toggle"
      >
        <mat-icon>{{ themeStore.mode() === 'dark' ? 'light_mode' : 'dark_mode' }}</mat-icon>
      </button>

      @if (authStore.isAuthenticated()) {
        <button
          mat-icon-button
          type="button"
          class="digest-btn"
          [matMenuTriggerFor]="digestMenu"
          (menuOpened)="onDigestMenuOpened()"
          matTooltip="Weekly digest"
        >
          <mat-icon>notifications</mat-icon>
          @if (digestStore.digest()?.hasUnseen) {
            <span class="digest-dot" aria-hidden="true"></span>
          }
        </button>
        <mat-menu #digestMenu="matMenu" class="digest-menu">
          <div class="digest-menu-inner">
            @if (digestStore.loading()) {
              <div class="digest-loading">Loading digest…</div>
            } @else if (digestStore.digest(); as d) {
              <div class="digest-title">Weekly digest</div>
              <button mat-menu-item type="button" (click)="goStarredReleases()">
                <mat-icon>new_releases</mat-icon>
                <span>
                  @if (d.newReleaseCount > 0) {
                    {{ d.newReleaseCount }} repo(s) with new releases
                  } @else {
                    No new releases since last check
                  }
                </span>
              </button>
              <mat-divider />
              <div class="digest-subtitle" mat-menu-item disabled>
                Trending in your languages
              </div>
              @for (r of d.trendingInYourLangs; track r.id) {
                <a mat-menu-item [href]="r.url" target="_blank" rel="noopener">
                  <span class="digest-repo">{{ r.fullName }}</span>
                  <span class="digest-meta">{{ r.stars }} ★</span>
                </a>
              }
              @if (d.trendingInYourLangs.length === 0) {
                <div class="digest-empty" mat-menu-item disabled>
                  Star repos to personalize language picks
                </div>
              }
            }
          </div>
        </mat-menu>

        <button mat-icon-button [matMenuTriggerFor]="userMenu">
          @if (authStore.user()?.avatarUrl) {
            <img
              [src]="authStore.user()?.avatarUrl"
              class="avatar"
              [alt]="authStore.user()?.username"
            />
          } @else {
            <mat-icon>account_circle</mat-icon>
          }
        </button>
        <mat-menu #userMenu="matMenu">
          <div class="user-menu-header" mat-menu-item disabled>
            {{ authStore.user()?.username }}
          </div>
          <button mat-menu-item (click)="authStore.logout()">
            <mat-icon>logout</mat-icon>
            Sign out
          </button>
        </mat-menu>
      } @else {
        <button mat-button (click)="authStore.login()">
          <mat-icon>login</mat-icon>
          Sign in
        </button>
      }
    </mat-toolbar>

    <main class="content app-shell-wide">
      <router-outlet />
    </main>

    @if (isMobile) {
      <nav class="bottom-nav">
        <a
          mat-button
          routerLink="/trending"
          routerLinkActive="active-link"
          class="bottom-nav-item"
        >
          <mat-icon>explore</mat-icon>
          <span>Trending</span>
        </a>
        <a
          mat-button
          routerLink="/galaxy"
          routerLinkActive="active-link"
          class="bottom-nav-item"
        >
          <mat-icon>bubble_chart</mat-icon>
          <span>Galaxy</span>
        </a>
        <a
          mat-button
          routerLink="/movers"
          routerLinkActive="active-link"
          class="bottom-nav-item"
        >
          <mat-icon>rocket_launch</mat-icon>
          <span>Movers</span>
        </a>
        <a
          mat-button
          routerLink="/starred"
          routerLinkActive="active-link"
          class="bottom-nav-item"
        >
          <mat-icon>star</mat-icon>
          <span>Starred</span>
        </a>
        <a
          mat-button
          routerLink="/timeline"
          routerLinkActive="active-link"
          class="bottom-nav-item"
        >
          <mat-icon>timeline</mat-icon>
          <span>Time</span>
        </a>
      </nav>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    .toolbar {
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      text-decoration: none;
      color: inherit;
    }

    .logo-img {
      border-radius: 8px;
      flex-shrink: 0;
    }

    .logo-text {
      display: flex;
      flex-direction: column;
      line-height: 1.15;
    }

    .logo-title {
      font-weight: 600;
      font-size: 16px;
      letter-spacing: -0.02em;
    }

    .logo-sub {
      font-size: 11px;
      opacity: 0.85;
      font-weight: 400;
    }

    .theme-toggle {
      margin-right: 4px;
    }

    .spacer {
      flex: 1;
    }

    .nav-links {
      display: flex;
      gap: 4px;
      margin-right: 8px;
    }

    .active-link {
      background: rgba(255, 255, 255, 0.15);
    }

    .digest-btn {
      position: relative;
    }

    .digest-dot {
      position: absolute;
      top: 6px;
      right: 6px;
      width: 8px;
      height: 8px;
      background: #ff5252;
      border-radius: 50%;
      pointer-events: none;
    }

    .digest-menu-inner {
      min-width: 280px;
      max-width: 360px;
    }

    .digest-title {
      padding: 12px 16px 4px;
      font-weight: 600;
      font-size: 14px;
    }

    .digest-subtitle {
      font-size: 12px;
      opacity: 0.7;
    }

    .digest-loading,
    .digest-empty {
      padding: 12px 16px;
      font-size: 13px;
      opacity: 0.7;
    }

    .digest-repo {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .digest-meta {
      opacity: 0.7;
      font-size: 12px;
      margin-left: 8px;
    }

    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
    }

    .content {
      flex: 1;
      padding: 16px;
      max-width: 1400px;
      width: 100%;
      margin: 0 auto;
      box-sizing: border-box;
    }

    .bottom-nav {
      display: flex;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--mat-toolbar-container-background-color, #fff);
      border-top: 1px solid rgba(0, 0, 0, 0.12);
      z-index: 100;
      padding: 4px 0;
    }

    .bottom-nav-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      font-size: 12px;
      min-height: 56px;
    }

    .user-menu-header {
      opacity: 0.7;
      font-weight: 500;
    }

    @media (max-width: 599px) {
      .logo-text {
        display: none;
      }

      .bottom-nav-item span {
        font-size: 10px;
      }
      .content {
        padding: 12px;
        padding-bottom: 72px;
      }
    }
  `,
})
export class ShellComponent {
  authStore = inject(AuthStore);
  digestStore = inject(DigestStore);
  themeStore = inject(ThemeStore);
  private router = inject(Router);
  isMobile = false;

  constructor() {
    const bp = inject(BreakpointObserver);
    bp.observe([Breakpoints.Handset]).subscribe((result) => {
      this.isMobile = result.matches;
    });

    effect(() => {
      this.authStore.isAuthenticated();
      void this.digestStore.load();
    });
  }

  onDigestMenuOpened() {
    void this.digestStore.markSeen();
  }

  goStarredReleases() {
    void this.router.navigate(['/starred'], {
      queryParams: { tab: 'releases' },
    });
  }
}
