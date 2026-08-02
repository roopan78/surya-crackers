import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../../../core/services/catalog.service';
import { SeoService } from '../../../core/services/seo.service';

@Component({
  selector: 'app-terms-and-conditions',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './terms-and-conditions.html',
})
export class TermsAndConditions {
  readonly catalogService = inject(CatalogService);

  constructor() {
    inject(SeoService).update({
      title: 'Terms & Conditions | Surya Crackers',
      description:
        'Read the Surya Crackers terms and conditions covering eligibility, orders, pricing and safe use before you shop online.',
      path: '/terms-and-conditions',
    });
  }
}
