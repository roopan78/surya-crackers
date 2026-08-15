import { Component, OnDestroy, inject, signal } from '@angular/core';
import { LucideAngularModule, ChevronDown } from 'lucide-angular';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';
import { SeoService } from '../../../core/services/seo.service';

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
export class FaqAccordion implements OnDestroy {
  private readonly seoService = inject(SeoService);

  readonly ChevronDownIcon = ChevronDown;

  readonly openIndex = signal<number | null>(0);

  readonly faqs: FaqItem[] = [
    {
      question: 'How do I place an order?',
      answer:
        'Browse the catalog, add items to your cart, and fill in your pickup details at checkout — no account required. No payment is taken online: your order is placed on hold, and our team calls you to confirm the items, your pickup time and how you can pay.',
    },
    {
      question: 'Is there a minimum age to purchase?',
      answer:
        'Yes — firecrackers are a regulated, age-restricted product. Sales are restricted to adults aged 18 and over, and all purchases are intended for adult use and supervision only.',
    },
    {
      question: 'Do you deliver, or is it pickup only?',
      answer:
        'This is pickup only — there is no home delivery. Choose a pickup date and time at checkout and collect your order in-store; we pack every item securely so it\'s ready the moment you arrive.',
    },
    {
      question: 'Are your products licensed and safe?',
      answer:
        'All products are sourced from licensed manufacturers and come with printed safety instructions. Our own license number is listed in the footer of this site for verification.',
    },
    {
      question: 'Can I modify or cancel an order after placing it?',
      answer:
        'Message us on WhatsApp with your order number as soon as possible and we will do our best to accommodate changes before your order is packed for pickup.',
    },
  ];

  constructor() {
    // FAQPage structured data mirrors the rendered accordion exactly.
    this.seoService.setJsonLd('faq', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: this.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    });
  }

  ngOnDestroy(): void {
    this.seoService.setJsonLd('faq', null);
  }

  toggle(index: number): void {
    this.openIndex.set(this.openIndex() === index ? null : index);
  }
}
