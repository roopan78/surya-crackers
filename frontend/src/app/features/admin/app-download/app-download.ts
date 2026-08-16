import { Component, OnInit, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AppReleaseService } from '../../../core/services/app-release.service';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Download card for the staff Android app.
 *
 * Rendered only for signed-in admins: the APK download route itself is public
 * (a phone's browser cannot send a bearer token on a plain navigation), so this
 * check is about not advertising an internal tool on a screen a customer could
 * reach, not about protecting the bytes.
 */
@Component({
  selector: 'app-app-download',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './app-download.html',
})
export class AppDownload implements OnInit {
  private readonly authService = inject(AuthService);
  readonly releaseService = inject(AppReleaseService);

  readonly canDownload = computed(() => {
    const role = this.authService.currentUser()?.role;
    return role === 'ADMIN' || role === 'SUPER_ADMIN';
  });

  ngOnInit(): void {
    if (this.canDownload()) {
      this.releaseService.loadLatest();
    }
  }

  downloadUrl(): string {
    const release = this.releaseService.release();
    return release ? this.releaseService.absoluteDownloadUrl(release) : '';
  }

  sizeLabel(): string {
    const release = this.releaseService.release();
    return release ? this.releaseService.formatSize(release.sizeBytes) : '';
  }
}
