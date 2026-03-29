import { inject } from '@angular/core';
import {
  signalStore,
  withState,
  withMethods,
  patchState,
} from '@ngrx/signals';
import { ApiService } from '../core/api.service';
import type {
  FollowedRepoDto,
  RepoReleaseFeed,
} from '@github-trending/shared/models';

interface StarredStateModel {
  starredRepos: FollowedRepoDto[];
  releaseFeeds: RepoReleaseFeed[];
  loading: boolean;
  releasesLoading: boolean;
}

const initialState: StarredStateModel = {
  starredRepos: [],
  releaseFeeds: [],
  loading: false,
  releasesLoading: false,
};

export const StarredStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => {
    const api = inject(ApiService);
    return {
      async loadStarred() {
        patchState(store, { loading: true });
        try {
          const res = await api.getStarred().toPromise();
          if (res) {
            patchState(store, { starredRepos: res.starred, loading: false });
          }
        } catch {
          patchState(store, { loading: false });
        }
      },
      async loadReleases() {
        patchState(store, { releasesLoading: true });
        try {
          const res = await api.getReleases().toPromise();
          if (res) {
            patchState(store, {
              releaseFeeds: res.feeds,
              releasesLoading: false,
            });
          }
        } catch {
          patchState(store, { releasesLoading: false });
        }
      },
      async updateNotes(repoId: number, notes: string | null) {
        try {
          await api.updateNotes(repoId, notes).toPromise();
          const repos = store.starredRepos().map((r) =>
            r.id === repoId ? { ...r, notes } : r
          );
          patchState(store, { starredRepos: repos });
        } catch {
          // silent fail
        }
      },
      async unstar(owner: string, name: string) {
        try {
          await api.unstarRepo(owner, name).toPromise();
          const repos = store
            .starredRepos()
            .filter((r) => !(r.owner === owner && r.name === name));
          patchState(store, { starredRepos: repos });
        } catch {
          // silent fail
        }
      },
    };
  })
);
