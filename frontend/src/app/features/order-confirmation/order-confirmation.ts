import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  LucideAngularModule,
  CircleCheck,
  Store,
  IndianRupee,
  Smartphone,
  Copy,
  Check,
  Clock,
  TriangleAlert,
} from 'lucide-angular';
import { PaymentService } from '../../core/services/payment.service';
import { PaymentProviderType, PaymentStatus, UpiDetails } from '../../core/models';

interface ConfirmationState {
  estimatedTotal?: number;
  paymentStatus?: PaymentStatus;
  paymentProvider?: PaymentProviderType;
  pickupDate?: string;
  pickupTime?: string;
}

@Component({
  selector: 'app-order-confirmation',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, DatePipe],
  templateUrl: './order-confirmation.html',
})
export class OrderConfirmation implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly paymentService = inject(PaymentService);

  readonly CircleCheckIcon = CircleCheck;
  readonly StoreIcon = Store;
  readonly IndianRupeeIcon = IndianRupee;
  readonly SmartphoneIcon = Smartphone;
  readonly CopyIcon = Copy;
  readonly CheckIcon = Check;
  readonly ClockIcon = Clock;
  readonly TriangleAlertIcon = TriangleAlert;

  readonly orderNumber = this.route.snapshot.paramMap.get('orderNumber') ?? '';

  // Passed via router navigation state from checkout — not persisted, so a
  // hard refresh of this page loses the detail (order number itself still
  // shows from the URL). UPI orders recover their state from /upi-details.
  private readonly state = (history.state ?? {}) as ConfirmationState;

  readonly estimatedTotal = this.state.estimatedTotal ?? null;
  readonly pickupDate = this.state.pickupDate ?? null;
  readonly pickupTime = this.state.pickupTime ?? null;

  readonly paymentStatus = signal<PaymentStatus | null>(this.state.paymentStatus ?? null);

  // --- UPI payment details (UPI_DIRECT orders only) ---
  readonly upiDetails = signal<UpiDetails | null>(null);
  readonly upiLoading = signal(false);
  readonly upiError = signal(false);

  // --- UTR submission ---
  readonly utr = signal('');
  readonly utrTouched = signal(false);
  readonly utrValid = computed(() => /^\d{12}$/.test(this.utr()));
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly submitSuccess = signal(false);
  readonly submittedUtr = signal<string | null>(null);
  readonly editingUtr = signal(false);

  readonly copied = signal(false);

  readonly displayAmount = computed(() => this.upiDetails()?.amount ?? this.estimatedTotal);

  /** The UTR form shows until a UTR is on record, or again while correcting it. */
  readonly showUtrForm = computed(() => this.editingUtr() || !this.submittedUtr());

  readonly paymentMessage = computed(() => {
    const status = this.paymentStatus();
    if (status === 'PAID') {
      return 'Payment received.';
    }
    if (status === 'AWAITING_VERIFICATION') {
      return 'Payment submitted — we will verify it shortly.';
    }
    if (this.upiDetails()) {
      return 'Complete your UPI payment below.';
    }
    return 'Pay in cash when you arrive to collect your order.';
  });

  ngOnInit(): void {
    const provider = this.state.paymentProvider;
    // Skip the fetch only when we know the order used another method; on a
    // hard refresh (no navigation state) we probe and treat a 400 as "not UPI".
    if (provider === undefined || provider === 'UPI_DIRECT') {
      this.loadUpiDetails(provider === 'UPI_DIRECT');
    }
  }

  loadUpiDetails(knownUpiOrder = true): void {
    this.upiLoading.set(true);
    this.upiError.set(false);

    this.paymentService.getUpiDetails(this.orderNumber).subscribe({
      next: (details) => {
        this.upiDetails.set(details);
        this.paymentStatus.set(details.paymentStatus);
        this.submittedUtr.set(details.utrNumber);
        this.upiLoading.set(false);
      },
      error: (error: unknown) => {
        this.upiLoading.set(false);
        const status = error instanceof HttpErrorResponse ? error.status : 0;
        // 400/404 on a probe just means this isn't a UPI order — stay silent.
        if (knownUpiOrder && status !== 400 && status !== 404) {
          this.upiError.set(true);
        }
      },
    });
  }

  payViaUpiApp(): void {
    const upi = this.upiDetails();
    if (upi) {
      window.location.href = upi.upiUrl;
    }
  }

  copyVpa(): void {
    const upi = this.upiDetails();
    if (!upi) return;
    navigator.clipboard.writeText(upi.vpa).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  onUtrInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 12);
    input.value = digits;
    this.utr.set(digits);
  }

  startEditUtr(): void {
    this.utr.set(this.submittedUtr() ?? '');
    this.submitError.set(null);
    this.editingUtr.set(true);
  }

  submitUtr(): void {
    this.utrTouched.set(true);
    if (!this.utrValid() || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);

    this.paymentService.submitUtr(this.orderNumber, this.utr()).subscribe({
      next: (order) => {
        this.submitting.set(false);
        this.submitSuccess.set(true);
        this.submittedUtr.set(order.utrNumber);
        this.paymentStatus.set(order.paymentStatus);
        this.editingUtr.set(false);
        this.utrTouched.set(false);
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        const message =
          error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
            ? error.error.message
            : 'Could not submit your UTR — please check your connection and try again.';
        this.submitError.set(message);
      },
    });
  }
}
