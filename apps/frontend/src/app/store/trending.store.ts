import { computed, inject } from '@angular/core';
import {
  signalStore,
  withState,
  withComputed,
  withMethods,
  patchState,
} from '@ngrx/signals';
import { ApiService } from '../core/api.service';
import type {
  GitHubRepo,
  DateRange,
  RepoSortField,
  SortOrder,
  TrendingViewMode,
} from '@github-trending/shared/models';

interface TrendingStateModel {
  repos: GitHubRepo[];
  totalCount: number;
  language: string | null;
  topics: string[];
  dateRange: DateRange;
  searchQuery: string;
  sortBy: RepoSortField;
  order: SortOrder;
  page: number;
  perPage: number;
  viewMode: TrendingViewMode;
  loading: boolean;
  loadingMore: boolean;
  starredRepoIds: Set<number>;
}

const initialState: TrendingStateModel = {
  repos: [],
  totalCount: 0,
  language: null,
  topics: [],
  dateRange: 'weekly',
  searchQuery: '',
  sortBy: 'stars',
  order: 'desc',
  page: 1,
  perPage: 30,
  viewMode: 'default',
  loading: false,
  loadingMore: false,
  starredRepoIds: new Set(),
};

export const TrendingStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    hasMore: computed(
      () =>
        store.totalCount() > 0 && store.repos().length < store.totalCount()
    ),
  })),
  withMethods((store) => {
    const api = inject(ApiService);
    const fetchParams = () => ({
      language: store.language(),
      topics: store.topics(),
      dateRange: store.dateRange(),
      q: store.searchQuery(),
      sort: store.sortBy(),
      order: store.order(),
      perPage: store.perPage(),
      viewMode: store.viewMode(),
    });
    return {
      async loadRepos() {
        patchState(store, { loading: true, page: 1 });
        try {
          const res = await api
            .getTrending({
              ...fetchParams(),
              page: 1,
            })
            .toPromise();
          if (res) {
            patchState(store, {
              repos: res.repos,
              totalCount: res.totalCount,
              page: 1,
              loading: false,
              loadingMore: false,
            });
          }
        } catch {
          patchState(store, { loading: false });
        }
      },
      async loadMore() {
        if (
          store.loading() ||
          store.loadingMore() ||
          !store.hasMore()
        ) {
          return;
        }
        const nextPage = store.page() + 1;
        patchState(store, { loadingMore: true });
        try {
          const res = await api
            .getTrending({
              ...fetchParams(),
              page: nextPage,
            })
            .toPromise();
          if (res) {
            patchState(store, {
              repos: [...store.repos(), ...res.repos],
              totalCount: res.totalCount,
              page: nextPage,
              loadingMore: false,
            });
          } else {
            patchState(store, { loadingMore: false });
          }
        } catch {
          patchState(store, { loadingMore: false });
        }
      },
      setLanguage(language: string | null) {
        patchState(store, { language, page: 1 });
      },
      setTopics(topics: string[]) {
        patchState(store, { topics, page: 1 });
      },
      setDateRange(dateRange: DateRange) {
        patchState(store, { dateRange, page: 1 });
      },
      setSearchQuery(searchQuery: string) {
        patchState(store, { searchQuery, page: 1 });
      },
      setSort(sortBy: RepoSortField, order: SortOrder) {
        patchState(store, { sortBy, order, page: 1 });
      },
      setViewMode(viewMode: TrendingViewMode) {
        patchState(store, { viewMode, page: 1 });
      },
      setPage(page: number) {
        patchState(store, { page });
      },
      markStarred(repoId: number) {
        const ids = new Set(store.starredRepoIds());
        ids.add(repoId);
        patchState(store, { starredRepoIds: ids });
      },
      markUnstarred(repoId: number) {
        const ids = new Set(store.starredRepoIds());
        ids.delete(repoId);
        patchState(store, { starredRepoIds: ids });
      },
      loadStarredIds(ids: number[]) {
        patchState(store, { starredRepoIds: new Set(ids) });
      },
    };
  })
);
