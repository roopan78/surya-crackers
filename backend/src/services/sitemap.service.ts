import { prisma } from '../config/prisma';
import { env } from '../config/env';

/**
 * XML sitemap for the storefront, served on the primary domain via a Vercel
 * rewrite (suryacrackers.shop/sitemap.xml -> this API). URLs come from the
 * live database slugs (active products/categories only) plus the public
 * static routes — never admin, account, checkout or API paths.
 *
 * The rendered XML is cached in memory for a short window so crawlers don't
 * hammer Postgres; new products still appear within CACHE_TTL_MS.
 */

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/** "Deployment date" for static pages — fixed per process start, not per request. */
const DEPLOYED_AT = new Date();

interface SitemapEntry {
  path: string;
  lastmod: Date;
  changefreq: 'daily' | 'weekly' | 'monthly';
  priority: string;
}

const STATIC_ENTRIES: Omit<SitemapEntry, 'lastmod'>[] = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/refund-policy', changefreq: 'monthly', priority: '0.5' },
  { path: '/return-policy', changefreq: 'monthly', priority: '0.5' },
  { path: '/privacy-policy', changefreq: 'monthly', priority: '0.5' },
  { path: '/terms-and-conditions', changefreq: 'monthly', priority: '0.5' },
];

let cachedXml: string | null = null;
let cachedAt = 0;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toLastmod(date: Date): string {
  return date.toISOString().slice(0, 10); // W3C date (YYYY-MM-DD)
}

function renderXml(entries: SitemapEntry[]): string {
  const seen = new Set<string>();
  const urls = entries
    .filter((entry) => {
      if (seen.has(entry.path)) return false;
      seen.add(entry.path);
      return true;
    })
    .map((entry) => {
      const loc = escapeXml(`${env.PUBLIC_SITE_URL}${entry.path}`);
      return [
        '  <url>',
        `    <loc>${loc}</loc>`,
        `    <lastmod>${toLastmod(entry.lastmod)}</lastmod>`,
        `    <changefreq>${entry.changefreq}</changefreq>`,
        `    <priority>${entry.priority}</priority>`,
        '  </url>',
      ].join('\n');
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
    '',
  ].join('\n');
}

// ---------- Image sitemap ----------

let cachedImageXml: string | null = null;
let cachedImageAt = 0;

/**
 * /image-sitemap.xml — every active product's images, attached to the product
 * page URL per Google's image sitemap extension.
 */
export async function getImageSitemapXml(): Promise<string> {
  if (cachedImageXml && Date.now() - cachedImageAt < CACHE_TTL_MS) {
    return cachedImageXml;
  }

  const products = await prisma.product.findMany({
    where: { isActive: true, imageUrls: { isEmpty: false } },
    select: { slug: true, name: true, boxQuantity: true, imageUrls: true },
  });

  const urls = products
    .map((product) => {
      const images = product.imageUrls
        .map((imageUrl) =>
          [
            '    <image:image>',
            `      <image:loc>${escapeXml(imageUrl)}</image:loc>`,
            `      <image:title>${escapeXml(product.name)}</image:title>`,
            `      <image:caption>${escapeXml(`${product.name} (${product.boxQuantity}) — Surya Crackers`)}</image:caption>`,
            '    </image:image>',
          ].join('\n'),
        )
        .join('\n');
      return [
        '  <url>',
        `    <loc>${escapeXml(`${env.PUBLIC_SITE_URL}/product/${product.slug}`)}</loc>`,
        images,
        '  </url>',
      ].join('\n');
    })
    .join('\n');

  cachedImageXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    urls,
    '</urlset>',
    '',
  ].join('\n');
  cachedImageAt = Date.now();
  return cachedImageXml;
}

export async function getSitemapXml(): Promise<string> {
  if (cachedXml && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedXml;
  }

  const [categories, products] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
    prisma.product.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
  ]);

  const entries: SitemapEntry[] = [
    ...STATIC_ENTRIES.map((entry) => ({ ...entry, lastmod: DEPLOYED_AT })),
    ...categories.map((category) => ({
      path: `/category/${category.slug}`,
      lastmod: category.updatedAt,
      changefreq: 'weekly' as const,
      priority: '0.9',
    })),
    ...products.map((product) => ({
      path: `/product/${product.slug}`,
      lastmod: product.updatedAt,
      changefreq: 'weekly' as const,
      priority: '0.8',
    })),
  ];

  cachedXml = renderXml(entries);
  cachedAt = Date.now();
  return cachedXml;
}
