import { Component, inject } from '@angular/core';
import { LucideAngularModule, Flame, MapPin, Phone, ShieldCheck } from 'lucide-angular';
import { CatalogService } from '../../../core/services/catalog.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './footer.html',
})
export class Footer {
  readonly catalogService = inject(CatalogService);

  readonly currentYear = new Date().getFullYear();

  readonly FlameIcon = Flame;
  readonly MapPinIcon = MapPin;
  readonly PhoneIcon = Phone;
  readonly ShieldCheckIcon = ShieldCheck;
}
