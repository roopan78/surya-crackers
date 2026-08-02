import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../../../core/services/catalog.service';
import { SeoService } from '../../../core/services/seo.service';

@Component({
  selector: 'app-return-policy',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './return-policy.html',
})
export class ReturnPolicy {
  readonly catalogService = inject(CatalogService);

  constructor() {
    inject(SeoService).update({
      title: 'Return Policy | Surya Crackers',
      description:
        'Read the Surya Crackers return policy for fireworks — why returns are limited, the exceptions, and how to cancel an order.',
      path: '/return-policy',
    });
  }
}
