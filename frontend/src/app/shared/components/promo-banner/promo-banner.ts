import { Component } from '@angular/core';
import { LucideAngularModule, Gift, ArrowRight } from 'lucide-angular';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';

@Component({
  selector: 'app-promo-banner',
  standalone: true,
  imports: [LucideAngularModule, ScrollRevealDirective],
  templateUrl: './promo-banner.html',
})
export class PromoBanner {
  readonly GiftIcon = Gift;
  readonly ArrowRightIcon = ArrowRight;
}
