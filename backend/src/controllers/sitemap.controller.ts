import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { getImageSitemapXml, getSitemapXml } from '../services/sitemap.service';
import { getMerchantFeedXml } from '../services/merchantFeed.service';

function sendXml(res: Response, xml: string): Response {
  return res
    .setHeader('Content-Type', 'application/xml; charset=utf-8')
    .setHeader('Cache-Control', 'public, max-age=900')
    .send(xml);
}

// GET /sitemap.xml — public, proxied onto the storefront domain by Vercel
export const serveSitemap = asyncHandler(async (_req: Request, res: Response) => {
  sendXml(res, await getSitemapXml());
});

// GET /image-sitemap.xml — product images for Google Images
export const serveImageSitemap = asyncHandler(async (_req: Request, res: Response) => {
  sendXml(res, await getImageSitemapXml());
});

// GET /feed.xml — Google Merchant Center product feed
export const serveMerchantFeed = asyncHandler(async (_req: Request, res: Response) => {
  sendXml(res, await getMerchantFeedXml());
});
