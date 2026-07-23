import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

/**
 * Converts a standard YouTube "watch" link
 * (https://www.youtube.com/watch?v=VIDEO_ID or youtu.be/VIDEO_ID) into a
 * sanitized, embeddable `SafeResourceUrl` suitable for an <iframe src>.
 *
 * Sanitization is delegated to Angular's DomSanitizer so only URLs we
 * have explicitly constructed against the youtube-nocookie.com embed
 * host are ever trusted — arbitrary attacker-controlled URLs are never
 * bypassed.
 */
@Pipe({
  name: 'youtubeEmbed',
  standalone: true,
})
export class YoutubeEmbedPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(watchUrl: string | null | undefined): SafeResourceUrl | null {
    const videoId = this.extractVideoId(watchUrl);
    if (!videoId) {
      return null;
    }

    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }

  private extractVideoId(url: string | null | undefined): string | null {
    if (!url) {
      return null;
    }

    try {
      const parsed = new URL(url);

      if (parsed.hostname.includes('youtu.be')) {
        return parsed.pathname.replace('/', '') || null;
      }

      if (parsed.hostname.includes('youtube.com')) {
        if (parsed.pathname === '/watch') {
          return parsed.searchParams.get('v');
        }
        if (parsed.pathname.startsWith('/embed/')) {
          return parsed.pathname.split('/embed/')[1] ?? null;
        }
      }

      return null;
    } catch {
      return null;
    }
  }
}
