import { inject } from '@angular/core';
import {
  signalStore,
  withState,
  withMethods,
  patchState,
} from '@ngrx/signals';
import { ApiService } from '../core/api.service';
import { AuthStore } from './auth.store';
import type {
  TrendingFilterPresetDto,
  TrendingFiltersSnapshot,
} from '@github-trending/shared/models';

const LS_KEY = 'github-trending-filter-presets';

function readLocal(): TrendingFilterPresetDto[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocal(presets: TrendingFilterPresetDto[]) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(LS_KEY, JSON.stringify(presets));
}

interface PresetsState {
  presets: TrendingFilterPresetDto[];
  loading: boolean;
}

const initial: PresetsState = {
  presets: [],
  loading: false,
};

export const PresetsStore = signalStore(
  { providedIn: 'root' },
  withState(initial),
  withMethods((store) => {
    const api = inject(ApiService);
    const auth = inject(AuthStore);
    return {
      async load() {
        patchState(store, { loading: true });
        try {
          if (auth.isAuthenticated()) {
            const res = await api.getPresets().toPromise();
            patchState(store, {
              presets: res?.presets ?? [],
              loading: false,
            });
          } else {
            patchState(store, { presets: readLocal(), loading: false });
          }
        } catch {
          patchState(store, { presets: readLocal(), loading: false });
        }
      },
      async savePreset(name: string, filters: TrendingFiltersSnapshot) {
        if (auth.isAuthenticated()) {
          try {
            const res = await api.createPreset(name, filters).toPromise();
            if (res?.preset) {
              patchState(store, {
                presets: [res.preset, ...store.presets()],
              });
            }
          } catch {
            // ignore
          }
        } else {
          const preset: TrendingFilterPresetDto = {
            id: Date.now(),
            name,
            filters,
          };
          const next = [preset, ...store.presets()];
          patchState(store, { presets: next });
          writeLocal(next);
        }
      },
      async deletePreset(id: number) {
        if (auth.isAuthenticated()) {
          try {
            await api.deletePreset(id).toPromise();
            patchState(store, {
              presets: store.presets().filter((p) => p.id !== id),
            });
          } catch {
            // ignore
          }
        } else {
          const next = store.presets().filter((p) => p.id !== id);
          patchState(store, { presets: next });
          writeLocal(next);
        }
      },
    };
  })
);
