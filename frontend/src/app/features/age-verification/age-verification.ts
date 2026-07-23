import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule, ShieldAlert, TriangleAlert } from 'lucide-angular';
import { AgeVerificationService } from '../../core/services/age-verification.service';

@Component({
  selector: 'app-age-verification',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './age-verification.html',
})
export class AgeVerification {
  private readonly ageVerificationService = inject(AgeVerificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly ShieldAlertIcon = ShieldAlert;
  readonly TriangleAlertIcon = TriangleAlert;

  confirmAge(): void {
    this.ageVerificationService.confirmAge();
    const redirectTo = this.route.snapshot.queryParamMap.get('redirectTo') ?? '/';
    this.router.navigateByUrl(redirectTo);
  }

  exitSite(): void {
    window.location.href = 'https://www.google.com';
  }
}
