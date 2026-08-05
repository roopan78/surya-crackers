import { Pipe, PipeTransform } from '@angular/core';
import { cdnImage } from '../utils/cloudinary.util';

/**
 * `[src]="product.imageUrl | cdnImage: 600"` — serves a right-sized,
 * auto-format variant of a Cloudinary image. Non-Cloudinary URLs pass through.
 */
@Pipe({ name: 'cdnImage', standalone: true })
export class CdnImagePipe implements PipeTransform {
  transform(url: string | null | undefined, width?: number): string {
    return cdnImage(url, width);
  }
}
