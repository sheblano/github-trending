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

const STARRED_PER_PAGE = 20;
const RELEASES_PER_PAGE = 10;

interface StarredStateModel {
  starredRepos: FollowedRepoDto[];
  starredPage: number;
  starredHasMore: boolean;
  releaseFeeds: RepoReleaseFeed[];
  releasesPage: number;
  releasesHasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  releasesLoading: boolean;
  releasesLoadingMore: boolean;
}

const initialState: StarredStateModel = {
  starredRepos: [],
  starredPage: 0,
  starredHasMore: true,
  releaseFeeds: [],
  releasesPage: 0,
  releasesHasMore: true,
  loading: false,
  loadingMore: false,
  releasesLoading: false,
  releasesLoadingMore: false,
};

export const StarredStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => {
    const api = inject(ApiService);
    return {
      /** Initial load (page 1) — resets existing list */
      async loadStarred() {
        if (store.loading()) return;
        patchState(store, { loading: true, starredPage: 0, starredRepos: [], starredHasMore: true });
        try {
          const res = await api.getStarred(1, STARRED_PER_PAGE).toPromise();
          if (res) {
            patchState(store, {
              starredRepos: res.starred,
              starredPage: 1,
              starredHasMore: res.starred.length === STARRED_PER_PAGE && res.totalCount > STARRED_PER_PAGE,
              loading: false,
            });
          }
        } catch {
          patchState(store, { loading: false });
        }
      },

      /** Append next page */
      async loadMoreStarred() {
        if (store.loadingMore() || !store.starredHasMore()) return;
        const nextPage = store.starredPage() + 1;
        patchState(store, { loadingMore: true });
        try {
          const res = await api.getStarred(nextPage, STARRED_PER_PAGE).toPromise();
          if (res) {
            patchState(store, {
              starredRepos: [...store.starredRepos(), ...res.starred],
              starredPage: nextPage,
              starredHasMore: res.starred.length === STARRED_PER_PAGE &&
                (store.starredRepos().length + res.starred.length) < res.totalCount,
              loadingMore: false,
            });
          }
        } catch {
          patchState(store, { loadingMore: false });
        }
      },

      /** Initial load of releases (page 1) */
      async loadReleases() {
        if (store.releasesLoading()) return;
        patchState(store, { releasesLoading: true, releasesPage: 0, releaseFeeds: [], releasesHasMore: true });
        try {
          const res = await api.getReleases(1, RELEASES_PER_PAGE).toPromise();
          if (res) {
            patchState(store, {
              releaseFeeds: res.feeds,
              releasesPage: 1,
              releasesHasMore: res.feeds.length === RELEASES_PER_PAGE && res.totalCount > RELEASES_PER_PAGE,
              releasesLoading: false,
            });
          }
        } catch {
          patchState(store, { releasesLoading: false });
        }
      },

      /** Append next page of releases */
      async loadMoreReleases() {
        if (store.releasesLoadingMore() || !store.releasesHasMore()) return;
        const nextPage = store.releasesPage() + 1;
        patchState(store, { releasesLoadingMore: true });
        try {
          const res = await api.getReleases(nextPage, RELEASES_PER_PAGE).toPromise();
          if (res) {
            patchState(store, {
              releaseFeeds: [...store.releaseFeeds(), ...res.feeds],
              releasesPage: nextPage,
              releasesHasMore: res.feeds.length === RELEASES_PER_PAGE &&
                (store.releaseFeeds().length + res.feeds.length) < res.totalCount,
              releasesLoadingMore: false,
            });
          }
        } catch {
          patchState(store, { releasesLoadingMore: false });
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
