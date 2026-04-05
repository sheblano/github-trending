import { computed, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  signalStore,
  withState,
  withComputed,
  withMethods,
  patchState,
} from '@ngrx/signals';
import { ApiService } from '../core/api.service';
import type { User } from '@github-trending/shared/models';

interface AuthStateModel {
  user: User | null;
  isLoading: boolean;
}

const initialState: AuthStateModel = {
  user: null,
  isLoading: true,
};

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    isAuthenticated: computed(() => !!store.user()),
  })),
  withMethods((store) => {
    const api = inject(ApiService);
    return {
      async loadUser(): Promise<void> {
        patchState(store, { isLoading: true });
        try {
          const res = await firstValueFrom(api.getMe());
          patchState(store, { user: res.user ?? null, isLoading: false });
        } catch {
          patchState(store, { user: null, isLoading: false });
        }
      },
      login(returnUrl = '/trending'): void {
        window.location.href = `/api/auth/github?returnUrl=${encodeURIComponent(returnUrl)}`;
      },
      async logout(): Promise<void> {
        await firstValueFrom(api.logout());
        patchState(store, { user: null });
        window.location.href = '/trending';
      },
    };
  })
);
