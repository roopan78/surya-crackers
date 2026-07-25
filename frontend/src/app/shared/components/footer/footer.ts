import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, Flame, MapPin, Phone, ShieldCheck, Instagram, Facebook, MessageCircle } from 'lucide-angular';
import { CatalogService } from '../../../core/services/catalog.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [LucideAngularModule, RouterLink],
  templateUrl: './footer.html',
})
export class Footer {
  readonly catalogService = inject(CatalogService);

  readonly currentYear = new Date().getFullYear();

  readonly FlameIcon = Flame;
  readonly MapPinIcon = MapPin;
  readonly PhoneIcon = Phone;
  readonly ShieldCheckIcon = ShieldCheck;
  readonly InstagramIcon = Instagram;
  readonly FacebookIcon = Facebook;
  readonly MessageCircleIcon = MessageCircle;

  get whatsappLink(): string {
    const number = this.catalogService.footerConfig().whatsappNumber;
    return number ? `https://wa.me/${number}` : '#';
  }
}
