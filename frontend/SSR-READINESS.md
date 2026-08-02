# SSR / Prerender Readiness

Status as of 2026-08-02: the app is **ready for `ng add @angular/ssr`** with no
expected major refactoring. This file tracks what was prepared and what to
check during the actual migration.

## Already SSR-safe

| Area | Why it's safe |
| --- | --- |
| `SeoService` | Uses Angular `Title`/`Meta` + injected `DOCUMENT` only — no globals. |
| `AnalyticsService` | No-ops on the server (`isPlatformBrowser` guard); also no-ops when the GA id is empty. |
| `CartService` / `RecentlyViewedService` | `typeof localStorage` guards around every read/write. |
| `AuthServiceBase` (admin + customer) | Storage reads guarded; writes only happen inside user-triggered flows. |
| `SearchService` recents | All storage access wrapped in try/catch — server reads resolve to `[]`. |
| `ScrollRevealDirective` | `typeof IntersectionObserver` guard; falls back to instantly-revealed. |
| Product detail scroll-to-top | `typeof window` guard in the effect. |
| Order confirmation `history.state` | `typeof history` guard; server renders see `{}`. |
| Hero carousel autoplay, toasts, modals | Interval/DOM work starts from lifecycle hooks or user events, not module evaluation. |
| Structured data | Emitted via `SeoService.setJsonLd` (DOCUMENT-based), so it will render into server HTML for free. |

## Remaining blockers / decisions for the migration itself

1. **Google Sign-In script** (`accounts.google.com/gsi/client` in index.html and
   the `auth-form` component's use of the `google` global) — must stay
   browser-only; wrap its initialization in `afterNextRender` or an
   `isPlatformBrowser` guard when migrating.
2. **`HttpClient` state transfer** — enable `provideClientHydration(withHttpTransferCacheOptions(...))`
   so the catalog fetch isn't repeated on the client after hydration.
3. **Vercel output mode** — the project currently deploys `dist/frontend/browser`
   as a static site with a SPA rewrite. SSR needs the Vercel Angular preset (or
   prerender: keep static output, add `"prerender": true` route config). For
   this catalog size, **prerendering `/`, categories, products and policy pages
   at build time is likely the better first step** — no server runtime needed,
   and social scrapers (WhatsApp/Facebook) finally see per-page OG tags.
4. **Dynamic routes at prerender time** — product/category slugs must be fed to
   the prerenderer via `getPrerenderParams` (fetch from `/api/products`).
5. **`environment.siteUrl`** is already environment-driven; the canonical
   origin needs no change.

## Migration checklist

- [ ] `ng add @angular/ssr` (choose prerender-only first if server hosting is unwanted)
- [ ] Guard Google Sign-In init (`auth-form`) with `afterNextRender`
- [ ] Add `provideClientHydration()` and verify no hydration mismatch warnings
- [ ] Provide route params for `/product/:id` + `/category/:slug` prerendering
- [ ] Update `vercel.json` (remove SPA catch-all for prerendered routes)
- [ ] Re-run the SEO verification script on the rendered HTML (view-source must
      show per-page titles/OG/JSON-LD without JS)
- [ ] Validate WhatsApp/Facebook link previews per product page
