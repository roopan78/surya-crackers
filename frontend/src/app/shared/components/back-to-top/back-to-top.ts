import { Component, DestroyRef, afterNextRender, inject, signal } from '@angular/core';
import { LucideAngularModule, ArrowUp } from 'lucide-angular';

/** How far down the page the button waits before showing itself. */
const REVEAL_AFTER_PX = 400;

/**
 * Floating "back to top" affordance for the storefront. The catalog, Quick
 * Order and the legal pages all run long on mobile, where getting back to the
 * navbar otherwise means a lot of thumb work.
 */
@Component({
  selector: 'app-back-to-top',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './back-to-top.html',
})
export class BackToTop {
  private readonly destroyRef = inject(DestroyRef);

  readonly ArrowUpIcon = ArrowUp;

  readonly visible = signal(false);

  constructor() {
    // Registered by hand rather than as a host listener: a passive listener
    // keeps scrolling smooth, and the signal only changes when the button
    // actually flips, so scrolling doesn't churn change detection.
    // (afterNextRender also keeps this off the SSR path — no window there.)
    afterNextRender(() => {
      const sync = () => this.visible.set(window.scrollY > REVEAL_AFTER_PX);
      sync();
      window.addEventListener('scroll', sync, { passive: true });
      this.destroyRef.onDestroy(() => window.removeEventListener('scroll', sync));
    });
  }

  jumpToTop(): void {
    // Explicitly instant: `html { scroll-behavior: smooth }` in styles.css
    // would otherwise animate the whole way back up, which is the scrolling
    // this button exists to skip.
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
}
