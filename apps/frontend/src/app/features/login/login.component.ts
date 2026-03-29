import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthStore } from '../../store/auth.store';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-icon mat-card-avatar class="login-icon">trending_up</mat-icon>
          <mat-card-title>GitHub Trending Explorer</mat-card-title>
          <mat-card-subtitle>
            Sign in to star repos and track release notes
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p>
            Sign in with your GitHub account to unlock these features:
          </p>
          <ul>
            <li>Star repos (synced with your GitHub account)</li>
            <li>Track release notes for followed repos</li>
            <li>Add personal notes to repos</li>
          </ul>
          <p class="hint">
            You can browse trending repos without signing in.
          </p>
        </mat-card-content>
        <mat-card-actions align="end">
          <button
            mat-flat-button
            color="primary"
            (click)="login()"
            class="github-btn"
          >
            <mat-icon>login</mat-icon>
            Sign in with GitHub
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: `
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
      padding: 16px;
    }

    .login-card {
      max-width: 480px;
      width: 100%;
    }

    .login-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
    }

    ul {
      padding-left: 20px;
    }

    li {
      margin-bottom: 8px;
    }

    .hint {
      opacity: 0.7;
      font-size: 14px;
    }

    .github-btn {
      gap: 8px;
    }
  `,
})
export class LoginComponent {
  private authStore = inject(AuthStore);
  private route = inject(ActivatedRoute);

  login() {
    const returnUrl =
      this.route.snapshot.queryParamMap.get('returnUrl') || '/trending';
    this.authStore.login(returnUrl);
  }
}
