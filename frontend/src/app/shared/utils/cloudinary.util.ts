/**
 * Rewrites a Cloudinary delivery URL to request an optimized variant:
 * `f_auto` picks WebP/AVIF per browser, `q_auto` picks a quality that holds up
 * visually at a fraction of the bytes, and `w_*`/`c_limit` caps the dimension
 * without ever upscaling.
 *
 * This is why originals can be uploaded at full quality — the storefront never
 * downloads the original, only a right-sized derivative.
 *
 * Any non-Cloudinary URL (placehold.co, a supplier's CDN, a pasted link) is
 * returned untouched, so mixed sources keep working.
 */
export function cdnImage(url: string | null | undefined, width?: number): string {
  if (!url) {
    return '';
  }
  const marker = '/image/upload/';
  const markerIndex = url.indexOf(marker);
  if (!url.includes('res.cloudinary.com') || markerIndex === -1) {
    return url;
  }

  const transforms = ['f_auto', 'q_auto', ...(width ? [`w_${width}`, 'c_limit'] : [])].join(',');
  const head = url.slice(0, markerIndex + marker.length);
  const tail = url.slice(markerIndex + marker.length);

  // Don't stack transforms if this URL already carries some.
  if (/^[a-z]{1,3}_[^/]+\//.test(tail)) {
    return url;
  }
  return `${head}${transforms}/${tail}`;
}
