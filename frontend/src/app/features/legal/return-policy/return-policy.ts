import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../../../core/services/catalog.service';

@Component({
  selector: 'app-return-policy',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './return-policy.html',
})
export class ReturnPolicy {
  readonly catalogService = inject(CatalogService);
}
