import {
  HttpContextToken,
  HttpEvent,
  HttpInterceptorFn,
  HttpResponse,
} from '@angular/common/http';
import { of, tap } from 'rxjs';

import { API_BASE_URL } from '../api.base-url';

const CACHE_PREFIX = 'sheno.cache:';
const TTL_MS = 30_000;

interface CacheEntry {
  storedAt: number;
  body: unknown;
}

/** Mark a request to bypass the cache (used by the Refresh/Retry buttons). */
export const BYPASS_CACHE = new HttpContextToken<boolean>(() => false);

const session = (): Storage | null =>
  typeof sessionStorage === 'undefined' ? null : sessionStorage;

const isApiGet = (request: { method: string; url: string }): boolean =>
  request.method === 'GET' && request.url.startsWith(API_BASE_URL);

export const clearApiCache = (): void => {
  const store = session();

  if (store === null) {
    return;
  }

  for (let index = store.length - 1; index >= 0; index -= 1) {
    const key = store.key(index);

    if (key !== null && key.startsWith(CACHE_PREFIX)) {
      store.removeItem(key);
    }
  }
};

/**
 * Caches API GET responses in sessionStorage for a short window so revisits
 * and refreshes show data instantly instead of waiting on the API's round
 * trip to the database. A successful cache hit bypasses the network entirely;
 * any non-GET request invalidates the whole cache because a write can change
 * what any GET would return. `BYPASS_CACHE` opts out of the cache for the
 * explicit Refresh/Retry buttons.
 */
export const apiCacheInterceptor: HttpInterceptorFn = (request, next) => {
  const store = session();

  if (store === null) {
    return next(request);
  }

  if (request.method !== 'GET') {
    return next(request).pipe(
      tap({
        next: () => clearApiCache(),
        error: () => clearApiCache(),
      })
    );
  }

  if (!isApiGet(request)) {
    return next(request);
  }

  const cacheKey = `${CACHE_PREFIX}${request.url}`;

  if (!request.context.get(BYPASS_CACHE)) {
    const raw = store.getItem(cacheKey);
    const entry = raw === null ? null : readEntry(raw);

    if (entry !== null && Date.now() - entry.storedAt < TTL_MS) {
      return of(new HttpResponse({ status: 200, body: entry.body, url: request.url }));
    }
  }

  return next(request).pipe(
    tap((event: HttpEvent<unknown>) => {
      if (event instanceof HttpResponse && event.status === 200) {
        const entry: CacheEntry = { storedAt: Date.now(), body: event.body };
        store.setItem(cacheKey, JSON.stringify(entry));
      }
    })
  );
};

const readEntry = (raw: string): CacheEntry | null => {
  try {
    const entry = JSON.parse(raw) as Partial<CacheEntry>;

    if (typeof entry.storedAt !== 'number' || !('body' in entry)) {
      return null;
    }

    return entry as CacheEntry;
  } catch {
    return null;
  }
};