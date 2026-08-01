import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, Flame, MapPin, Phone, ShieldCheck, Instagram, Facebook, MessageCircle } from 'lucide-angular';
import { CatalogService } from '../../../core/services/catalog.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [LucideAngularModule, RouterLink],
  templateUrl: './footer.html',
})
export class Footer {
  readonly catalogService = inject(CatalogService);
  private readonly authService = inject(AuthService);

  /** Admin Login stays hidden from customers — only an active admin session reveals it. */
  readonly showAdminLink = computed(() => {
    const role = this.authService.currentUser()?.role;
    return role === 'ADMIN' || role === 'SUPER_ADMIN';
  });

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
