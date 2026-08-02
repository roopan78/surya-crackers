import { Component, inject } from '@angular/core';
import { CatalogService } from '../../../core/services/catalog.service';
import { SeoService } from '../../../core/services/seo.service';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  templateUrl: './privacy-policy.html',
})
export class PrivacyPolicy {
  readonly catalogService = inject(CatalogService);

  constructor() {
    inject(SeoService).update({
      title: 'Privacy Policy | Surya Crackers',
      description:
        'Learn how Surya Crackers collects, uses and protects your information when you shop crackers online. Read our privacy policy.',
      path: '/privacy-policy',
    });
  }
}
