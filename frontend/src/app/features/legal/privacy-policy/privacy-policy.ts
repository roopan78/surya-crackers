import { Component, inject } from '@angular/core';
import { CatalogService } from '../../../core/services/catalog.service';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  templateUrl: './privacy-policy.html',
})
export class PrivacyPolicy {
  readonly catalogService = inject(CatalogService);
}
