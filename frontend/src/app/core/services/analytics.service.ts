import { Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { environment } from '../../../environments/environment';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

/**
 * Single home for Google Analytics (gtag.js) — the script is injected once at
 * startup from `environment.googleAnalyticsId`, so no template or page ever
 * embeds the snippet itself. Dev builds leave the id empty, which turns the
 * whole service into a no-op (local clicks never pollute production stats).
 *
 * SPA note: automatic page_view only fires on the initial full page load, so
 * router navigations are reported manually here (with `send_page_view: false`
 * to avoid double-counting the first view).
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly router = inject(Router);

  private initialized = false;

  init(): void {
    const measurementId = environment.googleAnalyticsId;
    if (!measurementId || this.initialized) {
      return;
    }
    this.initialized = true;

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer ?? [];
    window.gtag = function gtag() {
      // gtag.js expects the Arguments object itself on the dataLayer.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', measurementId, { send_page_view: false });

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        const path = event.urlAfterRedirects;
        // Admin workspace activity is staff traffic, not customer behaviour.
        if (path.startsWith('/admin')) {
          return;
        }
        window.gtag('event', 'page_view', {
          page_path: path,
          page_location: window.location.href,
          page_title: document.title,
        });
      });
  }

  /** Report a custom event (e.g. add_to_cart, purchase). No-op when analytics is disabled. */
  trackEvent(name: string, params: Record<string, unknown> = {}): void {
    if (!this.initialized) {
      return;
    }
    window.gtag('event', name, params);
  }
}
