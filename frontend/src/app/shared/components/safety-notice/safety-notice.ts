import { Component, input } from '@angular/core';
import { LucideAngularModule, ShieldAlert } from 'lucide-angular';

@Component({
  selector: 'app-safety-notice',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './safety-notice.html',
})
export class SafetyNotice {
  readonly message = input(
    'Firecrackers are age-restricted, regulated products. Always follow local laws, use in open outdoor spaces, and keep children under direct adult supervision at all times.',
  );
  readonly compact = input(false);

  readonly ShieldAlertIcon = ShieldAlert;
}
