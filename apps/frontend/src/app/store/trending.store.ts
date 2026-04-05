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
import type {
  GitHubRepo,
  DateRange,
  RepoSortField,
  SortOrder,
  TrendingViewMode,
  TopicMatchMode,
} from '@github-trending/shared/models';

interface TrendingStateModel {
  repos: GitHubRepo[];
  totalCount: number;
  language: string | null;
  topics: string[];
  topicMatchMode: TopicMatchMode;
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
  topicMatchMode: 'or',
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
      topicMatchMode: store.topicMatchMode(),
      dateRange: store.dateRange(),
      q: store.searchQuery(),
      sort: store.sortBy(),
      order: store.order(),
      perPage: store.perPage(),
      viewMode: store.viewMode(),
    });
    return {
      async loadRepos(): Promise<void> {
        patchState(store, { loading: true, page: 1 });
        try {
          const res = await firstValueFrom(
            api.getTrending({
              ...fetchParams(),
              page: 1,
            })
          );
          patchState(store, {
            repos: res.repos,
            totalCount: res.totalCount,
            page: 1,
            loading: false,
            loadingMore: false,
          });
        } catch {
          patchState(store, { loading: false });
        }
      },
      async loadMore(): Promise<void> {
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
          const res = await firstValueFrom(
            api.getTrending({
              ...fetchParams(),
              page: nextPage,
            })
          );
          patchState(store, {
            repos: [...store.repos(), ...res.repos],
            totalCount: res.totalCount,
            page: nextPage,
            loadingMore: false,
          });
        } catch {
          patchState(store, { loadingMore: false });
        }
      },
      setLanguage(language: string | null): void {
        patchState(store, { language, page: 1 });
      },
      setTopics(topics: string[]): void {
        patchState(store, { topics, page: 1 });
      },
      setTopicMatchMode(topicMatchMode: TopicMatchMode): void {
        patchState(store, { topicMatchMode, page: 1 });
      },
      setDateRange(dateRange: DateRange): void {
        patchState(store, { dateRange, page: 1 });
      },
      setSearchQuery(searchQuery: string): void {
        patchState(store, { searchQuery, page: 1 });
      },
      setSort(sortBy: RepoSortField, order: SortOrder): void {
        patchState(store, { sortBy, order, page: 1 });
      },
      setViewMode(viewMode: TrendingViewMode): void {
        patchState(store, { viewMode, page: 1 });
      },
      setPage(page: number): void {
        patchState(store, { page });
      },
      markStarred(repoId: number): void {
        const ids = new Set(store.starredRepoIds());
        ids.add(repoId);
        patchState(store, { starredRepoIds: ids });
      },
      markUnstarred(repoId: number): void {
        const ids = new Set(store.starredRepoIds());
        ids.delete(repoId);
        patchState(store, { starredRepoIds: ids });
      },
      loadStarredIds(ids: number[]): void {
        patchState(store, { starredRepoIds: new Set(ids) });
      },
    };
  })
);
