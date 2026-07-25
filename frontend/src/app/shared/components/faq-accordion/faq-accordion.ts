import { Component, signal } from '@angular/core';
import { LucideAngularModule, ChevronDown } from 'lucide-angular';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';

interface FaqItem {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-faq-accordion',
  standalone: true,
  imports: [LucideAngularModule, ScrollRevealDirective],
  templateUrl: './faq-accordion.html',
})
export class FaqAccordion {
  readonly ChevronDownIcon = ChevronDown;

  readonly openIndex = signal<number | null>(0);

  readonly faqs: FaqItem[] = [
    {
      question: 'How do I place an order?',
      answer:
        'Browse the catalog, add items to your cart, and fill in your delivery details at checkout. Confirming the order sends it straight to us over WhatsApp along with a clean, itemized invoice.',
    },
    {
      question: 'Is there a minimum age to purchase?',
      answer:
        'Yes — firecrackers are a regulated, age-restricted product. You must confirm you are 18 or older before browsing the store, and all purchases are intended for adult use and supervision only.',
    },
    {
      question: 'How and when will my order be delivered?',
      answer:
        'We confirm your target delivery date over WhatsApp after you place your order, and pack every item securely to prevent damage in transit. Delivery windows are busiest close to festival dates, so ordering early is recommended.',
    },
    {
      question: 'Are your products licensed and safe?',
      answer:
        'All products are sourced from licensed manufacturers and come with printed safety instructions. Our own license number is listed in the footer of this site for verification.',
    },
    {
      question: 'Can I modify or cancel an order after confirming?',
      answer:
        'Since orders are confirmed directly over WhatsApp, just message us there as soon as possible with your order details and we will do our best to accommodate changes before dispatch.',
    },
  ];

  toggle(index: number): void {
    this.openIndex.set(this.openIndex() === index ? null : index);
  }
}
