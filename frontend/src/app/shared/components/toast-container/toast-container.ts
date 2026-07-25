import { Component, inject } from '@angular/core';
import { LucideAngularModule, CircleCheck, CircleAlert, Info, X } from 'lucide-angular';
import { ToastService, Toast } from '../../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './toast-container.html',
})
export class ToastContainer {
  readonly toastService = inject(ToastService);

  readonly CircleCheckIcon = CircleCheck;
  readonly CircleAlertIcon = CircleAlert;
  readonly InfoIcon = Info;
  readonly XIcon = X;

  iconFor(type: Toast['type']) {
    if (type === 'success') return this.CircleCheckIcon;
    if (type === 'error') return this.CircleAlertIcon;
    return this.InfoIcon;
  }

  accentClass(type: Toast['type']): string {
    if (type === 'success') return 'border-l-4 border-l-emerald-500 [&_.toast-icon]:text-emerald-600';
    if (type === 'error') return 'border-l-4 border-l-brand-red [&_.toast-icon]:text-brand-red';
    return 'border-l-4 border-l-brand-charcoal [&_.toast-icon]:text-brand-charcoal';
  }

  dismiss(id: number): void {
    this.toastService.dismiss(id);
  }
}
