import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { LucideAngularModule, Flame, ShoppingCart, Search, User, X, ListPlus } from 'lucide-angular';
import { CartService } from '../../../core/services/cart.service';
import { CustomerAuthService } from '../../../core/services/customer-auth.service';
import { SearchComponent } from '../../search/search.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, SearchComponent],
  templateUrl: './header.html',
  // The sticky offset lives on the host, not on the inner <header>: a sticky
  // element can only travel inside its parent's box, and <app-header> is
  // exactly as tall as the bar itself, so sticking it there pins nothing.
  // The host is a flex item of the full-height storefront column instead.
  host: { class: 'sticky top-0 z-40' },
})
export class Header {
  readonly cartService = inject(CartService);
  readonly customerAuthService = inject(CustomerAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly injector = inject(Injector);
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly FlameIcon = Flame;
  readonly ShoppingCartIcon = ShoppingCart;
  readonly SearchIcon = Search;
  readonly UserIcon = User;
  readonly XIcon = X;
  readonly ListPlusIcon = ListPlus;

  /** The search that is actually applied, per the URL — not what is being typed. */
  private readonly activeQuery = toSignal(
    this.route.queryParamMap.pipe(map((params) => (params.get('q') ?? '').trim())),
    { initialValue: '' },
  );

  readonly searchOpen = signal(false);

  constructor() {
    // A results page reached by any route (deep link, back/forward, "see all
    // results") should leave the search affordance open rather than collapsed.
    effect(() => {
      if (this.activeQuery()) {
        this.searchOpen.set(true);
      }
    });
  }

  toggleSearch(): void {
    if (this.searchOpen()) {
      this.closeSearch();
      return;
    }
    this.searchOpen.set(true);
    // `autofocus` only fires on initial document load, never on an element
    // Angular inserts later.
    afterNextRender(() => this.focusSearchInput(), { injector: this.injector });
  }

  /** Collapse the box once a search result has been opened. */
  onSearchNavigated(): void {
    this.searchOpen.set(false);
  }

  private closeSearch(): void {
    this.searchOpen.set(false);
    if (this.activeQuery()) {
      // Drop `q` while preserving the current path and any other params.
      const tree = this.router.parseUrl(this.router.url);
      const { q: _dropped, ...rest } = tree.queryParams;
      tree.queryParams = rest;
      this.router.navigateByUrl(tree);
    }
  }

  private focusSearchInput(): void {
    // Desktop and mobile instances are both in the DOM; only one is laid out.
    const inputs = this.hostRef.nativeElement.querySelectorAll<HTMLInputElement>('app-search input');
    for (const input of Array.from(inputs)) {
      if (input.offsetParent !== null) {
        input.focus();
        return;
      }
    }
  }
}
