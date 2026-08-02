import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';

export interface SeoPageMeta {
  /** Full document title, brand included. Keep ≤ 60 chars. */
  title: string;
  /** Meta description, ≤ 155 chars, with the primary keyword and a CTA. */
  description: string;
  keywords?: string;
  /** Site-relative path for the canonical URL (e.g. '/product/red-bijili'). */
  path?: string;
  /** Absolute image URL for social cards; falls back to the brand banner. */
  image?: string;
  type?: 'website' | 'product';
  /** Defaults to 'index,follow'; pass 'noindex,nofollow' etc. for private pages. */
  robots?: string;
}

const SITE_NAME = 'Surya Crackers';
// Placeholder brand card, consistent with the project's placehold.co convention —
// swap for a real 1200x630 brand banner when one exists.
const DEFAULT_OG_IMAGE = 'https://placehold.co/1200x630/E63946/FFFFFF/png?text=Surya+Crackers';

/**
 * Single home for per-page SEO: title, description/keywords/robots metas,
 * canonical link, Open Graph + Twitter cards, and JSON-LD structured data.
 * Every routed page calls update() so navigation never leaves stale metadata
 * behind; JSON-LD scripts are keyed by id so pages can add and remove their
 * own schemas without touching each other's.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  update(page: SeoPageMeta): void {
    const url = `${environment.siteUrl}${page.path ?? '/'}`;
    const image = page.image ?? DEFAULT_OG_IMAGE;

    this.title.setTitle(page.title);
    this.meta.updateTag({ name: 'description', content: page.description });
    this.meta.updateTag({ name: 'robots', content: page.robots ?? 'index,follow' });
    if (page.keywords) {
      this.meta.updateTag({ name: 'keywords', content: page.keywords });
    } else {
      this.meta.removeTag("name='keywords'");
    }

    this.setCanonical(url);

    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
    this.meta.updateTag({ property: 'og:title', content: page.title });
    this.meta.updateTag({ property: 'og:description', content: page.description });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:type', content: page.type ?? 'website' });

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: page.title });
    this.meta.updateTag({ name: 'twitter:description', content: page.description });
    this.meta.updateTag({ name: 'twitter:image', content: image });
  }

  /** Insert/replace a JSON-LD script keyed by id; pass null to remove it. */
  setJsonLd(id: string, schema: object | null): void {
    const attribute = `seo-jsonld-${id}`;
    const existing = this.document.head.querySelector(`script[data-id="${attribute}"]`);

    if (schema === null) {
      existing?.remove();
      return;
    }

    const script = existing ?? this.document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    script.setAttribute('data-id', attribute);
    script.textContent = JSON.stringify(schema);
    if (!existing) {
      this.document.head.appendChild(script);
    }
  }

  private setCanonical(url: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>("link[rel='canonical']");
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}
