import { Component } from '@angular/core';
import { LucideAngularModule, Star, Quote } from 'lucide-angular';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';

interface Testimonial {
  name: string;
  location: string;
  quote: string;
  rating: number;
}

/** Placeholder testimonials — swap for real customer reviews when available. */
@Component({
  selector: 'app-testimonials',
  standalone: true,
  imports: [LucideAngularModule, ScrollRevealDirective],
  templateUrl: './testimonials.html',
})
export class Testimonials {
  readonly stars = [1, 2, 3, 4, 5];

  readonly StarIcon = Star;
  readonly QuoteIcon = Quote;

  readonly testimonials: Testimonial[] = [
    {
      name: 'Karthik R.',
      location: 'Chennai',
      quote: 'The gift box quality was outstanding and everything arrived well before Diwali. Ordering over WhatsApp made it so simple.',
      rating: 5,
    },
    {
      name: 'Meena S.',
      location: 'Madurai',
      quote: 'Loved the sparklers range — long-lasting and genuinely as bright as shown. Will be ordering again this season.',
      rating: 5,
    },
    {
      name: 'Arun P.',
      location: 'Bengaluru',
      quote: 'Great communication throughout and the safety instructions on every product gave real peace of mind for our family gathering.',
      rating: 4,
    },
  ];
}
