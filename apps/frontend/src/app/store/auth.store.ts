import { computed, inject } from '@angular/core';
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
      async loadUser() {
        patchState(store, { isLoading: true });
        try {
          const res = await api.getMe().toPromise();
          patchState(store, { user: res?.user ?? null, isLoading: false });
        } catch {
          patchState(store, { user: null, isLoading: false });
        }
      },
      login(returnUrl = '/trending') {
        window.location.href = `/api/auth/github?returnUrl=${encodeURIComponent(returnUrl)}`;
      },
      async logout() {
        await api.logout().toPromise();
        patchState(store, { user: null });
        window.location.href = '/trending';
      },
    };
  })
);
