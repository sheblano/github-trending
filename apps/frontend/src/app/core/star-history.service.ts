import { Injectable, inject } from '@angular/core';
import { Observable, of, shareReplay } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import type { StarHistoryPoint } from '@github-trending/shared/models';

@Injectable({ providedIn: 'root' })
export class StarHistoryService {
  private api = inject(ApiService);
  private cache = new Map<string, Observable<StarHistoryPoint[]>>();

  getHistory(owner: string, name: string): Observable<StarHistoryPoint[]> {
    const key = `${owner}/${name}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const obs$ = this.api.getStarHistory(owner, name).pipe(
      map((res) => res.history ?? []),
      catchError(() => of([])),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.cache.set(key, obs$);
    return obs$;
  }
}
