import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { LucideAngularModule, ShieldAlert, PackageCheck, ShoppingCart, ArrowLeft } from 'lucide-angular';
import { CatalogService } from '../../core/services/catalog.service';
import { CartService } from '../../core/services/cart.service';
import { QuantityStepper } from '../../shared/components/quantity-stepper/quantity-stepper';
import { YoutubeEmbedPipe } from '../../shared/pipes/youtube-embed.pipe';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, QuantityStepper, YoutubeEmbedPipe, TitleCasePipe],
  templateUrl: './product-detail.html',
})
export class ProductDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly catalogService = inject(CatalogService);
  private readonly cartService = inject(CartService);

  private readonly productId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
    { initialValue: '' },
  );

  readonly product = computed(() => this.catalogService.getProductById(this.productId()));
  readonly boxesToAdd = signal(1);
  readonly justAdded = signal(false);

  readonly ShieldAlertIcon = ShieldAlert;
  readonly PackageCheckIcon = PackageCheck;
  readonly ShoppingCartIcon = ShoppingCart;
  readonly ArrowLeftIcon = ArrowLeft;

  incrementBoxesToAdd(): void {
    this.boxesToAdd.update((n) => n + 1);
  }

  decrementBoxesToAdd(): void {
    this.boxesToAdd.update((n) => Math.max(1, n - 1));
  }

  addToCart(): void {
    const product = this.product();
    if (!product) {
      return;
    }
    this.cartService.addToCart(product, this.boxesToAdd());
    this.justAdded.set(true);
    setTimeout(() => this.justAdded.set(false), 2000);
  }
}
