import { Component, inject } from '@angular/core';
import { CatalogService } from '../../../core/services/catalog.service';
import { SeoService } from '../../../core/services/seo.service';

@Component({
  selector: 'app-refund-policy',
  standalone: true,
  templateUrl: './refund-policy.html',
})
export class RefundPolicy {
  readonly catalogService = inject(CatalogService);

  constructor() {
    inject(SeoService).update({
      title: 'Refund Policy | Surya Crackers',
      description:
        'Read the Surya Crackers refund policy — when refunds apply and how to request one. Contact us for help with your order.',
      path: '/refund-policy',
    });
  }
}
