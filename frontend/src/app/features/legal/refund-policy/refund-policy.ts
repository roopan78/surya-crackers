import { Component, inject } from '@angular/core';
import { CatalogService } from '../../../core/services/catalog.service';

@Component({
  selector: 'app-refund-policy',
  standalone: true,
  templateUrl: './refund-policy.html',
})
export class RefundPolicy {
  readonly catalogService = inject(CatalogService);
}
