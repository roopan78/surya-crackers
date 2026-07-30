import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { LucideAngularModule, Search, X, LoaderCircle, SearchX, Clock, Tag } from 'lucide-angular';
import { MIN_SEARCH_LENGTH, SearchService } from './search.service';
import {
  EMPTY_SEARCH_RESULTS,
  FlatSearchItem,
  HighlightSegment,
  SearchCategoryResult,
  SearchProductResult,
  SearchResults,
  toHighlightSegments,
} from './search.models';

/**
 * Reusable global typeahead across categories and products.
 *
 * Owns only presentation + interaction state; HTTP, caching and recent-search
 * persistence live in SearchService, so multiple instances can coexist (header
 * on desktop and on mobile, for example) without fighting over state.
 */
@Component({
  selector: 'app-search',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './search.component.html',
  styleUrl: './search.component.css',
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'close()',
    class: 'block relative',
  },
})
export class SearchComponent {
  private readonly searchService = inject(SearchService);
  private readonly router = inject(Router);
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /** Placeholder is configurable so the same component fits different surfaces. */
  readonly placeholder = input('Search fireworks…');
  /** Emitted after a result is opened, so a host (e.g. the header) can collapse itself. */
  readonly navigated = output<void>();

  readonly SearchIcon = Search;
  readonly XIcon = X;
  readonly LoaderIcon = LoaderCircle;
  readonly SearchXIcon = SearchX;
  readonly ClockIcon = Clock;
  readonly TagIcon = Tag;

  private readonly inputRef = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  private readonly listRef = viewChild<ElementRef<HTMLElement>>('resultsList');

  readonly term = signal('');
  readonly open = signal(false);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly results = signal<SearchResults>(EMPTY_SEARCH_RESULTS);
  readonly activeIndex = signal(-1);

  readonly recentSearches = this.searchService.recentSearches;
  readonly popularCategories = signal<SearchCategoryResult[]>([]);

  readonly MIN_SEARCH_LENGTH = MIN_SEARCH_LENGTH;

  private readonly termChanges = new Subject<string>();

  /** True once the user has typed enough for the query to be live. */
  readonly isQueryActive = computed(() => this.term().trim().length >= MIN_SEARCH_LENGTH);

  readonly hasResults = computed(
    () => this.results().categories.length > 0 || this.results().products.length > 0,
  );

  /** Recents/popular replace results only while the box is empty. */
  readonly showSuggestions = computed(() => this.term().trim().length === 0);

  readonly showEmptyState = computed(
    () => this.isQueryActive() && !this.loading() && !this.failed() && !this.hasResults(),
  );

  /** Single index space over both groups, for arrow keys and aria-activedescendant. */
  readonly flatItems = computed<FlatSearchItem[]>(() => {
    const { categories, products } = this.results();
    return [
      ...categories.map<FlatSearchItem>((category) => ({
        kind: 'category',
        domId: `search-opt-category-${category.id}`,
        routerLink: ['/category', category.slug],
        category,
      })),
      ...products.map<FlatSearchItem>((product) => ({
        kind: 'product',
        domId: `search-opt-product-${product.id}`,
        routerLink: ['/product', product.slug],
        product,
      })),
    ];
  });

  readonly activeDescendantId = computed(() => {
    const items = this.flatItems();
    const index = this.activeIndex();
    return index >= 0 && index < items.length ? items[index].domId : null;
  });

  /** Offset of the products group within the flat list, for per-row index lookup. */
  readonly productIndexOffset = computed(() => this.results().categories.length);

  constructor() {
    this.termChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap((term) => {
          // Reset per-keystroke UI state before the request is even issued, so a
          // stale "no results" never sits under a query that is now in flight.
          this.failed.set(false);
          this.activeIndex.set(-1);
          const active = term.trim().length >= MIN_SEARCH_LENGTH;
          this.loading.set(active);
          if (!active) {
            this.results.set(EMPTY_SEARCH_RESULTS);
          }
        }),
        // switchMap drops the in-flight request whenever a newer term arrives.
        switchMap((term) => {
          if (term.trim().length < MIN_SEARCH_LENGTH) {
            return of(EMPTY_SEARCH_RESULTS);
          }
          return this.searchService.search(term).pipe(
            catchError(() => {
              this.failed.set(true);
              return of(EMPTY_SEARCH_RESULTS);
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((results) => {
        this.results.set(results);
        this.loading.set(false);
      });
  }

  onInput(value: string): void {
    this.term.set(value);
    this.open.set(true);
    this.termChanges.next(value);
  }

  onFocus(): void {
    this.open.set(true);
    if (this.showSuggestions() && this.popularCategories().length === 0) {
      this.loadPopularCategories();
    }
  }

  clear(): void {
    this.term.set('');
    this.results.set(EMPTY_SEARCH_RESULTS);
    this.failed.set(false);
    this.loading.set(false);
    this.activeIndex.set(-1);
    this.termChanges.next('');
    this.focusInput();
  }

  close(): void {
    this.open.set(false);
    this.activeIndex.set(-1);
  }

  onKeydown(event: KeyboardEvent): void {
    const items = this.flatItems();

    switch (event.key) {
      case 'ArrowDown':
        if (items.length > 0) {
          event.preventDefault();
          this.open.set(true);
          this.moveActive(1, items.length);
        }
        break;
      case 'ArrowUp':
        if (items.length > 0) {
          event.preventDefault();
          this.moveActive(-1, items.length);
        }
        break;
      case 'Enter': {
        event.preventDefault();
        const index = this.activeIndex();
        if (index >= 0 && index < items.length) {
          this.openItem(items[index]);
        } else {
          this.submitFreeText();
        }
        break;
      }
      case 'Escape':
        this.close();
        break;
      default:
        break;
    }
  }

  openCategory(category: SearchCategoryResult): void {
    this.commitSearchTerm();
    this.router.navigate(['/category', category.slug]);
    this.finishNavigation();
  }

  openProduct(product: SearchProductResult): void {
    this.commitSearchTerm();
    this.router.navigate(['/product', product.slug]);
    this.finishNavigation();
  }

  /** Re-runs a stored term immediately, bypassing the debounce. */
  runRecentSearch(term: string): void {
    this.runSearchNow(term);
    this.focusInput();
  }

  clearRecentSearches(): void {
    this.searchService.clearRecentSearches();
  }

  retry(): void {
    const term = this.term();
    if (term.trim().length >= MIN_SEARCH_LENGTH) {
      this.runSearchNow(term);
    }
  }

  /** Shared immediate-search path for recents and retry — skips the debounce. */
  private runSearchNow(term: string): void {
    this.term.set(term);
    this.open.set(true);
    this.failed.set(false);
    this.activeIndex.set(-1);
    this.loading.set(true);
    this.searchService
      .search(term)
      .pipe(
        catchError(() => {
          this.failed.set(true);
          return of(EMPTY_SEARCH_RESULTS);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((results) => {
        this.results.set(results);
        this.loading.set(false);
      });
  }

  highlight(text: string): HighlightSegment[] {
    return toHighlightSegments(text, this.term());
  }

  onDocumentClick(event: MouseEvent): void {
    if (!this.hostRef.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  private moveActive(delta: number, length: number): void {
    const next = (this.activeIndex() + delta + length) % length;
    this.activeIndex.set(next);
    this.scrollActiveIntoView(next);
  }

  private scrollActiveIntoView(index: number): void {
    const list = this.listRef()?.nativeElement;
    const option = list?.querySelectorAll<HTMLElement>('[role="option"]')[index];
    option?.scrollIntoView({ block: 'nearest' });
  }

  private openItem(item: FlatSearchItem): void {
    if (item.kind === 'category' && item.category) {
      this.openCategory(item.category);
      return;
    }
    if (item.product) {
      this.openProduct(item.product);
    }
  }

  /** Enter with nothing highlighted falls back to the full results page. */
  private submitFreeText(): void {
    const term = this.term().trim();
    if (term.length < MIN_SEARCH_LENGTH) {
      return;
    }
    this.commitSearchTerm();
    this.router.navigate(['/'], { queryParams: { q: term } });
    this.finishNavigation();
  }

  private commitSearchTerm(): void {
    this.searchService.addRecentSearch(this.term());
  }

  private finishNavigation(): void {
    this.close();
    this.inputRef()?.nativeElement.blur();
    this.navigated.emit();
  }

  private focusInput(): void {
    this.inputRef()?.nativeElement.focus();
  }

  private loadPopularCategories(): void {
    this.searchService
      .popularCategories()
      .pipe(
        catchError(() => of([])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((categories) => this.popularCategories.set(categories));
  }
}
