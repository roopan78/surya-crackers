import { Component } from '@angular/core';
import { LucideAngularModule, BadgeCheck, ShieldCheck, Truck } from 'lucide-angular';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';

interface Reason {
  icon: typeof BadgeCheck;
  title: string;
  description: string;
}

@Component({
  selector: 'app-why-choose-us',
  standalone: true,
  imports: [LucideAngularModule, ScrollRevealDirective],
  templateUrl: './why-choose-us.html',
})
export class WhyChooseUs {
  readonly reasons: Reason[] = [
    {
      icon: BadgeCheck,
      title: 'Premium Quality',
      description: 'Every product is sourced from licensed Sivakasi manufacturers and quality-checked before dispatch.',
    },
    {
      icon: ShieldCheck,
      title: 'Safety Certified',
      description: 'Fully compliant with explosives licensing regulations, with safety guidance on every product.',
    },
    {
      icon: Truck,
      title: 'Fast, Careful Delivery',
      description: 'Securely packed and delivered on your chosen date, with real-time updates over WhatsApp.',
    },
  ];
}
