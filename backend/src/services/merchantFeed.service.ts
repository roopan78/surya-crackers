import { prisma } from '../config/prisma';
import { env } from '../config/env';

/**
 * Google Merchant Center product feed (/feed.xml) — RSS 2.0 with the g:
 * namespace per the Merchant XML specification. Generated from the live
 * catalog (active products only) and cached briefly like the sitemaps.
 */

const CACHE_TTL_MS = 15 * 60 * 1000;

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

export async function getMerchantFeedXml(): Promise<string> {
  if (cachedXml && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedXml;
  }

  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  });

  const items = products
    .map((product) => {
      const url = `${env.PUBLIC_SITE_URL}/product/${product.slug}`;
      const image = product.imageUrls[0] ?? '';
      const description = `${product.name} (${product.boxQuantity}) — premium Sivakasi firecrackers from Surya Crackers.`;
      return [
        '    <item>',
        `      <g:id>${escapeXml(product.sku)}</g:id>`,
        `      <g:title>${escapeXml(product.name)}</g:title>`,
        `      <g:description>${escapeXml(description)}</g:description>`,
        `      <link>${escapeXml(url)}</link>`,
        ...(image ? [`      <g:image_link>${escapeXml(image)}</g:image_link>`] : []),
        `      <g:availability>${product.stockCount > 0 ? 'in_stock' : 'out_of_stock'}</g:availability>`,
        `      <g:price>${Number(product.price).toFixed(2)} INR</g:price>`,
        '      <g:brand>Surya Crackers</g:brand>',
        '      <g:condition>new</g:condition>',
        `      <g:product_type>${escapeXml(product.category.name)}</g:product_type>`,
        // No GTIN/MPN exists for these products — tell Merchant Center explicitly.
        '      <g:identifier_exists>false</g:identifier_exists>',
        '    </item>',
      ].join('\n');
    })
    .join('\n');

  cachedXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    '  <channel>',
    '    <title>Surya Crackers</title>',
    `    <link>${env.PUBLIC_SITE_URL}</link>`,
    '    <description>Premium Sivakasi firecrackers and fireworks — Surya Crackers product feed.</description>',
    items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
  cachedAt = Date.now();
  return cachedXml;
}
