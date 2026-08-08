import { env } from '../config/env';

/**
 * IndexNow — pushes changed URLs to participating search engines (Bing,
 * Yandex, Seznam, Naver) instead of waiting to be crawled. Used when the
 * catalog changes so a deleted category or a new product is picked up
 * quickly rather than on the next crawl.
 *
 * Google does NOT participate in IndexNow, and it retired its own sitemap
 * ping in 2023 — for Google the levers are an accurate sitemap, noindex on
 * dead URLs, and time. This is deliberately fire-and-forget: search-engine
 * notification must never affect the outcome of an admin action.
 */

const ENDPOINT = 'https://api.indexnow.org/indexnow';
const REQUEST_TIMEOUT_MS = 5000;

export function isIndexNowConfigured(): boolean {
  return Boolean(env.INDEXNOW_KEY);
}

/** Absolute URL of the key file that proves ownership of the host. */
function keyLocation(): string {
  return `${env.PUBLIC_SITE_URL}/${env.INDEXNOW_KEY}.txt`;
}

async function post(urls: string[]): Promise<void> {
  const host = new URL(env.PUBLIC_SITE_URL).host;
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host, key: env.INDEXNOW_KEY, keyLocation: keyLocation(), urlList: urls }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  // 200 accepted, 202 accepted-pending-key-validation; anything else is worth seeing.
  const level = response.ok ? 'info' : 'warn';
  console[level](
    JSON.stringify({ scope: 'indexnow', status: response.status, count: urls.length, urls: urls.slice(0, 5) }),
  );
}

/**
 * Notify search engines that these site-relative paths changed. Never throws.
 */
export function submitPaths(paths: string[]): void {
  if (!isIndexNowConfigured() || paths.length === 0) {
    return;
  }
  const urls = [...new Set(paths)].map((path) => `${env.PUBLIC_SITE_URL}${path}`);

  void post(urls).catch((error) => {
    console.warn(
      JSON.stringify({ scope: 'indexnow', error: error instanceof Error ? error.message : String(error) }),
    );
  });
}
