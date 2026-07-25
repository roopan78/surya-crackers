import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../../../core/services/catalog.service';

@Component({
  selector: 'app-terms-and-conditions',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './terms-and-conditions.html',
})
export class TermsAndConditions {
  readonly catalogService = inject(CatalogService);
}
