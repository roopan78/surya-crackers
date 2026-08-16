import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApiSuccess } from '../models';

const APP_RELEASE_BASE = `${environment.apiUrl}/admin/app-release`;

/** Mirrors `services/appRelease.service.ts#AppReleaseMetadata`, plus the link. */
export interface AppRelease {
  versionName: string;
  versionCode: number;
  fileName: string;
  sizeBytes: number;
  sha256: string;
  uploadedAt: string;
  /** Server-relative, e.g. `/api/app-release/download`. */
  downloadUrl: string;
}

@Injectable({ providedIn: 'root' })
export class AppReleaseService {
  private readonly http = inject(HttpClient);

  private readonly releaseSignal = signal<AppRelease | null>(null);
  private readonly loadingSignal = signal(false);

  readonly release = this.releaseSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();

  /**
   * The endpoint answers 200 with `null` when no build has been published, so a
   * fresh install renders "not published yet" rather than an error.
   */
  loadLatest(): void {
    this.loadingSignal.set(true);
    this.http.get<ApiSuccess<AppRelease | null>>(APP_RELEASE_BASE).subscribe({
      next: (res) => {
        this.releaseSignal.set(res.data);
        this.loadingSignal.set(false);
      },
      error: () => {
        this.releaseSignal.set(null);
        this.loadingSignal.set(false);
      },
    });
  }

  /**
   * Absolute URL for the download anchor.
   *
   * The API returns a server-relative path, but the portal is served from a
   * different origin than the API, so a bare href would resolve against the
   * site and 404. Derived from `environment.apiUrl` by dropping its `/api`
   * suffix, which the returned path already carries.
   */
  absoluteDownloadUrl(release: AppRelease): string {
    const apiRoot = environment.apiUrl.replace(/\/api\/?$/, '');
    return `${apiRoot}${release.downloadUrl}`;
  }

  formatSize(bytes: number): string {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
