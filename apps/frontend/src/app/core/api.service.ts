import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  TrendingResponse,
  FollowedRepoDto,
  StarRequest,
  ReleaseFeedResponse,
  StarHistoryResponse,
  TrendingFilterPresetDto,
  TrendingFiltersSnapshot,
  DigestResponse,
  TimelineResponse,
  TrendingViewMode,
  DiscoveryResponse,
  TopMoversResponse,
} from '@github-trending/shared/models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  getMe(): Observable<{ user: { id: number; githubId: number; username: string; avatarUrl: string | null } | null }> {
    return this.http.get<any>('/api/auth/me');
  }

  logout(): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>('/api/auth/logout', {});
  }

  getTrending(filters: {
    language?: string | null;
    topics?: string[];
    dateRange?: string;
    q?: string;
    sort?: string;
    order?: string;
    page?: number;
    perPage?: number;
    viewMode?: TrendingViewMode;
  }): Observable<TrendingResponse> {
    let params = new HttpParams();
    if (filters.language) params = params.set('language', filters.language);
    if (filters.topics?.length) params = params.set('topics', filters.topics.join(','));
    if (filters.dateRange) params = params.set('dateRange', filters.dateRange);
    if (filters.q) params = params.set('q', filters.q);
    if (filters.sort) params = params.set('sort', filters.sort);
    if (filters.order) params = params.set('order', filters.order);
    if (filters.page) params = params.set('page', String(filters.page));
    if (filters.perPage) params = params.set('perPage', String(filters.perPage));
    if (filters.viewMode && filters.viewMode !== 'default') {
      params = params.set('viewMode', filters.viewMode);
    }
    return this.http.get<TrendingResponse>('/api/repos/trending', { params });
  }

  getDiscovery(filters: {
    language?: string | null;
    topics?: string[];
    dateRange?: string;
    q?: string;
    sort?: string;
    order?: string;
    page?: number;
    perPage?: number;
  }): Observable<DiscoveryResponse> {
    let params = new HttpParams();
    if (filters.language) params = params.set('language', filters.language);
    if (filters.topics?.length) params = params.set('topics', filters.topics.join(','));
    if (filters.dateRange) params = params.set('dateRange', filters.dateRange);
    if (filters.q) params = params.set('q', filters.q);
    if (filters.sort) params = params.set('sort', filters.sort);
    if (filters.order) params = params.set('order', filters.order);
    if (filters.page) params = params.set('page', String(filters.page));
    if (filters.perPage) params = params.set('perPage', String(filters.perPage));
    return this.http.get<DiscoveryResponse>('/api/repos/discovery', { params });
  }

  getMovers(): Observable<TopMoversResponse> {
    return this.http.get<TopMoversResponse>('/api/movers');
  }

  getTimeline(filters?: {
    repo?: string;
    eventType?: string;
    since?: string;
    limit?: number;
  }): Observable<TimelineResponse> {
    let params = new HttpParams();
    if (filters?.repo) params = params.set('repo', filters.repo);
    if (filters?.eventType) params = params.set('eventType', filters.eventType);
    if (filters?.since) params = params.set('since', filters.since);
    if (filters?.limit != null) params = params.set('limit', String(filters.limit));
    return this.http.get<TimelineResponse>('/api/timeline', { params });
  }

  starRepo(data: StarRequest): Observable<{ followed: FollowedRepoDto }> {
    return this.http.post<{ followed: FollowedRepoDto }>('/api/repos/star', data);
  }

  unstarRepo(owner: string, name: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`/api/repos/star/${owner}/${name}`);
  }

  getStarred(): Observable<{ starred: FollowedRepoDto[] }> {
    return this.http.get<{ starred: FollowedRepoDto[] }>('/api/repos/starred');
  }

  getReleases(): Observable<ReleaseFeedResponse> {
    return this.http.get<ReleaseFeedResponse>('/api/releases');
  }

  updateNotes(repoId: number, notes: string | null): Observable<{ repo: FollowedRepoDto }> {
    return this.http.patch<{ repo: FollowedRepoDto }>(`/api/repos/starred/${repoId}/notes`, { notes });
  }

  getStarHistory(owner: string, name: string): Observable<StarHistoryResponse> {
    return this.http.get<StarHistoryResponse>(
      `/api/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/star-history`
    );
  }

  getReadme(owner: string, name: string): Observable<{ html: string; message?: string }> {
    return this.http.get<{ html: string; message?: string }>(
      `/api/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/readme`
    );
  }

  getPresets(): Observable<{ presets: TrendingFilterPresetDto[] }> {
    return this.http.get<{ presets: TrendingFilterPresetDto[] }>('/api/presets');
  }

  createPreset(
    name: string,
    filters: TrendingFiltersSnapshot
  ): Observable<{ preset: TrendingFilterPresetDto }> {
    return this.http.post<{ preset: TrendingFilterPresetDto }>('/api/presets', {
      name,
      filters,
    });
  }

  deletePreset(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`/api/presets/${id}`);
  }

  getDigest(): Observable<DigestResponse> {
    return this.http.get<DigestResponse>('/api/digest');
  }

  markDigestSeen(): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>('/api/digest/seen', {});
  }
}
