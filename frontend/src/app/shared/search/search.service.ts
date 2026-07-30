import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSuccess } from '../../core/models';
import { SearchCategoryResult, SearchResults } from './search.models';

/** Below this the dropdown shows recents/popular instead of querying. */
export const MIN_SEARCH_LENGTH = 2;
const RECENT_SEARCHES_KEY = 'surya-recent-searches';
const MAX_RECENT_SEARCHES = 5;
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  results: SearchResults;
  expiresAt: number;
}

/**
 * Owns everything the search UI needs that is not rendering: the HTTP calls, a
 * short-lived response cache, and the recent-search history. Keeping this out
 * of the component is what makes the component reusable in more than one place
 * without duplicating state.
 */
@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly http = inject(HttpClient);

  private readonly cache = new Map<string, CacheEntry>();
  private popularCategories$?: Observable<SearchCategoryResult[]>;

  private readonly recentSearchesSignal = signal<string[]>(this.readRecentSearches());
  readonly recentSearches = this.recentSearchesSignal.asReadonly();

  /**
   * Cached per normalized term for 5 minutes. Returning `of(...)` on a hit keeps
   * the caller's `switchMap` pipeline identical for cached and live responses.
   */
  search(term: string): Observable<SearchResults> {
    const key = term.trim().toLowerCase();
    const cached = this.cache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      return of(cached.results);
    }
    // Expired: drop it now rather than leaving stale entries to accumulate.
    if (cached) {
      this.cache.delete(key);
    }

    return this.http
      .get<ApiSuccess<SearchResults>>(`${environment.apiUrl}/search`, {
        params: new HttpParams().set('q', term.trim()),
      })
      .pipe(
        map((response) => response.data),
        tap((results) => this.cache.set(key, { results, expiresAt: Date.now() + CACHE_TTL_MS })),
      );
  }

  /** Static for a session — fetched once and replayed to every subscriber. */
  popularCategories(): Observable<SearchCategoryResult[]> {
    this.popularCategories$ ??= this.http
      .get<ApiSuccess<SearchCategoryResult[]>>(`${environment.apiUrl}/search/popular-categories`)
      .pipe(
        map((response) => response.data),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    return this.popularCategories$;
  }

  /** Newest first, de-duplicated case-insensitively, capped at 5. */
  addRecentSearch(term: string): void {
    const value = term.trim();
    if (value.length < MIN_SEARCH_LENGTH) {
      return;
    }

    const next = [
      value,
      ...this.recentSearchesSignal().filter((entry) => entry.toLowerCase() !== value.toLowerCase()),
    ].slice(0, MAX_RECENT_SEARCHES);

    this.recentSearchesSignal.set(next);
    this.writeRecentSearches(next);
  }

  clearRecentSearches(): void {
    this.recentSearchesSignal.set([]);
    this.writeRecentSearches([]);
  }

  private readRecentSearches(): string[] {
    try {
      const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (!raw) {
        return [];
      }
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((entry): entry is string => typeof entry === 'string').slice(0, MAX_RECENT_SEARCHES)
        : [];
    } catch {
      // Corrupt or unavailable storage must never break the search box.
      return [];
    }
  }

  private writeRecentSearches(entries: string[]): void {
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(entries));
    } catch {
      /* Private browsing / quota — recents are a convenience, not a requirement. */
    }
  }
}
