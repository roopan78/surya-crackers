import { AfterViewInit, Directive, ElementRef, OnDestroy, inject } from '@angular/core';

/**
 * Adds `data-reveal` + toggles `.is-revealed` (see styles.css) the first
 * time an element scrolls into view — a lightweight fade/slide-in used
 * across the storefront instead of pulling in an animation library.
 * Unobserves after the first reveal so it never re-triggers on scroll-back.
 */
@Directive({
  selector: '[appScrollReveal]',
  standalone: true,
  host: { '[attr.data-reveal]': "''" },
})
export class ScrollRevealDirective implements AfterViewInit, OnDestroy {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;

  ngAfterViewInit(): void {
    const element = this.elementRef.nativeElement;

    if (typeof IntersectionObserver === 'undefined') {
      element.classList.add('is-revealed');
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            element.classList.add('is-revealed');
            this.observer?.unobserve(element);
          }
        }
      },
      { threshold: 0.15 },
    );
    this.observer.observe(element);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
