import { Route } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./features/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: 'trending',
        loadComponent: () =>
          import('./features/trending/trending.component').then(
            (m) => m.TrendingComponent
          ),
      },
      {
        path: 'starred',
        loadComponent: () =>
          import('./features/starred/starred.component').then(
            (m) => m.StarredComponent
          ),
        canActivate: [authGuard],
      },
      { path: '', redirectTo: 'trending', pathMatch: 'full' },
    ],
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then(
        (m) => m.LoginComponent
      ),
  },
  { path: '**', redirectTo: 'trending' },
];
