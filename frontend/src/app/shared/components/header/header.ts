import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  effect,
  inject,
  signal,
  viewChildren,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Flame, ShoppingCart, Search, User, X } from 'lucide-angular';
import { CartService } from '../../../core/services/cart.service';
import { CustomerAuthService } from '../../../core/services/customer-auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, FormsModule],
  templateUrl: './header.html',
})
export class Header {
  readonly cartService = inject(CartService);
  readonly customerAuthService = inject(CustomerAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly injector = inject(Injector);

  readonly FlameIcon = Flame;
  readonly ShoppingCartIcon = ShoppingCart;
  readonly SearchIcon = Search;
  readonly UserIcon = User;
  readonly XIcon = X;

  private readonly searchInputs = viewChildren<ElementRef<HTMLInputElement>>('searchInput');

  /** The search that is actually applied, per the URL — not what is being typed. */
  private readonly activeQuery = toSignal(
    this.route.queryParamMap.pipe(map((params) => (params.get('q') ?? '').trim())),
    { initialValue: '' },
  );

  readonly searchOpen = signal(false);
  readonly searchTerm = signal('');

  constructor() {
    // Keep the box showing whatever search is in effect, so deep links and
    // browser back/forward don't leave an empty input contradicting the
    // "Results for ..." heading below it.
    effect(() => {
      const query = this.activeQuery();
      this.searchTerm.set(query);
      if (query) {
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

  submitSearch(): void {
    const q = this.searchTerm().trim();
    this.router.navigate(['/'], { queryParams: q ? { q } : {} });
  }

  private closeSearch(): void {
    this.searchOpen.set(false);
    this.searchTerm.set('');
    if (this.activeQuery()) {
      // Drop `q` while preserving the current path and any other params.
      const tree = this.router.parseUrl(this.router.url);
      const { q: _dropped, ...rest } = tree.queryParams;
      tree.queryParams = rest;
      this.router.navigateByUrl(tree);
    }
  }

  private focusSearchInput(): void {
    // Desktop and mobile inputs are both in the DOM; only one is laid out.
    const visible = this.searchInputs().find((input) => input.nativeElement.offsetParent !== null);
    visible?.nativeElement.focus();
  }
}
