import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, map, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSuccess } from '../models';

interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
}

export interface UploadedImage {
  url: string;
  width: number;
  height: number;
  bytes: number;
}

/** Cloudinary's own per-file ceiling on the free plan. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

/**
 * Admin image uploads. The API only mints a short-lived signature; the file
 * itself goes browser -> Cloudinary directly, so originals can be full quality
 * without touching this app's request-size limits or bandwidth. Postgres only
 * ever stores the resulting URL.
 */
@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly http = inject(HttpClient);

  /** Returns null when the file is acceptable, otherwise a user-facing reason. */
  validate(file: File): string | null {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return 'Choose a JPG, PNG, WebP or AVIF image.';
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return `That image is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 10 MB.`;
    }
    return null;
  }

  upload(file: File): Observable<UploadedImage> {
    return this.http
      .post<ApiSuccess<UploadSignature>>(`${environment.apiUrl}/admin/uploads/signature`, {})
      .pipe(
        map((res) => res.data),
        switchMap((signature) => from(this.postToCloudinary(file, signature))),
      );
  }

  private async postToCloudinary(file: File, signature: UploadSignature): Promise<UploadedImage> {
    const form = new FormData();
    form.append('file', file);
    form.append('api_key', signature.apiKey);
    form.append('timestamp', String(signature.timestamp));
    form.append('folder', signature.folder);
    form.append('signature', signature.signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, {
      method: 'POST',
      body: form,
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new Error(body.error?.message ?? `Upload failed (HTTP ${response.status})`);
    }

    const body = (await response.json()) as {
      secure_url: string;
      width: number;
      height: number;
      bytes: number;
    };
    return { url: body.secure_url, width: body.width, height: body.height, bytes: body.bytes };
  }
}
