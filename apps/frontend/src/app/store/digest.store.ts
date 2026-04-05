import { inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
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
      async load(): Promise<void> {
        if (!auth.isAuthenticated()) {
          patchState(store, { digest: null, loading: false });
          return;
        }
        patchState(store, { loading: true });
        try {
          const d = await firstValueFrom(api.getDigest());
          patchState(store, { digest: d, loading: false });
        } catch {
          patchState(store, { loading: false });
        }
      },
      async markSeen(): Promise<void> {
        if (!auth.isAuthenticated()) return;
        try {
          await firstValueFrom(api.markDigestSeen());
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
