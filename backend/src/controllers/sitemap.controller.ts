import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { getSitemapXml } from '../services/sitemap.service';

// GET /sitemap.xml — public, proxied onto the storefront domain by Vercel
export const serveSitemap = asyncHandler(async (_req: Request, res: Response) => {
  const xml = await getSitemapXml();
  res
    .setHeader('Content-Type', 'application/xml; charset=utf-8')
    .setHeader('Cache-Control', 'public, max-age=900')
    .send(xml);
});
