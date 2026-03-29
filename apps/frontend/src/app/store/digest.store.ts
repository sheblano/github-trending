import { inject } from '@angular/core';
import {
  signalStore,
  withState,
  withMethods,
  patchState,
} from '@ngrx/signals';
import { ApiService } from '../core/api.service';
import { AuthStore } from './auth.store';
import type { DigestResponse } from '@github-trending/shared/models';

interface DigestState {
  digest: DigestResponse | null;
  loading: boolean;
}

const initial: DigestState = {
  digest: null,
  loading: false,
};

export const DigestStore = signalStore(
  { providedIn: 'root' },
  withState(initial),
  withMethods((store) => {
    const api = inject(ApiService);
    const auth = inject(AuthStore);
    return {
      async load() {
        if (!auth.isAuthenticated()) {
          patchState(store, { digest: null, loading: false });
          return;
        }
        patchState(store, { loading: true });
        try {
          const d = await api.getDigest().toPromise();
          patchState(store, { digest: d ?? null, loading: false });
        } catch {
          patchState(store, { loading: false });
        }
      },
      async markSeen() {
        if (!auth.isAuthenticated()) return;
        try {
          await api.markDigestSeen().toPromise();
          const d = store.digest();
          if (d) {
            patchState(store, { digest: { ...d, hasUnseen: false } });
          }
        } catch {
          // ignore
        }
      },
    };
  })
);
