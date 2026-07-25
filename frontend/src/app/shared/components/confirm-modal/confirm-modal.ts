import { Component, input, output } from '@angular/core';
import { LucideAngularModule, TriangleAlert } from 'lucide-angular';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './confirm-modal.html',
})
export class ConfirmModal {
  readonly title = input('Are you sure?');
  readonly message = input('This action cannot be undone.');
  readonly confirmLabel = input('Delete');

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  readonly TriangleAlertIcon = TriangleAlert;
}
